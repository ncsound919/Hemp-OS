import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');

let newContent = content;
if (!newContent.includes('OrchestratorPanel')) {
  newContent = newContent.replace('import ResearchLab from "./components/ResearchLab";', 'import ResearchLab from "./components/ResearchLab";\nimport { OrchestratorPanel } from "./components/OrchestratorPanel";');
}

const startTag = '{/* TAB 1: MULTI-AGENT ORCHESTRATOR */}';
const endTag = '{/* TAB 1: DET BRAIN ORCHESTRATOR END */}';
const startIdx = newContent.indexOf(startTag);
const endIdx = newContent.indexOf(endTag) + endTag.length;

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `{/* TAB 1: MULTI-AGENT ORCHESTRATOR */}
            {activeTab === "orchestrator" && (
              <OrchestratorPanel
                isQuerying={isQuerying}
                orchestrationResult={orchestrationResult}
                presetQueries={presetQueries}
                triggerPreset={triggerPreset}
                orchestratorQuery={orchestratorQuery}
                setOrchestratorQuery={setOrchestratorQuery}
                handleOrchestratorSubmit={handleOrchestratorSubmit}
              />
            )}
            {/* TAB 1: DET BRAIN ORCHESTRATOR END */}`;
  newContent = newContent.substring(0, startIdx) + replacement + newContent.substring(endIdx);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Replaced orchestrator panel');
} else {
  console.log('Tags not found');
}
