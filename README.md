# Hemp OS

A high-fidelity layered scientific operating system designed for hemp processing, biomanufacturing simulation, and computational research. Featuring a deterministic simulation kernel, strain crossbreeding labs, OCR CoA analysis, Google Drive integration, and autonomous scientific pipelines.

## Overview

Hemp OS is a multi-layered deterministic platform that integrates theoretical science with automated digital processes. It handles the entire biomanufacturing pipeline, from genetic strain crossbreeding to thermodynamic modeling, phase-split analysis, data provenance, and autonomous campaign sweeps. 

## Features & Layers

The OS architecture is divided into 12 core layers representing unified scientific sub-systems:

- **Layer 1: Autonomous Pipeline Studio** - Interactive visual flowsheet builder for chemical processes, powered by a deterministic solver kernel.
- **Layer 2: Experiment Orchestrator** - Setup automated multi-variable sweeps across thermodynamic ranges (temperature, pressure, duration).
- **Layer 3: Data & Provenance Ledger** - Immutable lineage logging of every pipeline execution, preserving chemical purity and parameter settings.
- **Layer 3.5: Research Corpus** - Google Drive Knowledge Layer for parsing scientific papers and extracting metadata.
- **Layer 4: Policy & Autonomy Guards** - Rule-based safety checking and parameter tuning agents.
- **Layer 5: Reflexive Diagnostics** - Self-healing subsystem to detect chemical faults (e.g., solvent carryover) and automatically repair system states.
- **Layer 6: Multi-Interface Support** - Includes interactive CLI interfaces, REST APIs, and Headless simulation access.
- **Layer 7: Scientific Plugins** - Extensible architecture for dynamic drivers, thermodynamic libraries, and physical solvers.
- **Layer 8: Autonomy Lab Brain** - Deterministic chron-schedulers triggering long-running laboratory queries in the background.
- **Layer 9: Scientific Super-Systems** - Advanced mathematical modeling including CasADi optimizations, Lean 4 formal verifications, and ODESolvers.
- **Layer 10: Strain Breed Lab** - Genetic mapping, phenotypic inheritance predictions, and visual crossbreed simulations.
- **Layer 11: Ingestion & Analysis Hub** - Ingests external Certificates of Analysis (CoAs) via OCR, integrates with Kaggle datasets, and tracks academic RSS feeds.
- **Layer 12: Windows System Interop** - Simulated integration with the host OS, featuring a PowerShell interface, WSL/Nix reproducible environments, Event Telemetry, VSS Time-Travel, and Copilot Agent APIs.

## Tech Stack

* **Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, Recharts
* **Backend:** Node.js, Express, Vite Middleware
* **Simulated Kernel Engine:** Deterministic TypeScript Physics Models
* **Authentication & File Parsing:** Firebase, Google Drive API

## Setup & Running Locally

Ensure you have Node.js installed, then run:

```bash
# Install dependencies
npm install

# Start the full-stack development server
npm run dev
```

To build for production:

```bash
npm run build
npm run start
```

## Environment Variables

Check `.env.example` to see which environment variables need to be supplied (e.g. `GEMINI_API_KEY`, etc). These variables are used for AI advisor capabilities and external cloud integrations.
