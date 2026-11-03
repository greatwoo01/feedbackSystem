// 每周快照：把 4 张表导出成 JSON，保留最近 8 份
// 用法：pnpm backup（读取 .dev.vars 中的 Supabase 凭证）
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';

function readDevVars(path = '.dev.vars') {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const vars = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    vars[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return vars;
}

const vars = readDevVars();
const url = vars.SUPABASE_URL;
const key = vars.SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('.dev.vars 缺少 SUPABASE_URL / SUPABASE_ANON_KEY');
}

const tables = ['teachers', 'classes', 'students', 'feedbacks'];
const snapshot = { created_at: new Date().toISOString(), tables: {} };

for (const table of tables) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
  snapshot.tables[table] = await res.json();
}

mkdirSync('backups', { recursive: true });
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
// 用本地日期命名（toISOString 是 UTC，凌晨执行会写成前一天）
const name = `backups/${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
writeFileSync(name, JSON.stringify(snapshot, null, 2), 'utf8');

console.log(`已写入 ${name}`);
for (const table of tables) console.log(`  ${table}: ${snapshot.tables[table].length} 行`);

const files = readdirSync('backups').filter((f) => f.endsWith('.json')).sort();
while (files.length > 8) unlinkSync(`backups/${files.shift()}`);
