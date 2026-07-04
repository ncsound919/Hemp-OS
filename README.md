# Hemp-OS

A unified scientific operating system for hemp processing, biomanufacturing simulation, and computational research. This monorepo integrates three subsystems into a single, deterministic platform:

| Subsystem | Path | Role |
|---|---|---|
| **Hemp-OS Core** | `./` (root) | Deterministic simulation kernel, API host, React UI |
| **Hemp-Agent** | `apps/hemp-agent/` | Multi-agent orchestrator, cultivator + research panels |
| **Hemp-DB** | `packages/hemp-db/` | Knowledge layer: strains, insights, drizzle/Postgres + Firebase |

The Kernel is Law — every subsystem in this monorepo obeys the deterministic simulation kernel at the root.

## Repository layout

```
Hemp-OS/
├── apps/
│   └── hemp-agent/        # @hemp-os/agent — multi-agent UI + orchestrator
├── packages/
│   └── hemp-db/           # @hemp-os/db   — knowledge layer + DB
├── src/                   # Hemp-OS core React UI + services
├── kernel/                # Deterministic simulation kernel (the law)
├── server.ts              # Core API server entrypoint
├── data/                  # Local DBs, fixtures, papers
├── papers and data/       # Curated research CSVs
├── researchclaw/          # Automated research / literature agent
├── mem0-main/             # Memory layer
├── kernel/                # Kernel: models, calibration, validation, workflow
├── integration/, e2e/     # Cross-system integration + Playwright e2e
├── scripts/               # Operational scripts
├── package.json           # Root workspace manifest
└── .gitignore
```

## Quick start

```bash
# Install everything (workspaces hoist node_modules to root)
npm install

# Run the core kernel + API + UI
npm run dev

# Run only Hemp-Agent (port differs)
npm run dev:agent

# Run only Hemp-DB
npm run dev:db

# Build all three subsystems
npm run build:all
```

## Workspaces

This repo uses **npm workspaces**. `npm install` at the root installs deps for all three subsystems and hoists shared packages to a single `node_modules/`.

- `@hemp-os/agent` — `apps/hemp-agent/`
- `@hemp-os/db` — `packages/hemp-db/`
- Root (Hemp-OS core) — `./`

## ⚠️ The Kernel is Law ⚠️

Hemp-OS is a deterministic scientific operating system. Every result must be reproducible. The kernel at `kernel/` is the single source of truth for all simulations. UI panels, agents, and DB insights all consume kernel outputs — never the other way around.

See `kernel/README` and the root `package.json` scripts for the full rule set.

## Subsystem docs

- **Hemp-Agent**: see `apps/hemp-agent/README.md`
- **Hemp-DB**: see `packages/hemp-db/README.md`
- **Kernel**: see `kernel/` source
