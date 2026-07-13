// Local-only data manager dashboard. Run: npm run dm:dashboard
// Opens a review UI at http://localhost:4321 to inspect, validate, edit, and
// publish the dataset. It binds to localhost and is never deployed. The Firebase
// service-account key stays on your machine.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import express from 'express';
import { validateDataset, datasetStats, publishDataset, loadSeed, savePoliticians } from './publish';
import { isFirestoreConfigured } from '../../lib/firebase-admin';

const app = express();
app.use(express.json());
const PORT = 4321;

app.get('/api/data', (_req, res) => {
  const { politicians } = loadSeed();
  const { issues } = validateDataset();
  const byId = new Map<string, typeof issues>();
  for (const i of issues) byId.set(i.politicianId, [...(byId.get(i.politicianId) || []), i]);
  res.json({
    firestoreConfigured: isFirestoreConfigured(),
    stats: datasetStats(),
    politicians: politicians.map((p) => ({
      id: p.id,
      name: p.name,
      party: p.party,
      state: p.state,
      constituency: p.constituencyName,
      minister: p.is_minister,
      factCount: p.facts.length,
      metricCount: Object.keys(p.metrics || {}).length,
      issues: byId.get(p.id) || [],
    })),
  });
});

app.post('/api/publish', async (_req, res) => {
  try {
    const result = await publishDataset();
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: String(e?.message || e) });
  }
});

app.post('/api/fact', (req, res) => {
  const { politicianId, field_type, value, source_url, source_name } = req.body || {};
  if (!politicianId || !field_type || !value || !source_url) {
    return res.status(400).json({ ok: false, error: 'politicianId, field_type, value and source_url are required (no citation, no claim)' });
  }
  const { politicians } = loadSeed();
  const p = politicians.find((x) => x.id === politicianId);
  if (!p) return res.status(404).json({ ok: false, error: 'politician not found' });
  p.facts.push({
    field_type,
    value,
    source_url,
    source_name: source_name || source_url,
    retrieved_date: new Date().toISOString().slice(0, 10),
  });
  savePoliticians(politicians);
  res.json({ ok: true });
});

app.get('/', (_req, res) => res.type('html').send(PAGE));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Data manager dashboard → http://localhost:${PORT}\n`);
  console.log(`  Firestore configured: ${isFirestoreConfigured() ? 'yes' : 'NO (add creds to .env.local to publish)'}\n`);
});

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RYP Data Manager</title>
<style>
  :root{--brand:#3949ab}
  *{box-sizing:border-box} body{font-family:system-ui,sans-serif;margin:0;background:#f8fafc;color:#111827}
  header{background:#fff;border-bottom:1px solid #e5e7eb;padding:14px 20px;display:flex;align-items:center;gap:12px;position:sticky;top:0}
  h1{font-size:18px;margin:0} .wrap{max-width:1000px;margin:0 auto;padding:20px}
  .badge{display:inline-block;border-radius:999px;padding:2px 8px;font-size:12px;background:#eef1fb;color:#1a237e}
  .err{background:#fde8e8;color:#9b1c1c}.warn{background:#fef3c7;color:#7a6a12}.ok{background:#def7ec;color:#03543f}
  button{background:var(--brand);color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer}
  button.sec{background:#fff;color:var(--brand);border:1px solid var(--brand)}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px} th{background:#f1f5f9;font-size:12px;text-transform:uppercase;color:#6b7280}
  .stat{display:inline-block;margin-right:18px} .stat b{font-size:20px;display:block}
  form{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-top:20px;display:grid;gap:10px;grid-template-columns:1fr 1fr}
  form h3{grid-column:1/3;margin:0} input,select{padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;width:100%}
  label{font-size:12px;color:#6b7280;display:block;margin-bottom:3px}
  #msg{margin-left:auto;font-size:14px}
</style></head><body>
<header><span class="badge">LOCAL</span><h1>RankYourPolitician — Data Manager</h1>
  <span id="fs"></span><span id="msg"></span>
  <button class="sec" onclick="load()">Refresh</button>
  <button onclick="publish()">Publish to Firestore</button>
</header>
<div class="wrap">
  <div id="stats"></div>
  <table><thead><tr><th>Name</th><th>Party</th><th>Area</th><th>Facts</th><th>Metrics</th><th>Status</th></tr></thead><tbody id="rows"></tbody></table>
  <form onsubmit="addFact(event)">
    <h3>Add a sourced fact (no citation, no claim)</h3>
    <div><label>Politician</label><select id="f_pid"></select></div>
    <div><label>Field type</label><input id="f_field" placeholder="e.g. mplads_utilisation_pct" required></div>
    <div><label>Value</label><input id="f_value" placeholder="e.g. 78%" required></div>
    <div><label>Source name</label><input id="f_sname" placeholder="e.g. Sansad.in"></div>
    <div style="grid-column:1/3"><label>Source URL (required)</label><input id="f_surl" type="url" placeholder="https://…" required></div>
    <div style="grid-column:1/3"><button type="submit">Add fact</button></div>
  </form>
</div>
<script>
async function load(){
  const d = await (await fetch('/api/data')).json();
  document.getElementById('fs').innerHTML = d.firestoreConfigured?'<span class="badge ok">Firestore ready</span>':'<span class="badge warn">No Firestore creds</span>';
  const s=d.stats; document.getElementById('stats').innerHTML =
    ['politicians','constituencies','states','facts','ministers'].map(k=>'<span class="stat"><b>'+s[k]+'</b>'+k+'</span>').join('');
  document.getElementById('rows').innerHTML = d.politicians.map(p=>{
    const errs=p.issues.filter(i=>i.severity==='error').length, warns=p.issues.filter(i=>i.severity==='warn').length;
    const st = errs?'<span class="badge err">'+errs+' error(s)</span>':warns?'<span class="badge warn">'+warns+' warn</span>':'<span class="badge ok">ok</span>';
    return '<tr><td>'+p.name+(p.minister?' <span class="badge">min</span>':'')+'</td><td>'+p.party+'</td><td>'+p.constituency+', '+p.state+'</td><td>'+p.factCount+'</td><td>'+p.metricCount+'</td><td>'+st+' '+(p.issues.map(i=>i.message).join('; ')||'')+'</td></tr>';
  }).join('');
  document.getElementById('f_pid').innerHTML = d.politicians.map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join('');
}
async function publish(){
  document.getElementById('msg').textContent='Publishing…';
  const r = await (await fetch('/api/publish',{method:'POST'})).json();
  document.getElementById('msg').textContent = r.ok?('✓ Published '+r.result.politicians+' politicians'):('✗ '+r.error);
}
async function addFact(e){
  e.preventDefault();
  const body={politicianId:f_pid.value,field_type:f_field.value,value:f_value.value,source_name:f_sname.value,source_url:f_surl.value};
  const r = await (await fetch('/api/fact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})).json();
  document.getElementById('msg').textContent = r.ok?'✓ Fact added':'✗ '+r.error;
  if(r.ok){e.target.reset();load();}
}
load();
</script></body></html>`;
