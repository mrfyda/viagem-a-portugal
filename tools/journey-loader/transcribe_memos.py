# /// script
# requires-python = ">=3.9"
# dependencies = ["mlx-whisper"]
# ///
"""Transcribe a journey's voice memos on-device (Apple Silicon), one file per
call. Driven by the `draft-journey-from-memos` skill.

The audio NEVER leaves the machine. Transcribes each `.m4a` separately on
purpose: the mlx_whisper CLI's multi-file mode writes every input to the same
output name (only the last survives), so we loop the Python API instead (which
also loads the model only once).

Usage (from repo root):
  uv run tools/journey-loader/transcribe_memos.py --memos DIR \
      --places "Coimbra, Figueira de Castelo Rodrigo, Foz Côa, Moncorvo, ..."

Pass --places the journey's place + detour names (from the post front matter)
so whisper spells the toponyms right.
"""
import argparse
import glob
import os
import sys

import mlx_whisper


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--memos", required=True, help="folder of .m4a voice memos")
    ap.add_argument("--out", help="output folder for .txt (default: --memos)")
    ap.add_argument("--model", default="mlx-community/whisper-large-v3-mlx")
    ap.add_argument("--language", default="pt")
    ap.add_argument("--places", default="",
                    help="comma-separated place names to prime spelling")
    ap.add_argument("--glob", default="*.m4a")
    args = ap.parse_args()

    memos = os.path.expanduser(args.memos)
    out = os.path.expanduser(args.out) if args.out else memos
    os.makedirs(out, exist_ok=True)

    files = sorted(glob.glob(os.path.join(memos, args.glob)))
    if not files:
        sys.exit(f"No files matching {args.glob} in {memos}")

    prompt = None
    if args.places:
        prompt = ("Viagem a Portugal, de José Saramago. "
                  f"Lugares visitados: {args.places.strip().rstrip('.')}.")

    for path in files:
        name = os.path.basename(path)
        print(f"Transcribing {name} ...", flush=True)
        r = mlx_whisper.transcribe(
            path, path_or_hf_repo=args.model, language=args.language,
            initial_prompt=prompt, verbose=False,
        )
        dest = os.path.join(out, os.path.splitext(name)[0] + ".txt")
        text = "\n".join(seg["text"].strip() for seg in r["segments"])
        with open(dest, "w", encoding="utf-8") as fh:
            fh.write(text + "\n")
        print(f"  -> {dest}  ({len(r['segments'])} segments)", flush=True)
    print("Done.")


if __name__ == "__main__":
    main()
