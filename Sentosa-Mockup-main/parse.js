const fs = require('fs');
const parser = require('@babel/parser');

const path = 'src/app/nops/new/page.tsx';
const content = fs.readFileSync(path, 'utf8');

try {
  parser.parse(content, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log('Parsed successfully');
} catch (err) {
  console.error('Parse error:', err);
}
