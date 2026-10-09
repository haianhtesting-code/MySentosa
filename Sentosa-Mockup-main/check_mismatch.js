const fs = require('fs');

const path = 'src/app/nops/new/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let spanStack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = [...line.matchAll(/<span(\s|>)/g)];
  for (let match of opens) {
    spanStack.push(i + 1);
  }
  const closes = [...line.matchAll(/<\/span>/g)];
  for (let match of closes) {
    if (spanStack.length > 0) {
      spanStack.pop();
    } else {
      console.log(`Extra </span> at line ${i + 1}`);
    }
  }
}
console.log('Unclosed <span> lines:', spanStack);

let divStack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // need to exclude self-closing tags if any? <div> is never self-closing usually, but let's be careful
  // actually, let's just use regex for <div> and </div>
  const opens = [...line.matchAll(/<div(\s|>)/g)];
  for (let match of opens) {
    divStack.push(i + 1);
  }
  const closes = [...line.matchAll(/<\/div>/g)];
  for (let match of closes) {
    if (divStack.length > 0) {
      divStack.pop();
    } else {
      console.log(`Extra </div> at line ${i + 1}`);
    }
  }
}
console.log('Unclosed <div> lines:', divStack);
