import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { 
  strains, 
  studies, 
  strainStudyRelations, 
  ingestionQueue, 
  knowledgeBank, 
  experiments, 
  simulations,
  insights,
  trends,
  correlations,
  discoveryLog,
  terpenes,
  strainTerpenes,
  effects,
  strainEffects
} from "./src/db/schema.ts";
import { eq, desc, like, or, and, inArray, gte } from "drizzle-orm";
import { ingestionEngine, WATCH_PATH } from "./server/ingestionEngine.ts";
import { generateScrapedFiles } from "./server/scrapedRegistry.ts";
import { experimentRunner } from "./server/experimentRunner.ts";
import { getInsightEngine } from "./src/analytics/insightEngine.ts";
import { integrationRouter } from "../integration/routes.ts";




async function seedDatabaseIfEmpty() {
  try {
    console.log("Checking if database needs seeding...");
    const existingStrains = await db.select().from(strains).limit(1);
    if (existingStrains.length > 0) {
      console.log("Database already has data. Skipping seed.");
      return;
    }

    console.log("Database is empty. Seeding cannabis data...");

    // 1. Seed Strains
    const insertedStrains = await db.insert(strains).values([
      {
        name: "Jack Herer v.2",
        type: "sativa",
        thcMin: 1840,
        thcMax: 2210,
        cbdMin: 40,
        cbdMax: 40,
        terpeneProfile: "Terpinolene:1.24%;beta-Caryophyllene:0.82%;Myrcene:0.41%",
        effects: "Energetic, Creative, Uplifting, Focused",
        medicalUses: "Neuropathic Pain, Acute Anxiety, Glaucoma Relief, Depression",
        source: "Emerald Gardens Labs",
      },
      {
        name: "Blue Dream",
        type: "hybrid",
        thcMin: 1700,
        thcMax: 2400,
        cbdMin: 10,
        cbdMax: 20,
        terpeneProfile: "Myrcene:0.95%;Pinene:0.45%;Caryophyllene:0.25%",
        effects: "Relaxed, Happy, Euphoric, Creative",
        medicalUses: "Chronic Pain, Stress Relief, Depression, Muscle Spasms",
        source: "Cascade Lab Solutions",
      },
      {
        name: "OG Kush",
        type: "hybrid",
        thcMin: 1900,
        thcMax: 2600,
        cbdMin: 30,
        cbdMax: 30,
        terpeneProfile: "Limonene:0.75%;Caryophyllene:0.60%;Myrcene:0.45%",
        effects: "Relaxed, Hungry, Euphoric, Sleepy",
        medicalUses: "Insomnia, Muscle Spasms, Nausea, Stress Relief",
        source: "Sierra Testing Labs",
      },
      {
        name: "Sour Diesel",
        type: "sativa",
        thcMin: 1800,
        thcMax: 2500,
        cbdMin: 10,
        cbdMax: 10,
        terpeneProfile: "Limonene:0.85%;Myrcene:0.50%;Caryophyllene:0.35%",
        effects: "Uplifting, Energetic, Creative, Focused",
        medicalUses: "Fatigue, Stress Relief, Appetite Stimulation, Depression",
        source: "Northwest Analytics",
      },
      {
        name: "Harlequin",
        type: "hybrid",
        thcMin: 500,
        thcMax: 800,
        cbdMin: 800,
        cbdMax: 1100,
        terpeneProfile: "Myrcene:1.10%;Pinene:0.30%;Ocimene:0.15%",
        effects: "Relaxed, Focused, Uplifting, Clear-headed",
        medicalUses: "Inflammation, Arthritis, Pain Management, Fibromyalgia",
        source: "Oregon Labs",
      },
    ]).returning();

    // 2. Seed Studies
    const insertedStudies = await db.insert(studies).values([
      {
        title: "Double-Blind RCT: Phytocannabinoids for Neuropathic Pain",
        authors: "Gomez, L.; Patel, R.; Vance, S.",
        year: 2024,
        journal: "Journal of Clinical Cannabis",
        doi: "10.1016/j.jcc.2024.01",
        abstract: "This randomized double-blind placebo-controlled trial evaluated the efficacy of vaporized THC-dominant cannabis (Jack Herer v.2) for patients suffering from refractory neuropathic pain. Significant pain reduction (p < 0.01) was observed in the active treatment group compared to the placebo group over a 6-week period.",
        fullTextPath: "/docs/studies/neuropathic_pain_rct_2024.pdf",
        topicTags: "neuropathic pain, clinical trial, double-blind, vaporization",
        population: "72 patients with chronic peripheral neuropathic pain",
        dose: "10mg vaporized dose, twice daily",
        route: "Inhalation",
        outcomes: "Vaporized Jack Herer v.2 containing 18.4%-22.1% THC resulted in a 42% mean reduction in daily visual analog scale (VAS) pain scores with high tolerability.",
      },
      {
        title: "Terpenoid Synergy and Anxiolytic Efficacy in PTSD Patients",
        authors: "Aris, K.; Dupont, M.",
        year: 2023,
        journal: "Phytomedicine Reports",
        doi: "10.1002/pmr.2023.44",
        abstract: "An observational study analyzing the synergistic effects of Limonene and Myrcene combined with low-to-moderate doses of THC in mitigating acute stress responses. Patients reported significant reduction in trauma-induced hyperarousal indices when using strains with verified high terpene index.",
        fullTextPath: "/docs/studies/terpene_synergy_anxiety_2023.pdf",
        topicTags: "anxiety, ptsd, entourage effect, limonene, myrcene",
        population: "115 veterans with diagnosed PTSD",
        dose: "15mg oral tincture, standardized terpene concentration",
        route: "Oral / Sublingual",
        outcomes: "High limonene and myrcene content correlated with a 35% improvement on the GAD-7 anxiety scale compared to pure THC isolates, demonstrating the clinical entourage effect.",
      },
      {
        title: "Evaluation of CBD-Rich Harlequin Strain for Active Rheumatoid Arthritis",
        authors: "Sloan, A.; Takahashi, H.",
        year: 2025,
        journal: "Rheumatology & Cannabis Research",
        doi: "10.1093/rcr/2025.12",
        abstract: "An open-label pilot study administering sublingual Harlequin strain (CBD:THC ratio ~2:1) to patients suffering from active rheumatoid arthritis. Over 12 weeks, key inflammatory biomarkers (TNF-alpha, IL-6) and subjective pain scores were closely monitored.",
        fullTextPath: "/docs/studies/cbd_rich_arthritis_2025.pdf",
        topicTags: "arthritis, cbd, inflammation, harlequin, autoimmune",
        population: "45 patients with moderate-to-severe rheumatoid arthritis",
        dose: "20mg CBD / 10mg THC daily sublingual extract",
        route: "Sublingual",
        outcomes: "Marked reductions in joint stiffness, daily pain index, and C-reactive protein (CRP). 82% of patients reported a significant reduction in pain with minor, transient side effects.",
      },
    ]).returning();

    // 3. Link Strains and Studies
    // Jack Herer (id 1) ↔ Study 1 (id 1)
    // Blue Dream/Sour Diesel (id 2, 4) ↔ Study 2 (id 2)
    // Harlequin (id 5) ↔ Study 3 (id 3)
    const jh = insertedStrains.find(s => s.name.includes("Jack Herer"));
    const bd = insertedStrains.find(s => s.name.includes("Blue Dream"));
    const hq = insertedStrains.find(s => s.name.includes("Harlequin"));

    const s1 = insertedStudies.find(st => st.title.includes("Neuropathic Pain"));
    const s2 = insertedStudies.find(st => st.title.includes("PTSD"));
    const s3 = insertedStudies.find(st => st.title.includes("Rheumatoid Arthritis"));

    if (jh && s1) {
      await db.insert(strainStudyRelations).values({
        strainId: jh.id,
        studyId: s1.id,
        relationshipType: "primary_intervention",
      });
    }
    if (bd && s2) {
      await db.insert(strainStudyRelations).values({
        strainId: bd.id,
        studyId: s2.id,
        relationshipType: "synergistic_comparison",
      });
    }
    if (hq && s3) {
      await db.insert(strainStudyRelations).values({
        strainId: hq.id,
        studyId: s3.id,
        relationshipType: "primary_intervention",
      });
    }

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3200;

  app.use(express.json());

  // Integration layer — cross-system communication, data sources, paper generation
  app.use("/api/integration", integrationRouter);

  // Run database seeding
  await seedDatabaseIfEmpty();

  // Start the background Ingestion Engine
  await ingestionEngine.start();
    experimentRunner.start();

  // Start the background Insight Engine
  const insightEngine = getInsightEngine();
  insightEngine.startScheduledAnalysis();

  // Run insights analysis immediately after any successful file ingestion
  ingestionEngine.addEventListener((event) => {
    if (event.type === 'success' && event.message.startsWith('Ingest completed successfully')) {
      getInsightEngine().runFullAnalysis().catch(err => {
        console.error("Failed to run automatic insight analysis:", err);
      });
    }
  });

  // API Route: Health Check
  app.get("/api/health", async (req, res) => {
    try {
      await db.select().from(strains).limit(1);
      res.json({ status: "ok", database: "connected" });
    } catch (err: any) {
      console.error("Health check error:", err);
      res.json({ status: "error", database: "disconnected" });
    }
  });

  // --- Ingestion Engine API Routes ---

  app.get("/api/ingestion/status", (req, res) => {
    res.json({
      status: ingestionEngine.getStatus(),
      logs: ingestionEngine.getLogs(),
    });
  });

  app.post("/api/ingestion/start", async (req, res) => {
    await ingestionEngine.start();
    experimentRunner.start();
    res.json({ success: true, status: ingestionEngine.getStatus() });
  });

  app.post("/api/ingestion/stop", (req, res) => {
    ingestionEngine.stop();
    res.json({ success: true, status: ingestionEngine.getStatus() });
  });

  app.post("/api/ingestion/pause", (req, res) => {
    ingestionEngine.pause();
    res.json({ success: true, status: ingestionEngine.getStatus() });
  });

  app.post("/api/ingestion/resume", (req, res) => {
    ingestionEngine.resume();
    res.json({ success: true, status: ingestionEngine.getStatus() });
  });

  // --- Insight Engine API Routes ---

  app.post("/api/insights/analyze", async (req, res) => {
    try {
      await getInsightEngine().runFullAnalysis();
      res.json({ status: "analysis complete" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/insights", async (req, res) => {
    try {
      const { type, category, limit = "20" } = req.query;
      let query = db.select().from(insights);
      
      let conditions = [];
      if (type) {
        conditions.push(eq(insights.type, type as string));
      }
      if (category) {
        conditions.push(eq(insights.category, category as string));
      }

      let q;
      if (conditions.length > 0) {
        if (conditions.length === 1) {
          q = query.where(conditions[0]);
        } else {
          q = query.where(and(...conditions));
        }
      } else {
        q = query;
      }

      const results = await q.orderBy(desc(insights.generatedAt)).limit(parseInt(limit as string));
      res.json({ insights: results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ingestion/queue", async (req, res) => {
    try {
      const queueList = await db.select().from(ingestionQueue).orderBy(desc(ingestionQueue.id));
      res.json({ queue: queueList });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/knowledge-bank", async (req, res) => {
    try {
      const category = req.query.category as string;
      let kbList;
      if (category && category !== 'all') {
        kbList = await db.select().from(knowledgeBank).where(eq(knowledgeBank.category, category)).orderBy(desc(knowledgeBank.id));
      } else {
        kbList = await db.select().from(knowledgeBank).orderBy(desc(knowledgeBank.id));
      }
      res.json({ knowledgeBank: kbList });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ingestion/upload", async (req, res) => {
    try {
      const { fileName, content } = req.body;
      if (!fileName || !content) {
        return res.status(400).json({ error: "fileName and content are required" });
      }

      // Safe clean filename
      const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const filePath = path.join(WATCH_PATH, safeName);
      
      fs.writeFileSync(filePath, content, "utf8");
      ingestionEngine.addLog("info", `File uploaded via user-interface: ${safeName}`, "Stored in local monitored directory.");
      
      // Process immediately
      await ingestionEngine.triggerImmediateProcessing();
      
      res.json({ success: true, fileName: safeName, filePath });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ingestion/trigger-mock", async (req, res) => {
    try {
      const { type } = req.body; // 'strain' or 'study' or 'pharmacology'
      const rand = Math.floor(Math.random() * 1000);
      
      if (type === 'strain') {
        const fileName = `strain_dynamic_coa_${rand}.json`;
        const filePath = path.join(WATCH_PATH, fileName);
        
        // Fully deterministic randomized strain names and profiles
        const names = [
          "Aurora Horizon", "Crimson Peak", "Emerald Dream", "Solaris OG", 
          "Obsidian Kush", "Quantum Haze", "Glacier Frost", "Valkyrie Indica",
          "Lunar Haze", "Titanium Diesel", "Nebula Skunk", "Giga Zkittlez"
        ];
        const selectedName = names[rand % names.length] + ` v.${rand}`;
        
        const types = ["hybrid", "indica", "sativa"];
        const selectedType = types[rand % types.length];
        
        const thc = (15 + (rand % 15) + (rand % 10) / 10).toFixed(1) + "%";
        const cbd = (rand % 5 === 0) ? (1 + (rand % 10)).toFixed(1) + "%" : "0." + (rand % 9) + "%";
        
        const terpenesList = [
          "Myrcene: 0.85%, Limonene: 0.40%, Caryophyllene: 0.32%",
          "Limonene: 0.95%, Myrcene: 0.62%, Caryophyllene: 0.45%",
          "Terpinolene: 1.12%, Caryophyllene: 0.48%, Pinene: 0.35%",
          "Pinene: 0.60%, Myrcene: 0.40%, Linalool: 0.25%",
          "Linalool: 0.70%, Limonene: 0.55%, Caryophyllene: 0.30%"
        ];
        const selectedTerp = terpenesList[rand % terpenesList.length];
        
        const effectsList = [
          "Creative, Clear-headed, Euphoric",
          "Relaxed, Happy, Creative, Sleepy",
          "Energetic, Euphoric, Uplifting, Focused",
          "Focused, Calm, Balanced, Relaxed",
          "Creative, Sociable, Giggles, Energetic"
        ];
        const selectedEffect = effectsList[rand % effectsList.length];
        
        const medicalUsesList = [
          "Mild Pain, Chronic Fatigue, ADHD Symptoms",
          "Anxiety, Chronic Stress, Depression, Mild Pain",
          "Depression, Chronic Fatigue, Appetite Loss",
          "Severe Insomnia, Muscle Spasms, Acute Anxiety",
          "Chronic Pain, Nausea, Migraines, Stress"
        ];
        const selectedMedical = medicalUsesList[rand % medicalUsesList.length];
        
        const labs = [
          "HempOS Autonomous Lab Diagnostics",
          "Pinnacle Botanical Certification Services",
          "Veritas Phytochemical Testing Labs",
          "Apex Quality Assurance Laboratory"
        ];
        const selectedLab = labs[rand % labs.length];

        const contentStr = JSON.stringify({
          name: selectedName,
          type: selectedType,
          thc,
          cbd,
          terpenes: selectedTerp,
          effects: selectedEffect,
          medicalUses: selectedMedical,
          lab: selectedLab
        }, null, 2);
        
        fs.writeFileSync(filePath, contentStr, "utf8");
        ingestionEngine.addLog("info", `Dynamic COA generated: ${fileName}`, "Saved to directory watcher.");
        
        // Process immediately
        await ingestionEngine.triggerImmediateProcessing();
        
        return res.json({ success: true, fileName });
      } else if (type === 'study') {
        const fileName = `preclinical_study_${rand}.txt`;
        const filePath = path.join(WATCH_PATH, fileName);
        
        const titles = [
          "Activation of Medial Prefrontal Cortex CB1 Receptors Mitigates Fear Memory Expression",
          "Efficacy of Vaporized Beta-Caryophyllene in Neuro-Inflammatory Microglial Attenuation",
          "Longitudinal Trial of Mixed Cannabinoid Administration in Refractory Epilepsy Patients",
          "Synergistic Receptor Modulation of Myrcene-Dominant Sativa Cultivars on Spatial Cognition"
        ];
        const authorsList = [
          "Sterling, L.; Zhao, Y.X.",
          "Jenkins, K.; Albright, S.",
          "Guzman, F.; O'Shaughnessy, W.",
          "Kees, A.; De Vries, T."
        ];
        const journalsList = [
          "Neuroscience and Neurotherapeutics",
          "Journal of Psychopharmacology and Behavior",
          "New England Journal of Phytomedicine",
          "Acta Horticulturae and Genetic Breeding"
        ];
        
        const selectedTitle = titles[rand % titles.length];
        const selectedAuthor = authorsList[rand % authorsList.length];
        const selectedJournal = journalsList[rand % journalsList.length];
        const doi = `10.1038/nn.2025.${100 + (rand % 900)}`;

        const contentStr = `TITLE: ${selectedTitle}
AUTHORS: ${selectedAuthor}
YEAR: 2025
JOURNAL: ${selectedJournal}
DOI: ${doi}
ABSTRACT: This preclinical research model uses cell-type specific localized pharmacology and electrophysiology to map how cannabinoid and terpene receptors govern neural circuits, behavioral modification, or receptor binding efficacy.
POPULATION: ${40 + (rand % 80)} adult male Sprague-Dawley rodents
DOSE: 0.5 to 2.5 milligrams direct microinfusion of active compound
ROUTE: Localized intracranial infusion / Oral gavage
OUTCOMES: Subject cohorts showed significant clinical response parameters (p < 0.001) with high therapeutic efficacy indices and minimal off-target adverse reactions.
TAGS: neuroscience, receptors, neural circuits, preclinical, pharmacology`;
        
        fs.writeFileSync(filePath, contentStr, "utf8");
        ingestionEngine.addLog("info", `Dynamic preclinical trial generated: ${fileName}`, "Saved to directory watcher.");
        
        // Process immediately
        await ingestionEngine.triggerImmediateProcessing();
        
        return res.json({ success: true, fileName });
      } else {
        // Pharmacology file
        const fileName = `pharmacology_study_${rand}.txt`;
        const filePath = path.join(WATCH_PATH, fileName);

        const titles = [
          "Pharmacogenomics of CYP2C9 Variants and Hepatic THC Clearance Rates",
          "Hepatic Cytochrome P450 Metabolism and Pharmacokinetics of Purified CBD Ingestion",
          "Bioavailability Profiles and Plasma Kinetic Curves of Sublingual Terpene-Rich Infusions"
        ];
        const authorsList = [
          "Jenkins, K.; Albright, S.",
          "Vigil, J.M.; Stith, S.S.",
          "Russo, E.B.; Guy, G."
        ];
        const journalsList = [
          "Pharmacogenetics and Personalized Medicine",
          "Clinical Medicine Informatics",
          "Archives of Ethnopharmacology"
        ];

        const selectedTitle = titles[rand % titles.length];
        const selectedAuthor = authorsList[rand % authorsList.length];
        const selectedJournal = journalsList[rand % journalsList.length];
        const doi = `10.1111/ppm.2024.${100 + (rand % 900)}`;

        const contentStr = `TITLE: ${selectedTitle}
AUTHORS: ${selectedAuthor}
YEAR: 2024
JOURNAL: ${selectedJournal}
DOI: ${doi}
ABSTRACT: We detail how polymorphisms in the cytochrome metabolic family affect the metabolic rate, clearance, and active metabolite profiles of cannabinoids, explaining inter-individual dosing sensitivity and therapeutic index variance.
POPULATION: ${50 + (rand % 100)} volunteers genotyped for metabolic variants
DOSE: Standardized 5mg to 25mg oral/sublingual active formulation
ROUTE: Oral ingestion / Sublingual mucosa
OUTCOMES: Sub-population metabolic curves showed clear genetic-guided dosing prerequisites, showing up to a 3.2-fold difference in hepatic clearance rates (p < 0.001).
TAGS: pharmacology, cyp450, pharmacogenomics, dosing, metabolism`;

        fs.writeFileSync(filePath, contentStr, "utf8");
        ingestionEngine.addLog("info", `Dynamic pharmacology paper generated: ${fileName}`, "Saved to directory watcher.");
        
        // Process immediately
        await ingestionEngine.triggerImmediateProcessing();
        
        return res.json({ success: true, fileName });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ingestion/scrape-target", async (req, res) => {
    try {
      const { sourceKey, strainName } = req.body;
      if (!sourceKey) {
        return res.status(400).json({ error: "sourceKey is required." });
      }

      // Generate the strain JSON and txt clinical paper matching the unique brand specs
      const filesToCreate = await generateScrapedFiles(sourceKey, strainName);
      const createdFileNames: string[] = [];

      for (const file of filesToCreate) {
        const filePath = path.join(WATCH_PATH, file.fileName);
        fs.writeFileSync(filePath, file.content, "utf8");
        createdFileNames.push(file.fileName);

        // Add corresponding log entries in the engine terminal
        ingestionEngine.addLog(
          "info",
          `Airlock downloaded: ${file.fileName}`,
          `Pulled matching data layout from target: ${sourceKey.toUpperCase()}`
        );
      }

      // Process immediately
      await ingestionEngine.triggerImmediateProcessing();

      res.json({
        success: true,
        source: sourceKey,
        strainName: strainName || "Default Database Clone",
        files: createdFileNames,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Autonomous Experiments & Simulations API ---

  app.get("/api/experiments", async (req, res) => {
    try {
      const expList = await db.select().from(experiments).orderBy(desc(experiments.id));
      res.json({ experiments: expList });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/experiments", async (req, res) => {
    try {
      const { name, hypothesis, methodology } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Experiment name is required" });
      }

      const inserted = await db.insert(experiments).values({
        name,
        hypothesis: hypothesis || null,
        methodology: methodology || null,
        status: 'queued',
      }).returning();

      ingestionEngine.addLog("info", `Experiment queued: ${name}`, `Hypothesis: ${hypothesis || 'N/A'}`);
      res.status(201).json({ experiment: inserted[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/simulations", async (req, res) => {
    try {
      const simList = await db.select().from(simulations).orderBy(desc(simulations.id));
      res.json({ simulations: simList });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/simulations", async (req, res) => {
    try {
      const { name, parameters } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Simulation name is required" });
      }

      const inserted = await db.insert(simulations).values({
        name,
        parameters: parameters || {},
        status: 'queued',
      }).returning();

      ingestionEngine.addLog("info", `Bio-Simulation queued: ${name}`, `Parameters: ${JSON.stringify(parameters)}`);
      res.status(201).json({ simulation: inserted[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Get unified recent/searched entities
  app.get("/api/recent-entities", async (req, res) => {
    try {
      const q = (req.query.q as string || "").toLowerCase();
      const viewType = req.query.type as string || "all";

      const responseEntities: any[] = [];

      // 1. Fetch Strains
      if (viewType === "all" || viewType === "strains" || viewType === "strain") {
        let strainList = await db.select().from(strains).orderBy(desc(strains.createdAt));
        
        if (q) {
          strainList = strainList.filter(s => 
            s.name.toLowerCase().includes(q) || 
            s.type.toLowerCase().includes(q) ||
            (s.effects && s.effects.toLowerCase().includes(q)) ||
            (s.medicalUses && s.medicalUses.toLowerCase().includes(q))
          );
        }

        strainList.forEach(s => {
          responseEntities.push({
            id: s.id,
            name: s.name,
            type: "strain",
            subtitle: `${s.type || 'Unknown'} • THC ${s.thcMin ? (s.thcMin / 100).toFixed(1) : '?'}-${s.thcMax ? (s.thcMax / 100).toFixed(1) : '?'}%`,
            createdAt: s.createdAt?.toISOString() || new Date().toISOString(),
          });
        });
      }

      // 2. Fetch Studies
      if (viewType === "all" || viewType === "studies" || viewType === "study") {
        let studyList = await db.select().from(studies).orderBy(desc(studies.createdAt));

        if (q) {
          studyList = studyList.filter(st => 
            st.title.toLowerCase().includes(q) ||
            (st.authors && st.authors.toLowerCase().includes(q)) ||
            (st.journal && st.journal.toLowerCase().includes(q)) ||
            (st.abstract && st.abstract.toLowerCase().includes(q)) ||
            (st.topicTags && st.topicTags.toLowerCase().includes(q))
          );
        }

        studyList.forEach(st => {
          responseEntities.push({
            id: st.id,
            name: st.title,
            type: "study",
            subtitle: `${st.year || 'n.d.'} • ${st.journal || 'Unknown journal'}`,
            createdAt: st.createdAt?.toISOString() || new Date().toISOString(),
          });
        });
      }

      // Sort combined entities by createdAt descending
      responseEntities.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      res.json({ entities: responseEntities });
    } catch (error: any) {
      console.error("Failed to query entities:", error);
      res.status(500).json({ error: error.message || "Database query failed" });
    }
  });

  // API Route: Get all unique normalized terpenes
  app.get("/api/terpenes", async (req, res) => {
    try {
      const list = await db.select().from(terpenes).orderBy(terpenes.name);
      res.json({ terpenes: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Get all unique normalized effects
  app.get("/api/effects", async (req, res) => {
    try {
      const list = await db.select().from(effects).orderBy(effects.name);
      res.json({ effects: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Advanced strain search by normalized terpene and effect
  app.get("/api/strains", async (req, res) => {
    try {
      const list = await db.select().from(strains).orderBy(strains.name);
      res.json({ strains: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/strains/advanced-search", async (req, res) => {
    try {
      const terpeneIdStr = req.query.terpeneId as string;
      const effectIdStr = req.query.effectId as string;
      const minConcentration = parseFloat(req.query.minConcentration as string || "0");

      let matchingStrainsByTerpene: number[] | null = null;
      if (terpeneIdStr) {
        const terpeneId = parseInt(terpeneIdStr);
        if (!isNaN(terpeneId)) {
          const results = await db.select({ strainId: strainTerpenes.strainId })
            .from(strainTerpenes)
            .where(
              minConcentration > 0 
                ? and(eq(strainTerpenes.terpeneId, terpeneId), gte(strainTerpenes.concentration, minConcentration))
                : eq(strainTerpenes.terpeneId, terpeneId)
            );
          matchingStrainsByTerpene = results.map(r => r.strainId);
        }
      }

      let matchingStrainsByEffect: number[] | null = null;
      if (effectIdStr) {
        const effectId = parseInt(effectIdStr);
        if (!isNaN(effectId)) {
          const results = await db.select({ strainId: strainEffects.strainId })
            .from(strainEffects)
            .where(eq(strainEffects.effectId, effectId));
          matchingStrainsByEffect = results.map(r => r.strainId);
        }
      }

      let finalStrainIds: number[] | null = null;
      if (matchingStrainsByTerpene !== null && matchingStrainsByEffect !== null) {
        finalStrainIds = matchingStrainsByTerpene.filter(id => matchingStrainsByEffect!.includes(id));
      } else if (matchingStrainsByTerpene !== null) {
        finalStrainIds = matchingStrainsByTerpene;
      } else if (matchingStrainsByEffect !== null) {
        finalStrainIds = matchingStrainsByEffect;
      }

      let list;
      if (finalStrainIds !== null) {
        if (finalStrainIds.length === 0) {
          list = [];
        } else {
          list = await db.select().from(strains).where(inArray(strains.id, finalStrainIds));
        }
      } else {
        list = await db.select().from(strains).orderBy(desc(strains.createdAt)).limit(50);
      }

      res.json({ strains: list });
    } catch (err: any) {
      console.error("Advanced search error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Get specific strain details including linked studies
  app.get("/api/strains/:id", async (req, res) => {
    try {
      const strainId = parseInt(req.params.id);
      if (isNaN(strainId)) {
        return res.status(400).json({ error: "Invalid strain ID" });
      }

      const strainResult = await db.select().from(strains).where(eq(strains.id, strainId)).limit(1);
      if (strainResult.length === 0) {
        return res.status(404).json({ error: "Strain not found" });
      }

      const strain = strainResult[0];

      // Query linked studies
      const linked = await db.select()
        .from(strainStudyRelations)
        .innerJoin(studies, eq(strainStudyRelations.studyId, studies.id))
        .where(eq(strainStudyRelations.strainId, strainId));

      const relatedStudies = linked.map(row => ({
        id: row.studies.id,
        title: row.studies.title,
        authors: row.studies.authors,
        year: row.studies.year,
        journal: row.studies.journal,
        doi: row.studies.doi,
        abstract: row.studies.abstract,
        population: row.studies.population,
        dose: row.studies.dose,
        route: row.studies.route,
        outcomes: row.studies.outcomes,
        createdAt: row.studies.createdAt?.toISOString() || null,
      }));

      // Query normalized terpenes
      const strainTerps = await db.select()
        .from(strainTerpenes)
        .innerJoin(terpenes, eq(strainTerpenes.terpeneId, terpenes.id))
        .where(eq(strainTerpenes.strainId, strainId));

      const normalizedTerpenes = strainTerps.map(row => ({
        id: row.terpenes.id,
        name: row.terpenes.name,
        description: row.terpenes.description,
        concentration: row.strain_terpenes.concentration,
      }));

      // Query normalized effects
      const strainEffs = await db.select()
        .from(strainEffects)
        .innerJoin(effects, eq(strainEffects.effectId, effects.id))
        .where(eq(strainEffects.strainId, strainId));

      const normalizedEffects = strainEffs.map(row => ({
        id: row.effects.id,
        name: row.effects.name,
        description: row.effects.description,
      }));

      res.json({ 
        strain, 
        relatedStudies,
        normalizedTerpenes,
        normalizedEffects
      });
    } catch (error: any) {
      console.error("Failed to query strain details:", error);
      res.status(500).json({ error: error.message || "Query failed" });
    }
  });

  // API Route: Get specific study details
  app.get("/api/studies/:id", async (req, res) => {
    try {
      const studyId = parseInt(req.params.id);
      if (isNaN(studyId)) {
        return res.status(400).json({ error: "Invalid study ID" });
      }

      const studyResult = await db.select().from(studies).where(eq(studies.id, studyId)).limit(1);
      if (studyResult.length === 0) {
        return res.status(404).json({ error: "Study not found" });
      }

      const study = studyResult[0];

      // Query linked strains
      const linked = await db.select()
        .from(strainStudyRelations)
        .innerJoin(strains, eq(strainStudyRelations.strainId, strains.id))
        .where(eq(strainStudyRelations.studyId, studyId));

      const linkedStrains = linked.map(row => row.strains);

      res.json({ study, linkedStrains });
    } catch (error: any) {
      console.error("Failed to query study details:", error);
      res.status(500).json({ error: error.message || "Query failed" });
    }
  });

  // API Route: Create strain
  app.post("/api/strains", async (req, res) => {
    try {
      const { name, type, thcMin, thcMax, cbdMin, cbdMax, terpeneProfile, effects, medicalUses, source } = req.body;
      if (!name || !type) {
        return res.status(400).json({ error: "Name and type are required" });
      }

      const inserted = await db.insert(strains).values({
        name,
        type: type as "indica" | "sativa" | "hybrid" | "other",
        thcMin: thcMin ? parseInt(thcMin) : null,
        thcMax: thcMax ? parseInt(thcMax) : null,
        cbdMin: cbdMin ? parseInt(cbdMin) : null,
        cbdMax: cbdMax ? parseInt(cbdMax) : null,
        terpeneProfile: terpeneProfile || null,
        effects: effects || null,
        medicalUses: medicalUses || null,
        source: source || null,
      }).returning();

      res.status(201).json({ strain: inserted[0] });
    } catch (error: any) {
      console.error("Failed to create strain:", error);
      res.status(500).json({ error: error.message || "Creation failed" });
    }
  });

  // API Route: Create study
  app.post("/api/studies", async (req, res) => {
    try {
      const { title, authors, year, journal, doi, abstract, topicTags, population, dose, route, outcomes } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const inserted = await db.insert(studies).values({
        title,
        authors: authors || null,
        year: year ? parseInt(year) : null,
        journal: journal || null,
        doi: doi || null,
        abstract: abstract || null,
        topicTags: topicTags || null,
        population: population || null,
        dose: dose || null,
        route: route || null,
        outcomes: outcomes || null,
      }).returning();

      res.status(201).json({ study: inserted[0] });
    } catch (error: any) {
      console.error("Failed to create study:", error);
      res.status(500).json({ error: error.message || "Creation failed" });
    }
  });

  // API Route: Link strain and study
  app.post("/api/relations", async (req, res) => {
    try {
      const { strainId, studyId, relationshipType } = req.body;
      if (!strainId || !studyId) {
        return res.status(400).json({ error: "strainId and studyId are required" });
      }

      await db.insert(strainStudyRelations).values({
        strainId: parseInt(strainId),
        studyId: parseInt(studyId),
        relationshipType: relationshipType || "mentioned",
      });

      res.status(201).json({ success: true });
    } catch (error: any) {
      console.error("Failed to create relation:", error);
      res.status(500).json({ error: error.message || "Relation creation failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist'); // server is in dist/server.cjs
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
