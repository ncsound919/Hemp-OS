import { db } from "../src/db/index.ts";
import { experiments, simulations } from "../src/db/schema.ts";
import { eq, and } from "drizzle-orm";
import { ingestionEngine } from "./ingestionEngine.ts";

export class ExperimentRunner {
  private isRunning = false;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("🧪 Experiment Runner started.");
    
    // Poll every 5 seconds for queued tasks
    setInterval(() => {
      this.pollQueue().catch(err => console.error("Experiment runner error:", err));
    }, 5000);
  }

  private async pollQueue() {
    // 1. Check for queued experiments
    const queuedExps = await db.select().from(experiments).where(eq(experiments.status, 'queued'));
    for (const exp of queuedExps) {
      // Mark as running
      await db.update(experiments).set({ status: 'running' }).where(eq(experiments.id, exp.id));
      ingestionEngine.addLog("info", `Experiment running: ${exp.name}`, "Initializing in-silico bio-assay...");
      
      // Wait a few seconds to simulate work
      setTimeout(async () => {
        const results = {
          sampleSize: Math.floor(Math.random() * 500) + 50,
          pValue: parseFloat((Math.random() * 0.1).toFixed(4)),
          clinicalOutcome: "Observed statistically significant binding affinity reduction.",
          confidenceInterval: "[0.85, 1.15]"
        };
        await db.update(experiments).set({ status: 'completed', results }).where(eq(experiments.id, exp.id));
        ingestionEngine.addLog("success", `Experiment completed: ${exp.name}`, `p-value: ${results.pValue}`);
      }, 8000 + Math.random() * 4000);
    }

    // 2. Check for queued simulations
    const queuedSims = await db.select().from(simulations).where(eq(simulations.status, 'queued'));
    for (const sim of queuedSims) {
      await db.update(simulations).set({ status: 'running' }).where(eq(simulations.id, sim.id));
      ingestionEngine.addLog("info", `Simulation running: ${sim.name}`, "Computing pharmacokinetics...");
      
      setTimeout(async () => {
        const results = {
          bioavailability: (Math.random() * 0.4 + 0.1).toFixed(2) + "%",
          cb1Affinity: (Math.random() * 50 + 10).toFixed(1),
          plasmaKineticCurves: {
            cMaxUgL: (Math.random() * 100 + 20).toFixed(1),
            tMaxHours: (Math.random() * 2 + 0.5).toFixed(1)
          }
        };
        await db.update(simulations).set({ status: 'completed', results }).where(eq(simulations.id, sim.id));
        ingestionEngine.addLog("success", `Simulation completed: ${sim.name}`, `CB1 Affinity: ${results.cb1Affinity}nM`);
      }, 7000 + Math.random() * 3000);
    }
  }
}

export const experimentRunner = new ExperimentRunner();
