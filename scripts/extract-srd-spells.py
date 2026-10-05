"""Reproduce the source excerpt from the official, digest-verified SRD PDF.

Usage from the repository root: python scripts/extract-srd-spells.py SRD_CC_v5.2.1.pdf
Requires pdfplumber. Glyph matrices supply actual baselines; font bounding boxes
misplace the PDF's small caps. Reading columns in order keeps floating stat
blocks and continuation text with their owning spell.
"""
import hashlib
import json
import sys

import pdfplumber

SOURCE_SHA256 = "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87"
path = sys.argv[1]
with open(path, "rb") as source:
    if hashlib.sha256(source.read()).hexdigest() != SOURCE_SHA256:
        raise ValueError("Unexpected source PDF")

pages = []
with pdfplumber.open(path) as pdf:
    for index in range(106, 175):
        page = pdf.pages[index]
        output = []
        for left, right in [(35, 297), (297, 560)]:
            lines = {}
            for char in page.chars:
                x, y = char["matrix"][4:6]
                if left <= x < right and 40 < y < 741:
                    lines.setdefault(round(y), []).append(char)
            for baseline, chars in sorted(lines.items(), reverse=True):
                chars.sort(key=lambda char: char["matrix"][4])
                text, previous_end = "", None
                for char in chars:
                    x = char["matrix"][4]
                    if previous_end is not None and x - previous_end > 1.6:
                        text += " "
                    text += char["text"]
                    previous_end = x + (char["x1"] - char["x0"])
                output.append(text)
        pages.append({"page": index + 1, "text": "\n".join(output) + "\n"})

with open("src/data/srd/spell-source-5.2.1.json", "w") as output:
    output.write(json.dumps(pages, ensure_ascii=False, indent=2) + "\n")
