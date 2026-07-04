import { intelligenceOrchestrator } from '../kernel/autonomy/intelligence-orchestrator.ts';

async function main() {
  console.log('=== Running Autonomous Intelligence Cycle ===\n');

  const start = Date.now();
  const result = await intelligenceOrchestrator.runCycle();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`Cycle completed in ${elapsed}s`);
  console.log(`  Insights generated: ${result.insightsGenerated}`);
  console.log(`  Research tasks:     ${result.researchTasksCreated}`);
  console.log(`  Content generated:  ${result.contentGenerated}`);
  console.log(`  Errors:             ${result.errors.length}`);
  if (result.errors.length > 0) {
    result.errors.forEach(e => console.log(`    - ${e}`));
  }

  console.log('\n=== System Status ===');
  const status = intelligenceOrchestrator.getStatus();
  console.log(`  Total insights:     ${status.stats.total_insights}`);
  console.log(`  Published insights: ${status.stats.published_insights}`);
  console.log(`  Total tasks:        ${status.stats.total_tasks}`);
  console.log(`  Pending tasks:      ${status.stats.pending_tasks}`);
  console.log(`  Total content:      ${status.stats.total_content}`);
  console.log(`  Total auto runs:    ${status.stats.total_runs}`);

  console.log('\n=== Generated Insights ===');
  const insights = intelligenceOrchestrator.getInsights();
  for (const ins of insights.slice(-5)) {
    console.log(`  [${ins.confidence.toUpperCase()}] ${ins.title}`);
    console.log(`    ${ins.finding.substring(0, 150)}...`);
    console.log();
  }

  console.log('=== Pending Research Tasks ===');
  const tasks = intelligenceOrchestrator.getPendingTasks();
  for (const task of tasks) {
    console.log(`  [${task.priority.toUpperCase()}] ${task.title}`);
    console.log(`    ${task.description}`);
    console.log(`    Method: ${task.method}`);
    console.log();
  }

  console.log('=== Publishable Content ===');
  const content = intelligenceOrchestrator.getPublishableContent();
  for (const c of content.slice(0, 3)) {
    console.log(`  [${c.content_type}] ${c.topic}`);
    if (c.content_type === 'did-you-know') {
      const fact = JSON.parse(c.content);
      console.log(`    ${fact.fact}`);
    }
    console.log();
  }

  intelligenceOrchestrator.destroy();
}

main().catch(console.error);
