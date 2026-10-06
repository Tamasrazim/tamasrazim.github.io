#!/usr/bin/env python3
"""
TRILYVA 1B keyword-stream generator.

Generates a deterministic stream without loading the corpus into RAM or
storing a multi-gigabyte text file in Git. Default output is stdout.

Examples:
  python tools/generate_1b_keywords.py --count 1000000 > KEYWORDS.txt
  python tools/generate_1b_keywords.py --start 0 --count 1000000000 > KEYWORDS_1B.txt

The second command intentionally creates a huge local file. It is NOT suitable
for committing to GitHub; GitHub blocks regular files >100 MiB.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import sys

CATEGORIES = [
    "abstract","animals","arts","backgrounds","beauty","business","education",
    "food","healthcare","holidays","industrial","interiors","nature","objects",
    "outdoor","people","religion","science","symbols","sports","technology",
    "transportation","vintage","web","design",
]

SUBJECTS = """
animation artwork image graphic composition concept visual pattern texture
background surface shape form color light shadow gradient particle geometry
motif wallpaper illustration template poster banner frame border ornament icon
symbol object detail scene arrangement collection set render motion loop
transition overlay sparkle glow flare bokeh blur focus depth perspective space
prism crystal glass flower flora botanical interface dashboard navigation media
calendar chart camera phone computer code cloud server network document folder
search upload download play pause settings user profile lock heart star check
arrow cursor globe mail chat home map shop cart payment music video photo
""".split()

STYLES = """
abstract artistic balanced bold bright calm clean classic colorful contemporary
creative dark delicate digital dramatic dynamic elegant ethereal futuristic
geometric glowing graceful graphic harmonic icy luminous minimal modern natural
neon organic pastel polished premium realistic retro rustic seamless simple
smooth subtle textured translucent transparent vibrant vintage warm cinematic
luxury stylish symmetrical layered monochrome multicolor iridescent metallic
silky matte glossy crystalline sculptural fluid experimental playful serene
""".split()

CONTEXTS = """
web website app application software interface ui ux dashboard mobile desktop
online digital technology stock commercial marketing branding presentation
publishing print packaging social media business corporate education portfolio
campaign template wallpaper poster content media communication professional
creative artistic decorative seasonal festive travel lifestyle isolated centered
transparent colorful vector svg eps illustration motion graphics animation
""".split()

TEMPLATES = (
    "{category} {subject} {style}",
    "{subject} {style} {context}",
    "{category} {subject} {context}",
    "{subject} {style} {context}",
)

def build_lexicon() -> list[str]:
    words = []
    for w in itertools.chain(CATEGORIES, SUBJECTS, STYLES, CONTEXTS):
        if w not in words:
            words.append(w)
    return words

def token(index: int, words: list[str], template: str) -> str:
    # Deterministic selection; no random state and no giant in-memory corpus.
    digest = hashlib.blake2s(index.to_bytes(8, "big"), digest_size=16).digest()
    a = int.from_bytes(digest[0:4], "big")
    b = int.from_bytes(digest[4:8], "big")
    c = int.from_bytes(digest[8:12], "big")
    d = int.from_bytes(digest[12:16], "big")
    return template.format(
        category=CATEGORIES[a % len(CATEGORIES)],
        subject=words[b % len(words)],
        style=STYLES[c % len(STYLES)],
        context=CONTEXTS[d % len(CONTEXTS)],
    )

def main() -> None:
    ap = argparse.ArgumentParser(description="Stream deterministic TRILYVA keyword phrases.")
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--count", type=int, default=1_000_000)
    ap.add_argument("--sep", choices=["newline", "space"], default="newline")
    args = ap.parse_args()

    if args.start < 0 or args.count < 0:
        raise SystemExit("--start and --count must be >= 0")
    if args.start + args.count > 1_000_000_000:
        raise SystemExit("Requested range exceeds the 1,000,000,000-entry corpus")

    words = build_lexicon()
    templates = len(TEMPLATES)

    out = sys.stdout
    write_sep = "\n" if args.sep == "newline" else " "
    for n in range(args.start, args.start + args.count):
        out.write(token(n, words, TEMPLATES[n % templates]) + write_sep)

if __name__ == "__main__":
    main()
