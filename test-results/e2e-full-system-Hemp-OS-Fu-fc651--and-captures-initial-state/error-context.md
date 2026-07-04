# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\full-system.spec.ts >> Hemp OS Full System E2E >> loads the app and captures initial state
- Location: e2e\full-system.spec.ts:6:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Hemp OS')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('text=Hemp OS')

```

```yaml
- text: "[plugin:vite:react-babel] C:\\Users\\User\\Desktop\\Hemp-OS-main\\src\\components\\StrainBreedLab.tsx: Identifier 'LineChart' has already been declared. (20:76) 23 | return strainsList.map(s => { C:/Users/User/Desktop/Hemp-OS-main/src/components/StrainBreedLab.tsx:20:76 18 | } from 'lucide-react'; 19 | import { motion, AnimatePresence } from 'motion/react'; 20 | import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts'; | ^ 21 | 22 | function initializeStrainsWithPhenotypes(strainsList: Strain[]): Strain[] { at toParseError (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parse-error.ts:95:45) at TypeScriptParserMixin.raise (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\tokenizer\\index.ts:1504:19) at TypeScriptScopeHandler.declareName (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\plugins\\typescript\\scope.ts:72:21) at TypeScriptParserMixin.declareNameFromIdentifier (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\lval.ts:876:16) at TypeScriptParserMixin.checkIdentifier (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\lval.ts:871:12) at TypeScriptParserMixin.checkLVal (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\lval.ts:763:12) at TypeScriptParserMixin.finishImportSpecifier (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:3229:10) at TypeScriptParserMixin.parseImportSpecifier (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:3490:17) at TypeScriptParserMixin.parseImportSpecifier (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\plugins\\typescript\\index.ts:4404:20) at TypeScriptParserMixin.parseNamedImportSpecifiers (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:3451:36) at TypeScriptParserMixin.parseImportSpecifiersAndAfter (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:3179:37) at TypeScriptParserMixin.parseImport (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:3148:17) at TypeScriptParserMixin.parseImport (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\plugins\\typescript\\index.ts:2970:28) at TypeScriptParserMixin.parseStatementContent (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:647:25) at TypeScriptParserMixin.parseStatementContent (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\plugins\\typescript\\index.ts:3220:20) at TypeScriptParserMixin.parseStatementLike (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:482:17) at TypeScriptParserMixin.parseModuleItem (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:419:17) at TypeScriptParserMixin.parseBlockOrModuleBlockBody (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:1443:16) at TypeScriptParserMixin.parseBlockBody (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:1417:10) at TypeScriptParserMixin.parseProgram (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:229:10) at TypeScriptParserMixin.parseTopLevel (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\statement.ts:203:25) at TypeScriptParserMixin.parse (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\parser\\index.ts:83:25) at TypeScriptParserMixin.parse (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\plugins\\typescript\\index.ts:4354:20) at parse (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\parser\\src\\index.ts:86:38) at parser (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\core\\src\\parser\\index.ts:29:19) at parser.next (<anonymous>) at normalizeFile (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\core\\src\\transformation\\normalize-file.ts:49:24) at normalizeFile.next (<anonymous>) at run (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\core\\src\\transformation\\index.ts:41:36) at run.next (<anonymous>) at transform (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\core\\src\\transform.ts:29:20) at transform.next (<anonymous>) at step (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\gensync\\index.js:261:32) at C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\gensync\\index.js:273:13 at async.call.result.err.err (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\gensync\\index.js:223:11) at C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\gensync\\index.js:189:28 at <anonymous> (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\@babel\\core\\src\\gensync-utils\\async.ts:90:7) at C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\gensync\\index.js:113:33 at step (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\gensync\\index.js:287:14) at C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\gensync\\index.js:273:13 at async.call.result.err.err (C:\\Users\\User\\Desktop\\Hemp-OS-main\\node_modules\\gensync\\index.js:223:11 Click outside, press Esc key, or fix the code to dismiss. You can also disable this overlay by setting"
- code: server.hmr.overlay
- text: to
- code: "false"
- text: in
- code: vite.config.ts
- text: .
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const BASE = 'http://localhost:3100';
  4   | 
  5   | test.describe('Hemp OS Full System E2E', () => {
  6   |   test('loads the app and captures initial state', async ({ page }) => {
  7   |     await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
> 8   |     await expect(page.locator('text=Hemp OS')).toBeVisible({ timeout: 15000 });
      |                                                ^ Error: expect(locator).toBeVisible() failed
  9   |     await page.waitForTimeout(2000);
  10  |     await page.screenshot({ path: 'test-results/01-initial-load.png', fullPage: false });
  11  |   });
  12  | 
  13  |   test('runs kernel simulation and captures results', async ({ page }) => {
  14  |     await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  15  |     await page.waitForTimeout(2000);
  16  | 
  17  |     // Click the "Execute Run" button in the header
  18  |     const runBtn = page.locator('button:has-text("Execute Run")').first();
  19  |     await runBtn.click();
  20  | 
  21  |     // Wait for simulation to complete
  22  |     await page.waitForTimeout(3000);
  23  | 
  24  |     // Screenshot the simulation results area
  25  |     await page.screenshot({ path: 'test-results/02-kernel-simulation.png', fullPage: false });
  26  | 
  27  |     // Scroll down to see yield solver section
  28  |     await page.evaluate(() => window.scrollBy(0, 600));
  29  |     await page.waitForTimeout(500);
  30  |     await page.screenshot({ path: 'test-results/03-yield-results.png', fullPage: false });
  31  |   });
  32  | 
  33  |   test('navigates through all OS layers', async ({ page }) => {
  34  |     await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  35  |     await page.waitForTimeout(3000);
  36  | 
  37  |     const layers = [
  38  |       { name: 'Scientific Scheduler', file: '04-scientific-scheduler' },
  39  |       { name: 'Scientific Memory', file: '05-scientific-memory' },
  40  |       { name: 'Ingestion Subsystem', file: '06-ingestion-subsystem' },
  41  |       { name: 'Scientific Filesystem', file: '07-scientific-filesystem' },
  42  |       { name: 'Security/Policy', file: '08-security-policy' },
  43  |       { name: 'Plugin/Driver', file: '09-plugin-driver' },
  44  |       { name: 'Networking', file: '10-networking' },
  45  |       { name: 'System Services', file: '11-system-services' },
  46  |       { name: 'Telemetry/Logging', file: '12-telemetry-logging' },
  47  |       { name: 'Scientific UI', file: '13-scientific-ui' },
  48  |       { name: 'Copilot Integration', file: '14-copilot-integration' },
  49  |     ];
  50  | 
  51  |     for (const layer of layers) {
  52  |       const btn = page.locator(`button:has-text("${layer.name}")`).first();
  53  |       if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
  54  |         await btn.click();
  55  |         await page.waitForTimeout(1000);
  56  |         await page.screenshot({ path: `test-results/${layer.file}.png`, fullPage: false });
  57  |       }
  58  |     }
  59  |   });
  60  | 
  61  |   test('processes papers via API and shows results', async ({ request }) => {
  62  |     // Create a draft
  63  |     const draftRes = await request.post(`${BASE}/api/integration/papers/draft`, {
  64  |       data: { topic: 'cannabinoid extraction optimization using ethanol', strainName: 'Cherry Wine' },
  65  |     });
  66  |     expect(draftRes.status()).toBe(200);
  67  |     const { draftId } = await draftRes.json();
  68  | 
  69  |     // Generate paper
  70  |     const genRes = await request.post(`${BASE}/api/integration/papers/generate`, {
  71  |       data: { draftId },
  72  |     });
  73  |     expect(genRes.status()).toBe(200);
  74  |     const paper = await genRes.json();
  75  |     expect(paper.success).toBe(true);
  76  |     expect(paper.paper.sections).toHaveLength(6);
  77  | 
  78  |     // Generate LaTeX
  79  |     const latexRes = await request.post(`${BASE}/api/integration/papers/generate`, {
  80  |       data: { draftId, format: 'latex' },
  81  |     });
  82  |     expect(latexRes.status()).toBe(200);
  83  |     const latex = await latexRes.json();
  84  |     expect(latex.output).toContain('\\begin{document}');
  85  | 
  86  |     // Generate Markdown
  87  |     const mdRes = await request.post(`${BASE}/api/integration/papers/generate`, {
  88  |       data: { draftId, format: 'markdown' },
  89  |     });
  90  |     expect(mdRes.status()).toBe(200);
  91  |     const md = await mdRes.json();
  92  |     expect(md.output).toContain('# ');
  93  | 
  94  |     // Cleanup
  95  |     await request.delete(`${BASE}/api/integration/papers/draft/${draftId}`);
  96  |   });
  97  | 
  98  |   test('full research pipeline runs end-to-end', async ({ request }) => {
  99  |     const res = await request.post(`${BASE}/api/integration/research/start`, {
  100 |       data: { topic: 'terpene profiles in cannabis sativa', strainName: 'Blue Dream' },
  101 |     });
  102 |     expect(res.status()).toBe(200);
  103 |     const body = await res.json();
  104 |     expect(body.success).toBe(true);
  105 |     expect(body.paper.sections).toHaveLength(6);
  106 |     expect(body.paper.title).toContain('terpene');
  107 |     expect(body.paper.title).toContain('Blue Dream');
  108 |     expect(body.markdown).toContain('## Abstract');
```