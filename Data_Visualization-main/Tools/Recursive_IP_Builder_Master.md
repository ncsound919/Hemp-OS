# Recursive IP Builder — Master Formula
Version: 1.0 | Owner: TapSpeak IP GPT | Status: Active

## Intent
Create high-ROI, passive IP artifacts that can be generated, branded, and shipped quickly. Use a recursive loop to refine problem→solution→asset until ROI threshold is met.

---

## Input Contract
```json
{
  "segment": "SMB | Enterprise",
  "domain": "biotech",
  "user_problem": "string",
  "objectives": ["string"],
  "constraints": ["no disease claims", "2 syllables"],
  "mechanism_hypotheses": ["assay routing","protocol harmonization"],
  "evidence_assets": ["SOP","dataset","benchmark"],
  "roi_target": {"metric": "hours_saved_per_month", "min": 10},
  "palette": ["E8B34A","7F7F7F","D1B3B4","EF6B72"]
}
```

---

## Artifact Types
- **Decision mini-game** (routing to actions)
- **Template/kit** (SOP, checklist, calculator)
- **Dataset/scorecard** (QC score, readiness index)
- **Micro-service** (API wrapper, script, rules pack)

---

## Recursion Loop
1. **Frame**: Normalize inputs. Extract objectives and constraints.
2. **Hypothesize**: Generate 3–5 mechanism-led solution patterns.
3. **Assemble**: Produce smallest viable artifact for top pattern.
4. **Estimate ROI**: Predict impact using scoring (below).
5. **Test**: Run quick usability check or synthetic simulation.
6. **Decide**: If ROI ≥ target and compliance ok → finalize. Else update priors and loop.

Stop after max 5 loops or convergence (ΔROI < 5%).

---

## ROI Scoring
Let **B**=business impact, **S**=speed-to-adopt, **R**=risk-reduction, **E**=evidence strength.

Score in [0,1]. Weighted by segment.

- SMB weights: w = {B:0.35, S:0.35, R:0.15, E:0.15}
- Enterprise weights: w = {B:0.40, S:0.20, R:0.25, E:0.15}

**Composite ROI**: `ROI = Σ w_k * score_k`

Adoption proxy (download friction): `AF = 1 - steps_to_use/5` clipped [0,1].

**Pass gate**: `ROI * AF >= roi_target_normalized`

---

## Compliance & Safety Gates (Biotech)
- Avoid disease treatment or cure claims. Use workflow and mechanism language.
- Prefer proxy metrics: time-to-decision, error rate, reproducibility, throughput.
- Allowed nouns: assay, protocol, workflow, route, hub, kit, pack, score, audit, QC, ledger, lineage.
- Allowed verbs: map, route, triage, harmonize, curate, validate, score, label, log, simulate, forecast.
- Descriptors (max 3): AI-assisted, evidence-backed, decision-tree, calibrated, audit-ready, 21 CFR Part 11-conscious, GxP-aware, non-clinical.

---

## Naming Rules (TapSpeak)
### SMB / Individual
- 1–2 syllables. No hyphens.
- Grammars: `<Root>`, `<Root><Snap>`, `<Verb><Noun>`, `<Blend>`
- Roots: helix, celo, vivo, myco, nova, flux, quanta, soma, cyto.
- Snap suffixes: -ly, -io, -a, -o, -is, -um.
- Tagline: `Do X in Y time`.

### Enterprise
- Two-part clarity. Name + advantage.
- Grammars: `<Mechanism> Advantage`, `<Benefit> Edge`, `<Domain> Optimize`, `<Root> for <Function>`, `<Root> Suite/Platform`.
- Subtitle: `Reduce <cost/risk> by <X%> in <process>`.

**Color usage**: Prefer accents `E8B34A`, `7F7F7F`, `D1B3B4`, `EF6B72`.

---

## Output Schema
```json
{
  "name": "string",
  "alt_names": ["string"],
  "segment": "SMB | Enterprise",
  "subtitle": "string",
  "one_liner": "string",
  "artifact_type": "mini-game | kit | dataset | micro-service",
  "mechanism": ["string"],
  "what_you_get": ["file(s)", "steps"],
  "setup_steps": ["1.", "2.", "3."],
  "roi_scores": {"B": 0.0, "S": 0.0, "R": 0.0, "E": 0.0, "AF": 0.0, "ROI": 0.0},
  "compliance_flags": [],
  "download_bundle": ["filenames"],
  "version": "1.0.0"
}
```

---

## Prompt Blocks (Reusable)
**Frame**
```
Normalize the following inputs. Extract: objectives, constraints, mechanisms. Validate biotech compliance. Return a structured JSON under the Input Contract.
```

**Hypothesize**
```
Propose 3–5 mechanism-led solution patterns for the problem. Each pattern includes artifact_type, mechanism steps, needed assets, and expected impact on B,S,R,E. Keep non-clinical.
```

**Assemble**
```
Generate the smallest viable artifact for the top-scoring pattern. Include file stubs, JSON schemas, and step-by-step usage. Keep download friction <= 3 steps.
```

**Estimate ROI**
```
Score B,S,R,E in [0,1] with clear justifications. Compute ROI and AF. State assumptions.
```

**Test**
```
Create a quick-check protocol: task list, success criteria, and sample data. Report risks found.
```

**Decide**
```
If ROI*AF meets target and no compliance flags, finalize. Else list the minimal change to raise ROI above threshold. Update priors for the next loop.
```

---

## Pseudocode
```pseudo
function build_ip(input):
  state = frame(input)
  for loop in 1..5:
    patterns = hypothesize(state)
    candidate = assemble(best(patterns))
    scores = estimate_roi(candidate, state.segment)
    flags = compliance_check(candidate)
    test = quick_test(candidate)
    if pass(scores, flags, input.roi_target): 
        return finalize(candidate, scores, test)
    state = update_state(state, candidate, scores, test)
  return fallback(candidate_with_best(scores))
```

---

## Bundle Spec
- Required files per artifact:
  - Mini-game: `config.json` (tree), `README.md`, `assets/`.
  - Kit/Template: `template.docx|.md`, `checklist.md`, `calculator.xlsx|.py`.
  - Dataset/Scorecard: `schema.json`, `sample.csv`, `scorer.py`.
  - Micro-service: `app.py|.js`, `openapi.json`, `Dockerfile`.
- Each bundle ships with `manifest.json` matching **Output Schema**.

---

## Governance
- Version using semver. Record source data and prompts used.
- Keep counterfactual logs for scoring. Store assumptions and evidence URIs.
- Review naming collisions before release.

---

## Ready-to-Run Template (manifest.json)
```json
{
  "name": "QuantaRoute",
  "alt_names": ["RouteKit", "FluxQC"],
  "segment": "SMB",
  "subtitle": "Route assays to decision in under 15 minutes",
  "one_liner": "Decision-tree kit for assay routing with calibrated scoring.",
  "artifact_type": "kit",
  "mechanism": ["assay routing","protocol harmonization"],
  "what_you_get": ["template.md","checklist.md","scorer.py"],
  "setup_steps": ["copy files","fill variables","run scorer"],
  "roi_scores": {"B": 0.7,"S": 0.8,"R": 0.5,"E": 0.6,"AF": 0.8,"ROI": 0.68},
  "compliance_flags": [],
  "download_bundle": ["./bundle/*"],
  "version": "1.0.0"
}
```
