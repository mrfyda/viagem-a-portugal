# /// script
# requires-python = ">=3.9"
# ///
"""Generate a local HTML caption helper for a journey post. It lists every
photo in the post (in display order, grouped by day/place) with a caption box,
so the author can look at each image and type what it shows. The agent never
opens the images. Part of the draft-journey-from-memos skill.

Workflow: build_caption_helper.py -> open the HTML, fill captions, Export ->
captions.json -> apply_captions.py.

Usage (from repo root):
  python3 tools/journey-loader/build_caption_helper.py \
      --post apps/blog/_posts/<date>-viagem-a-portugal-<roman>.markdown \
      --out ~/Desktop/viagem-N-captions.html
"""
import argparse
import json
import os
import re

ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("--post", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--base-url", default="http://127.0.0.1:4000/viagem-a-portugal",
                help="dev-server base where /assets resolves")
args = ap.parse_args()

repo = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
post = os.path.expanduser(args.post)

day = place = None
prefix = None
photos = []
img_re = re.compile(r"/assets/(?P<prefix>[^/]+)/(?P<fn>[a-z0-9-]+\.avif)")
for line in open(post, encoding="utf-8"):
    s = line.strip()
    if s.startswith("## "):
        day = s[3:].split("—")[0].strip()
        place = None
    elif s.startswith("### "):
        place = s[4:].strip()
    if "<img" in line:  # only body figures, not front-matter image refs
        m = img_re.search(line)
        if m:
            prefix = m.group("prefix")
            photos.append({"day": day or "", "place": place or day or "", "file": m.group("fn")})

if not photos:
    raise SystemExit("No /assets/*/*.avif figures found in the post.")

base = f"{args.base_url.rstrip('/')}/assets/{prefix}/"
fallback = f"file://{repo}/apps/blog/assets/{prefix}/"

TEMPLATE = r"""<title>Legendas das fotos</title>
<style>
  :root { --bg:#faf8f4; --card:#fff; --ink:#2b2b28; --muted:#8a857c; --accent:#7a5c3e; --line:#e7e1d6; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  header { position:sticky; top:0; z-index:5; background:var(--bg); border-bottom:1px solid var(--line); padding:14px 20px; }
  header h1 { margin:0; font-size:18px; }
  header p { margin:4px 0 0; color:var(--muted); font-size:13px; }
  .wrap { max-width:1100px; margin:0 auto; padding:20px; }
  h2.day { font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:var(--accent); border-bottom:1px solid var(--line); padding-bottom:6px; margin:34px 0 16px; }
  h3.place { font-size:15px; margin:18px 0 10px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:18px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; display:flex; flex-direction:column; }
  .card img { width:100%; aspect-ratio:4/3; object-fit:cover; background:#eee; display:block; }
  .card .meta { padding:8px 10px 10px; }
  .card .fn { font-size:11px; color:var(--muted); font-family:ui-monospace,Menlo,monospace; margin-bottom:6px; }
  .card input { width:100%; padding:7px 8px; border:1px solid var(--line); border-radius:6px; font:inherit; font-size:14px; }
  .card input:focus { outline:2px solid var(--accent); border-color:var(--accent); }
  .card input.changed { border-color:var(--accent); background:#fcfaf6; }
  footer { position:sticky; bottom:0; background:var(--card); border-top:1px solid var(--line); padding:12px 20px; display:flex; gap:10px; align-items:center; }
  footer .count { color:var(--muted); font-size:13px; margin-right:auto; }
  button { font:inherit; font-size:14px; padding:8px 14px; border-radius:8px; border:1px solid var(--accent); background:var(--accent); color:#fff; cursor:pointer; }
  button.ghost { background:transparent; color:var(--accent); }
  textarea { width:100%; max-width:1100px; height:160px; margin:14px auto 0; display:block; font-family:ui-monospace,Menlo,monospace; font-size:12px; padding:10px; border:1px solid var(--line); border-radius:8px; }
</style>
<header>
  <h1>Legendas das fotos</h1>
  <p>Escreve o que cada foto mostra (curto). Deixa igual ao nome do lugar para não mudar. No fim, carrega em Exportar e envia o captions.json.</p>
</header>
<div class="wrap" id="wrap"></div>
<footer>
  <span class="count" id="count"></span>
  <button class="ghost" onclick="copyJSON()">Copiar JSON</button>
  <button onclick="downloadJSON()">Exportar (captions.json)</button>
</footer>
<div class="wrap"><textarea id="out" placeholder="O JSON aparece aqui ao exportar…" readonly></textarea></div>
<script>
const BASE = "__BASE__";
const FALLBACK = "__FALLBACK__";
const PHOTOS = __PHOTOS__;
const wrap = document.getElementById("wrap");
let lastDay = "", lastPlace = "";
for (const p of PHOTOS) {
  if (p.day !== lastDay) { const h=document.createElement("h2"); h.className="day"; h.textContent=p.day; wrap.appendChild(h); lastDay=p.day; lastPlace=""; }
  if (p.place !== lastPlace) {
    const h=document.createElement("h3"); h.className="place"; h.textContent=p.place; wrap.appendChild(h); lastPlace=p.place;
    const g=document.createElement("div"); g.className="grid"; wrap.appendChild(g);
  }
  const grid=[...wrap.querySelectorAll(".grid")].pop();
  const card=document.createElement("div"); card.className="card";
  const img=document.createElement("img"); img.loading="lazy"; img.src=BASE+p.file;
  img.onerror=function(){ if(!this.dataset.fb){ this.dataset.fb=1; this.src=FALLBACK+p.file; } };
  const meta=document.createElement("div"); meta.className="meta";
  const fn=document.createElement("div"); fn.className="fn"; fn.textContent=p.file;
  const inp=document.createElement("input"); inp.value=p.place; inp.dataset.file=p.file; inp.dataset.place=p.place;
  inp.addEventListener("input",()=>{ inp.classList.toggle("changed", inp.value.trim()!==p.place); updateCount(); });
  meta.appendChild(fn); meta.appendChild(inp); card.appendChild(img); card.appendChild(meta); grid.appendChild(card);
}
function collect(){ const o={}; document.querySelectorAll("input[data-file]").forEach(i=>{o[i.dataset.file]=i.value.trim();}); return o; }
function updateCount(){ const a=[...document.querySelectorAll("input[data-file]")]; const c=a.filter(i=>i.value.trim()!==i.dataset.place).length; document.getElementById("count").textContent=c+" de "+a.length+" legendas alteradas"; }
function downloadJSON(){ const j=JSON.stringify(collect(),null,2); document.getElementById("out").value=j; const b=new Blob([j],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="captions.json"; a.click(); }
function copyJSON(){ const j=JSON.stringify(collect(),null,2); document.getElementById("out").value=j; navigator.clipboard.writeText(j); }
updateCount();
</script>
"""

html = (TEMPLATE
        .replace("__BASE__", base)
        .replace("__FALLBACK__", fallback)
        .replace("__PHOTOS__", json.dumps(photos, ensure_ascii=False)))

out = os.path.expanduser(args.out)
open(out, "w", encoding="utf-8").write(html)
print(f"Wrote {out}  ({len(photos)} photos, prefix '{prefix}')")
print(f"Open it, caption the photos, Export -> captions.json, then run apply_captions.py.")
