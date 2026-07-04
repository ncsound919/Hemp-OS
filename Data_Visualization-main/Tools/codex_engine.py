# codex_engine.py
# Minimal drop-in engine for {Trueness, Tap10, Flow, PCS, RPS, CU}.
# Usage: see example X in codex_input_example.json, then:
#   from codex_engine import compute_report
#   report_md, audit = compute_report(X)
# The engine enforces [0,1] bounds (where applicable), caps denominators,
# logs intermediates, imputes missing values with medians, and produces a 1‑page report.

import math
from copy import deepcopy
from datetime import datetime
from typing import Any, Dict, Tuple

EPS = 1e-6


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def _normalize_weights(w: Dict[str, float]) -> Dict[str, float]:
    s = sum(max(0.0, float(v)) for v in w.values()) or 1.0
    return {k: max(0.0, float(v)) / s for k, v in w.items()}


def _impute(value, default):
    return default if value is None else value


def _get_nested(d: Dict[str, Any], dotted: str):
    cur = d
    parts = dotted.split(".")
    for p in parts[:-1]:
        if p not in cur or not isinstance(cur[p], dict):
            cur[p] = {}
        cur = cur[p]
    last = parts[-1]
    return cur, last


def _apply_scaler(name: str, v, scalers: Dict[str, Any]):
    s = scalers.get(name, {"method": "identity"})
    m = s.get("method", "identity")
    if m == "identity":
        return v
    if m == "minmax":
        lo = float(s.get("min", 0.0))
        hi = float(s.get("max", 1.0))
        if hi <= lo:
            hi = lo + 1.0
        return (float(v) - lo) / (hi - lo)
    if m == "zscore":
        mu = float(s.get("mean", 0.0))
        sd = float(s.get("std", 1.0)) or 1.0
        # map z to 0..1 via sigmoid
        return 1.0 / (1.0 + math.exp(-(float(v) - mu) / sd))
    return v  # fallback


def compute_report(X: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    # Inputs and scalers
    X = deepcopy(X)
    scalers = X.get("scalers", {})
    thresholds = X.get(
        "thresholds",
        {"PCS": 0.62, "Flow": 0.55, "Trueness": 0.60, "CU": 0.50, "RPS": 0.50},
    )
    k_trueness = float(X.get("params", {}).get("k_trueness", 3.0))
    d_max_default = float(X.get("params", {}).get("D_max_default", 10.0))

    audit = {
        "scaler_version": X.get("scaler_version", "unspecified"),
        "intermediates": {},
        "inputs_scaled": {},
        "thresholds": thresholds,
        "params": {"k_trueness": k_trueness},
    }

    # ---------- Trueness ----------
    T = X.get("inputs", {}).get("Trueness", {})
    A = _apply_scaler("A", _impute(T.get("A"), 0.5), scalers)
    A = _clamp01(A)
    B = _apply_scaler("B", _impute(T.get("B"), 0.5), scalers)
    B = _clamp01(B)
    N = _apply_scaler("N", _impute(T.get("N"), 0.5), scalers)
    N = _clamp01(N)
    T_raw = A / max(B + N, 0.1)  # cap
    Trueness = _clamp01(_sigmoid(k_trueness * (T_raw - 1.0)))
    audit["inputs_scaled"]["Trueness"] = {"A": A, "B": B, "N": N}
    audit["intermediates"]["Trueness"] = {"T_raw": T_raw, "k": k_trueness}

    # ---------- Tap10 ----------
    TP = X.get("inputs", {}).get("Tap10", {})
    W = TP.get("W", [])
    F = TP.get("F", [])
    # pad to equal length up to 10 items
    L = min(10, max(len(W), len(F), 1))
    W = (W + [0.0] * L)[:L]
    F = (F + [0.0] * L)[:L]
    # assume already 0..1, clamp
    Wc = [_clamp01(float(w)) for w in W]
    Fc = [_clamp01(float(f)) for f in F]
    denom = sum(Wc) or 1.0
    Tap10 = sum(w * f for w, f in zip(Wc, Fc)) / denom
    audit["inputs_scaled"]["Tap10"] = {"W": Wc, "F": Fc}
    audit["intermediates"]["Tap10"] = {"denom_sum_W": denom, "L": L}

    # ---------- Flow ----------
    FL = X.get("inputs", {}).get("Flow", {})
    I = _clamp01(_apply_scaler("I", _impute(FL.get("I"), 0.5), scalers))
    D = float(_impute(FL.get("D"), d_max_default / 2))
    d_max = float(_impute(FL.get("D_max"), d_max_default))
    D_prime = min(d_max / max(D, 1.0), 1.0)  # normalize to 0..1 via inverse
    Rsrc = _clamp01(_apply_scaler("Rsrc", _impute(FL.get("R"), 0.5), scalers))
    Flow = I * D_prime * Rsrc
    audit["inputs_scaled"]["Flow"] = {
        "I": I,
        "D": D,
        "D_max": d_max,
        "D_prime": D_prime,
        "R": Rsrc,
    }

    # ---------- PCS ----------
    PC = X.get("inputs", {}).get("PCS", {})
    weights = _normalize_weights(PC.get("weights", {"fit": 1.0}))
    values = {
        k: _clamp01(float(v))
        for k, v in PC.get("values", {next(iter(weights)): 0.5}).items()
    }
    # ensure same keys
    for k in list(weights.keys()):
        if k not in values:
            values[k] = 0.5
    PCS = sum(weights[k] * values[k] for k in weights)
    audit["inputs_scaled"]["PCS"] = {"weights": weights, "values": values}

    # ---------- RPS ----------
    RP = X.get("inputs", {}).get("RPS", {})
    S = _clamp01(_apply_scaler("S", _impute(RP.get("S"), 0.5), scalers))
    ROI = _clamp01(_apply_scaler("ROI", _impute(RP.get("ROI"), 0.5), scalers))
    PF = _clamp01(_apply_scaler("PF", _impute(RP.get("PF"), 0.5), scalers))
    Risk = _clamp01(_apply_scaler("Risk", _impute(RP.get("R"), 0.5), scalers))
    abc = {
        "alpha": float(RP.get("alpha", 1 / 3)),
        "beta": float(RP.get("beta", 1 / 3)),
        "gamma": float(RP.get("gamma", 1 / 3)),
    }
    s_abc = sum(max(0.0, v) for v in abc.values()) or 1.0
    for k in abc:
        abc[k] = max(0.0, abc[k]) / s_abc
    Gain = abc["alpha"] * S + abc["beta"] * ROI + abc["gamma"] * PF
    RPS = Gain * (1.0 - Risk)
    audit["inputs_scaled"]["RPS"] = {
        "S": S,
        "ROI": ROI,
        "PF": PF,
        "R": Risk,
        "alpha": abc["alpha"],
        "beta": abc["beta"],
        "gamma": abc["gamma"],
    }
    audit["intermediates"]["RPS"] = {"Gain": Gain}

    # ---------- CU ----------
    CUin = X.get("inputs", {}).get("CU", {})
    G = _clamp01(_apply_scaler("G", _impute(CUin.get("G"), 0.5), scalers))
    Rr = _clamp01(_apply_scaler("Rr", _impute(CUin.get("R"), 0.5), scalers))
    Pm = _clamp01(_apply_scaler("P", _impute(CUin.get("P"), 0.5), scalers))
    CU = G * Rr * Pm
    audit["inputs_scaled"]["CU"] = {"G": G, "R": Rr, "P": Pm}

    scores = {
        "Trueness": Trueness,
        "Tap10": Tap10,
        "Flow": Flow,
        "PCS": PCS,
        "RPS": RPS,
        "CU": CU,
    }

    # ---------- One‑Knob sensitivities ----------
    sens_cfg = X.get("inputs", {}).get("one_knob", {"drivers": [], "delta": 0.05})
    delta = float(sens_cfg.get("delta", 0.05))
    drivers = list(sens_cfg.get("drivers", []))
    impacts = []  # list of (metric, driver, delta, change)

    def _compute_all(inX):
        # recursion is overkill; call this function shallowly
        Xi = deepcopy(inX)
        # recompute scores only (copy-paste the formulas without audit)
        # Trueness
        T = Xi.get("inputs", {}).get("Trueness", {})
        A = max(
            0.0, min(1.0, _apply_scaler("A", T.get("A", 0.5), Xi.get("scalers", {})))
        )
        B = max(
            0.0, min(1.0, _apply_scaler("B", T.get("B", 0.5), Xi.get("scalers", {})))
        )
        N = max(
            0.0, min(1.0, _apply_scaler("N", T.get("N", 0.5), Xi.get("scalers", {})))
        )
        T_raw = A / max(B + N, 0.1)
        Tru = max(0.0, min(1.0, 1.0 / (1.0 + math.exp(-k_trueness * (T_raw - 1.0)))))
        # Tap10
        TP = Xi.get("inputs", {}).get("Tap10", {})
        W = TP.get("W", [])
        F = TP.get("F", [])
        L = min(10, max(len(W), len(F), 1))
        W = (W + [0.0] * L)[:L]
        F = (F + [0.0] * L)[:L]
        Wc = [max(0.0, min(1.0, float(w))) for w in W]
        Fc = [max(0.0, min(1.0, float(f))) for f in F]
        denom = sum(Wc) or 1.0
        T10 = sum(w * f for w, f in zip(Wc, Fc)) / denom
        # Flow
        FL = Xi.get("inputs", {}).get("Flow", {})
        I = max(
            0.0, min(1.0, _apply_scaler("I", FL.get("I", 0.5), Xi.get("scalers", {})))
        )
        D = float(FL.get("D", d_max_default / 2))
        d_max = float(FL.get("D_max", d_max_default))
        Dp = min(d_max / max(D, 1.0), 1.0)
        Rsrc = max(
            0.0,
            min(1.0, _apply_scaler("Rsrc", FL.get("R", 0.5), Xi.get("scalers", {}))),
        )
        Flw = I * Dp * Rsrc
        # PCS
        PC = Xi.get("inputs", {}).get("PCS", {})
        weights = PC.get("weights", {"fit": 1.0})
        s = sum(max(0.0, float(v)) for v in weights.values()) or 1.0
        weights = {k: max(0.0, float(v)) / s for k, v in weights.items()}
        values = {
            k: max(0.0, min(1.0, float(v)))
            for k, v in PC.get("values", {next(iter(weights)): 0.5}).items()
        }
        for k in list(weights.keys()):
            if k not in values:
                values[k] = 0.5
        Pc = sum(weights[k] * values[k] for k in weights)
        # RPS
        RP = Xi.get("inputs", {}).get("RPS", {})
        S = max(
            0.0, min(1.0, _apply_scaler("S", RP.get("S", 0.5), Xi.get("scalers", {})))
        )
        ROI = max(
            0.0,
            min(1.0, _apply_scaler("ROI", RP.get("ROI", 0.5), Xi.get("scalers", {}))),
        )
        PF = max(
            0.0, min(1.0, _apply_scaler("PF", RP.get("PF", 0.5), Xi.get("scalers", {})))
        )
        Risk = max(
            0.0,
            min(1.0, _apply_scaler("Risk", RP.get("R", 0.5), Xi.get("scalers", {}))),
        )
        abc = {
            "alpha": float(RP.get("alpha", 1 / 3)),
            "beta": float(RP.get("beta", 1 / 3)),
            "gamma": float(RP.get("gamma", 1 / 3)),
        }
        s_abc = sum(max(0.0, v) for v in abc.values()) or 1.0
        for k in abc:
            abc[k] = max(0.0, abc[k]) / s_abc
        Gain = abc["alpha"] * S + abc["beta"] * ROI + abc["gamma"] * PF
        Rp = Gain * (1.0 - Risk)
        # CU
        CUin = Xi.get("inputs", {}).get("CU", {})
        G = max(
            0.0, min(1.0, _apply_scaler("G", CUin.get("G", 0.5), Xi.get("scalers", {})))
        )
        Rr = max(
            0.0,
            min(1.0, _apply_scaler("Rr", CUin.get("R", 0.5), Xi.get("scalers", {}))),
        )
        Pm = max(
            0.0, min(1.0, _apply_scaler("P", CUin.get("P", 0.5), Xi.get("scalers", {})))
        )
        Cu = G * Rr * Pm
        return {
            "Trueness": Tru,
            "Tap10": T10,
            "Flow": Flw,
            "PCS": Pc,
            "RPS": Rp,
            "CU": Cu,
        }

    base_scores = _compute_all(X)
    for drv in drivers:
        Xp = deepcopy(X)
        ctx, key = _get_nested(Xp["inputs"], drv)
        cur = ctx.get(key, None)
        if cur is None:
            continue
        # special-case D (dependency drag), which is not 0..1
        if key.lower() in ("d",):
            dmax = float(
                ctx.get("D_max", Xp.get("params", {}).get("D_max_default", 10.0))
            )
            step = max(1.0, delta * dmax)
            ctx[key] = max(1.0, float(cur) + step)
        else:
            ctx[key] = max(0.0, min(1.0, float(cur) + delta))
        after = _compute_all(Xp)
        for metric, v0 in base_scores.items():
            change = after[metric] - v0
            impacts.append((metric, drv, delta, change))

    # top 3 by absolute change
    impacts_sorted = sorted(impacts, key=lambda t: abs(t[3]), reverse=True)[:3]

    # ---------- Go/No‑Go ----------
    gates = {k: (scores.get(k, 0.0) >= thr) for k, thr in thresholds.items()}
    decision = "GO" if all(gates.values()) else "NO‑GO"

    # ---------- 1‑page report (Markdown) ----------
    def line(metric, score, meaning):
        return f"**{metric}: {score:.3f}** — {meaning}\n"

    meanings = {
        "Trueness": "signal-to-baggage; 0.60+ means on-target without excess baggage",
        "Tap10": "weighted effectiveness of your 10 levers",
        "Flow": "readiness × inverse drag × resources",
        "PCS": "partner fit against your weighted criteria",
        "RPS": "rollout priority after risk",
        "CU": "deliverable capacity this cycle",
    }

    md = []
    md.append(
        f"# Math Codex Report\nGenerated: {datetime.utcnow().isoformat()}Z  \nScaler version: {audit['scaler_version']}\n"
    )
    md.append("## Headline Scores\n")
    for k in ["Trueness", "Tap10", "Flow", "PCS", "RPS", "CU"]:
        md.append(line(k, scores[k], meanings[k]))
    md.append("\n## One‑Knob: Top 3 sensitivities (Δ=+{:.2f})\n".format(delta))
    if impacts_sorted:
        for m, d, dv, ch in impacts_sorted:
            arrow = "↑" if ch >= 0 else "↓"
            md.append(f"- {m}: change {ch:+.3f} if `{d}` nudged by +{dv:.2f} {arrow}")
    else:
        md.append("- No drivers configured.")
    md.append("\n## Decision\n")
    md.append(
        f"**{decision}** — thresholds: "
        + ", ".join([f"{k}>={v:.2f}" for k, v in thresholds.items()])
    )
    md.append("\n")

    report_md = "\n".join(md)
    audit["scores"] = scores
    audit["gates"] = gates
    audit["decision"] = decision
    return report_md, audit
