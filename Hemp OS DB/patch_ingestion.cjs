const fs = require('fs');

let content = fs.readFileSync('server/ingestionEngine.ts', 'utf8');

// Add imports
content = content.replace(
  `import fs from 'fs';`,
  `import fs from 'fs';\nimport pdfParse from 'pdf-parse';\nimport { parse as parseCsv } from 'csv-parse/sync';`
);

// Replace content reading block
const oldBlock = `      // Read file content
      let content = '';
      if (fs.existsSync(item.filePath)) {
        content = fs.readFileSync(item.filePath, 'utf8');
      } else {`;

const newBlock = `      // Read file content (Advanced Parsing)
      let content = '';
      if (fs.existsSync(item.filePath)) {
        if (item.fileType === 'pdf') {
          try {
            const dataBuffer = fs.readFileSync(item.filePath);
            const pdfData = await pdfParse(dataBuffer);
            content = pdfData.text;
            this.addLog('info', \`PDF Parsed\`, \`Extracted \${content.length} chars from PDF.\`);
          } catch(e: any) {
            this.addLog('error', 'PDF Parse failed', e.message);
          }
        } else if (item.fileType === 'csv') {
          try {
            const rawCsv = fs.readFileSync(item.filePath, 'utf8');
            const records = parseCsv(rawCsv, { columns: true, skip_empty_lines: true });
            content = JSON.stringify(records, null, 2);
            this.addLog('info', \`CSV Parsed\`, \`Extracted \${records.length} rows.\`);
          } catch(e: any) {
             this.addLog('error', 'CSV Parse failed', e.message);
          }
        } else {
          content = fs.readFileSync(item.filePath, 'utf8');
        }
      } else {`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('server/ingestionEngine.ts', content);
