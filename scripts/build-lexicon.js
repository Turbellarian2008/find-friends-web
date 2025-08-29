// Build a unified sensitive lexicon JSON from the cloned repository
// Input: ../Sensitive-lexicon/ (txt lists under Vocabulary/ and ThirdPartyCompatibleFormats/*)
// Output: ./dist/lexicon/all.json (JSON array)

import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repoDir = path.resolve(projectRoot, 'Sensitive-lexicon');
const outDir = path.resolve(projectRoot, 'dist/lexicon');
const outFile = path.resolve(outDir, 'all.json');

function normalizeTerm(s) {
  if (!s) return '';
  // trim, remove BOM, lower-case; you may enhance normalization as needed
  return s.replace(/^\uFEFF/, '').trim().toLowerCase();
}

function collectTxtFiles(root) {
  const results = [];
  function walk(dir) {
    const items = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
    for (const it of items) {
      const p = path.join(dir, it.name);
      if (it.isDirectory()) walk(p);
      else if (it.isFile() && p.toLowerCase().endsWith('.txt')) results.push(p);
    }
  }
  walk(root);
  return results;
}

function readLexiconFromTxt(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const out = [];
  for (let line of lines) {
    if (!line) continue;
    // strip comments (// ... or # ...), tabs, commas
    line = line.replace(/\t/g, ' ').replace(/#.*/, '').replace(/\/\/.*$/, '');
    const term = normalizeTerm(line);
    if (!term) continue;
    // filter trivially short terms to reduce false positives (optional)
    // if (term.length <= 1) continue;
    out.push(term);
  }
  return out;
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function main() {
  if (!fs.existsSync(repoDir)) {
    console.error(`Repo folder not found: ${repoDir}`);
    process.exit(1);
  }
  const vocabDir = path.join(repoDir, 'Vocabulary');
  const thirdPartyDir = path.join(repoDir, 'ThirdPartyCompatibleFormats');
  const files = [
    ...collectTxtFiles(vocabDir),
    ...collectTxtFiles(thirdPartyDir)
  ];
  if (files.length === 0) {
    console.error('No .txt lexicon files found.');
    process.exit(1);
  }
  let terms = [];
  for (const f of files) {
    try {
      const arr = readLexiconFromTxt(f);
      terms.push(...arr);
    } catch (e) {
      console.warn(`Skip ${f}: ${e.message}`);
    }
  }
  terms = unique(terms);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(terms, null, 2), 'utf8');
  console.log(`Lexicon built: ${outFile}`);
  console.log(`Total terms: ${terms.length}`);
}

main();
