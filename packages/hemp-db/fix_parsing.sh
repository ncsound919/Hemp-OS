#!/bin/bash
# Adding imports
sed -i '4i import pdfParse from "pdf-parse";' server/ingestionEngine.ts
sed -i '4i import { parse as parseCsv } from "csv-parse/sync";' server/ingestionEngine.ts

# We need to replace the content reading part
cat << 'REPLACE' > tmp_patch.txt
      // Read file content
      let content = '';
      if (fs.existsSync(item.filePath)) {
        if (item.fileType === 'pdf') {
          const dataBuffer = fs.readFileSync(item.filePath);
          const pdfData = await pdfParse(dataBuffer);
          content = pdfData.text;
          this.addLog('info', `PDF Parsed`, `Extracted ${content.length} characters from PDF.`);
        } else if (item.fileType === 'csv') {
          const rawCsv = fs.readFileSync(item.filePath, 'utf8');
          const records = parseCsv(rawCsv, { columns: true, skip_empty_lines: true });
          content = JSON.stringify(records, null, 2);
          this.addLog('info', `CSV Parsed`, `Extracted ${records.length} rows.`);
        } else {
          content = fs.readFileSync(item.filePath, 'utf8');
        }
      } else {
REPLACE

sed -i -e '/\/\/ Read file content/,/\} else \{/c\' -e "$(cat tmp_patch.txt | sed -z 's/\n/\\n/g')" server/ingestionEngine.ts
