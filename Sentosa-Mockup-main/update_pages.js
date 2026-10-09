const fs = require('fs');

function replaceInFile(path, modifier) {
  let content = fs.readFileSync(path, 'utf8');
  content = modifier(content);
  fs.writeFileSync(path, content, 'utf8');
}

// 1. src/app/nops/page.tsx
replaceInFile('src/app/nops/page.tsx', (content) => {
  content = content.replace('import {', 'import {\n  fetchNopsFromMongo,');
  content = content.replace(
    '  useEffect(() => {\n    setNops(loadStoredNops());\n  }, []);',
    `  useEffect(() => {
    fetchNopsFromMongo().then(setNops);
  }, []);`
  );
  return content;
});

// 2. src/app/nops/[...id]/page.tsx
replaceInFile('src/app/nops/[...id]/page.tsx', (content) => {
  content = content.replace('import {', 'import {\n  fetchNopsFromMongo,');
  content = content.replace(
    '  useEffect(() => {\n    const all = loadStoredNops();\n    setNops(all);',
    `  useEffect(() => {
    fetchNopsFromMongo().then(all => {
      setNops(all);`
  );
  // close the bracket for then
  content = content.replace(
    '    setLoaded(true);\n  }, [nopId]);',
    '    setLoaded(true);\n    });\n  }, [nopId]);'
  );
  return content;
});

// 3. src/app/nops/new/page.tsx
replaceInFile('src/app/nops/new/page.tsx', (content) => {
  content = content.replace('import {', 'import {\n  fetchNopsFromMongo,');
  content = content.replace(
    '  useEffect(() => {\n    const loaded = loadStoredNops();\n    setNops(loaded);',
    `  useEffect(() => {
    fetchNopsFromMongo().then(loaded => {
      setNops(loaded);`
  );
  content = content.replace(
    '    setLocations(locationResponse);\n  }, [searchParams]);',
    '    setLocations(locationResponse);\n    });\n  }, [searchParams]);'
  );
  return content;
});

// 4. src/app/admin/nop-config/page.tsx
replaceInFile('src/app/admin/nop-config/page.tsx', (content) => {
  content = content.replace('import {', 'import {\n  fetchNopsFromMongo,');
  content = content.replace(
    '  useEffect(() => {\n    setNops(loadStoredNops());',
    `  useEffect(() => {
    fetchNopsFromMongo().then(setNops);`
  );
  // Also we need to check if we can fetch blackouts and routing from mongo! But for now just fix nops.
  return content;
});

console.log('Updated page components to use fetchNopsFromMongo');
