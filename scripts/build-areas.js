// Build areas.json from areas.sql
// Output structure: { [province]: { [city]: [districts...] } }
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = resolve(__dirname, '..');
const sqlPath = resolve(root, 'areas.sql');
const outDir = resolve(root, 'dist');
const outPath = resolve(outDir, 'areas.json');

function parseSql(sql) {
  // Extract tuples like: (id, parent_id, 'name') on INSERT lines
  const tuples = [];
  const insertLines = sql.split(/\n/).filter(l => l.startsWith('(') || l.trim().startsWith('('));
  const tupleRe = /\((\d+)\s*,\s*(\d+)\s*,\s*'([^']*)'\)/g;
  for (const line of insertLines) {
    let m;
    while ((m = tupleRe.exec(line)) !== null) {
      tuples.push({ id: Number(m[1]), parent: Number(m[2]), name: m[3] });
    }
  }
  return tuples;
}

function buildTree(tuples) {
  const byId = new Map();
  for (const t of tuples) byId.set(t.id, { id: t.id, parent: t.parent, name: t.name, children: [] });
  for (const t of tuples) {
    if (t.parent !== 0) {
      const p = byId.get(t.parent);
      if (p) p.children.push(byId.get(t.id));
    }
  }
  // provinces are parent==0
  const provinces = tuples.filter(t => t.parent === 0).map(t => byId.get(t.id));
  return provinces;
}

function toRegionMap(provinces) {
  const out = {};
  for (const prov of provinces) {
    const provName = prov.name;
    const cities = prov.children || [];
    const cityMap = {};
    for (const city of cities) {
      const areas = (city.children || []).map(a => a.name);
      cityMap[city.name] = areas;
    }
    out[provName] = cityMap;
  }
  return out;
}

function main() {
  const sql = readFileSync(sqlPath, 'utf8');
  const tuples = parseSql(sql);
  if (!tuples.length) {
    console.error('No tuples parsed from areas.sql');
    process.exit(1);
  }
  const provinces = buildTree(tuples);
  const regions = toRegionMap(provinces);
  const json = JSON.stringify(regions, null, 0);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, json, 'utf8');
  console.log(`Wrote ${outPath} with ${Object.keys(regions).length} provinces`);
}

main();
