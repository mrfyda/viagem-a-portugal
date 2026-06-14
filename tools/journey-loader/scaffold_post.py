#!/usr/bin/env python3
"""Stage 7 — generate the day-by-day Portuguese blog post scaffold: front matter
(places validated downstream by blog-sync, featured_photos = sharpest per town),
Saramago epigraphs from quotes.json, and ⟨…⟩ placeholders for your prose. The
`detours:` block is left commented for you to fill after the detour review.
Run after export_web.py.

    python3 scaffold_post.py --photos DIR --journey N [--date YYYY-MM-DD]
"""
import argparse
import json
import sys
from collections import OrderedDict, defaultdict
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _common as C  # noqa: E402

ROMAN = {1: "i", 2: "ii", 3: "iii", 4: "iv", 5: "v", 6: "vi"}
WD = {0: "segunda-feira", 1: "terça-feira", 2: "quarta-feira", 3: "quinta-feira",
      4: "sexta-feira", 5: "sábado", 6: "domingo"}
MON = {1: "janeiro", 2: "fevereiro", 3: "março", 4: "abril", 5: "maio", 6: "junho",
       7: "julho", 8: "agosto", 9: "setembro", 10: "outubro", 11: "novembro", 12: "dezembro"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--photos", required=True, type=Path)
    ap.add_argument("--journey", required=True, type=int)
    ap.add_argument("--date", help="post date YYYY-MM-DD (default: last photo day)")
    args = ap.parse_args()
    jd = C.journey_dir(args.photos)
    meta = {r["file"]: r for r in json.loads((jd / "metadata.json").read_text(encoding="utf-8"))}
    manifest = json.loads((jd / "manifest.json").read_text(encoding="utf-8"))
    quotes = json.loads(C.QUOTES.read_text(encoding="utf-8"))
    n = args.journey
    roman = ROMAN.get(n, str(n))
    pre = f"viagem-{n}"

    by_day_town = defaultdict(lambda: defaultdict(list))
    for m in manifest:
        by_day_town[m["date"]][m["town"]].append(m)
    for d in by_day_town:
        for t in by_day_town[d]:
            by_day_town[d][t].sort(key=lambda x: -(x["sharp"] or 0))

    day_towns = defaultdict(OrderedDict)
    for r in sorted(meta.values(), key=lambda r: r["datetime_utc"] or ""):
        if r["is_video"] or not r["datetime_utc"] or not r["town"]:
            continue
        day = r["datetime_utc"][:10]
        day_towns[day][r["town"]] = day_towns[day].get(r["town"], 0) + 1
    all_days = sorted(day_towns)
    if not all_days:
        print("no dated photos — nothing to scaffold")
        return

    best = {}
    for m in manifest:
        if m["town"] not in best or (m["sharp"] or 0) > (best[m["town"]]["sharp"] or 0):
            best[m["town"]] = m
    places = []
    for r in sorted(meta.values(), key=lambda r: r["datetime_utc"] or ""):
        if r["town"] in best and r["town"] not in places:
            places.append(r["town"])
    qf = quotes.get
    date = args.date or all_days[-1]

    fm = ["---", "layout: post",
          f'title: "Viagem a Portugal {roman.upper()} — ⟨título a confirmar⟩"',
          f"date: {date} 18:00:00 +0000", f"visit_date: {all_days[0]}", "lang: pt",
          'description: "⟨descrição curta para SEO — a escrever⟩"', "places:"]
    fm += [f"  - {t}" for t in places]
    fm.append("featured_photos:")
    fm += [f"  {t}: /assets/{pre}/{best[t]['webfile']}" for t in places]
    fm += ["# Detours (off-book places, ADR 0010) — add after `review_detours.py`:",
           "# detours:",
           "#   - name: <place>", "#     lat: <lat>", "#     lon: <lon>",
           '#     note: "<context> — fora da viagem de Saramago."',
           f"#     image: /assets/{pre}/<file>.avif", "---"]

    b = ["_⟨introdução — a escrever⟩_", "", f"_{len(all_days)} dias. _⟨ajustar⟩_", ""]
    seen = set()
    for i, day in enumerate(all_days, 1):
        dt = datetime.strptime(day, "%Y-%m-%d")
        b += [f"## Dia {i} — {dt.day} de {MON[dt.month]}, {WD[dt.weekday()]}", "",
              f"_Percurso do dia: {', '.join(day_towns[day].keys())}._", "",
              "_⟨notas do dia — a escrever⟩_", ""]
        for town, photos in by_day_town.get(day, {}).items():
            b += [f"### {town}", ""]
            q = qf(town)
            if q and town not in seen:
                b += [f"> «{q}»", ">", "> — José Saramago, *Viagem a Portugal*", ""]
            seen.add(town)
            for p in photos:
                b += ["<figure>",
                      f"  <img src=\"{{{{ '/assets/{pre}/{p['webfile']}' | relative_url }}}}\" alt=\"{town}\" loading=\"lazy\">",
                      f"  <figcaption>{town}</figcaption>", "</figure>", ""]
            b += ["_⟨o que ver / o que aconteceu aqui — a escrever⟩_", ""]
    b += ["## Epílogo", "", "_⟨fecho — a escrever⟩_"]

    out = C.POSTS / f"{date}-viagem-a-portugal-{roman}.markdown"
    out.write_text("\n".join(fm) + "\n\n" + "\n".join(b) + "\n", encoding="utf-8")
    epi = sum(1 for t in places if qf(t))
    print(f"wrote {out}\n  {len(all_days)} days, {len(places)} places, "
          f"{epi} epigraphs, {len(manifest)} figures")


if __name__ == "__main__":
    main()
