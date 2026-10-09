const fs = require('fs');

const path = 'src/app/nops/new/page.tsx';
const content = fs.readFileSync(path, 'utf8');

const tags = ['div', 'span', 'label', 'button', 'p', 'h1', 'ul', 'li', 'strong', 'textarea', 'table', 'thead', 'tbody', 'tr', 'th', 'td'];

for (const tag of tags) {
  const opens = [...content.matchAll(new RegExp(`<${tag}(\\s|>)`, 'g'))].length;
  const closes = [...content.matchAll(new RegExp(`</${tag}>`, 'g'))].length;
  if (opens !== closes) {
    console.log(`Mismatch in <${tag}>: opens=${opens}, closes=${closes}`);
  }
}
