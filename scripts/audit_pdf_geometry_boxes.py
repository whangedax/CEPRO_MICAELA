"""Read-only geometry inventory for canonical CETPRO PDFs.

Prints words and vector lines in PDF top-origin coordinates. It never writes a
PDF and is intentionally unsuitable for inferring semantic bindings by itself.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES"


def rounded(value: float) -> float:
    return round(float(value), 2)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", required=True, type=int)
    parser.add_argument("--page", type=int, default=0)
    parser.add_argument("--words-only", action="store_true")
    args = parser.parse_args()
    candidates = sorted(PDF_DIR.glob(f"{args.id:02d}_*.pdf"))
    if len(candidates) != 1:
        raise SystemExit(f"Expected one canonical PDF for {args.id:02d}, found {len(candidates)}")
    with pdfplumber.open(candidates[0]) as pdf:
        page = pdf.pages[args.page]
        output = {
            "file": candidates[0].name,
            "page": args.page + 1,
            "width": rounded(page.width),
            "height": rounded(page.height),
            "words": [
                {
                    "text": word["text"],
                    "x0": rounded(word["x0"]),
                    "x1": rounded(word["x1"]),
                    "top": rounded(word["top"]),
                    "bottom": rounded(word["bottom"]),
                }
                for word in page.extract_words(use_text_flow=False, keep_blank_chars=False)
            ],
        }
        if not args.words_only:
            output["lines"] = [
                {
                    "x0": rounded(line["x0"]),
                    "x1": rounded(line["x1"]),
                    "top": rounded(line["top"]),
                    "bottom": rounded(line["bottom"]),
                    "orientation": "H" if abs(line["top"] - line["bottom"]) < 0.05 else "V",
                }
                for line in page.lines
            ]
            output["rects"] = [
                {
                    "x0": rounded(rect["x0"]),
                    "x1": rounded(rect["x1"]),
                    "top": rounded(rect["top"]),
                    "bottom": rounded(rect["bottom"]),
                }
                for rect in page.rects
            ]
        print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
