#!/usr/bin/env python3
"""
TRILYVA — 1,000,000,000 UNIQUE keyword-token generator.

Every emitted token is unique because it contains the absolute corpus index.
The semantic prefix is selected deterministically from the keyword vocabulary;
the zero-padded decimal index is the uniqueness key.

The repository stores shard manifests, not the literal 1B corpus. A complete
1B-entry text corpus would be many gigabytes and is not suitable for GitHub.

Examples:
  python tools/generate_1b_keywords.py --count 1000000 > KEYWORDS_0001.txt
  python tools/generate_1b_keywords.py --shard 1 > KEYWORDS_0001.txt
  python tools/generate_1b_keywords.py --start 999000000 --count 1000000 > KEYWORDS_1000.txt
"""

from __future__ import annotations
import argparse
import sys

CATEGORIES = """
abstract animals arts background beauty business education food healthcare
holidays industrial interiors nature objects outdoor people religion science
symbols sports technology transportation vintage web design
""".split()

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
publishing print packaging socialmedia business corporate education portfolio
campaign template wallpaper poster content media communication professional
creative artistic decorative seasonal festive travel lifestyle isolated centered
transparent colorful vector svg eps illustration motion graphics animation
""".split()

STEMS = []
for word in CATEGORIES + SUBJECTS + STYLES + CONTEXTS:
    if word not in STEMS:
        STEMS.append(word)

TOTAL = 1_000_000_000
SHARDS = 1_000
SHARD_SIZE = 1_000_000

def unique_token(index: int) -> str:
    """Return a globally unique synthetic keyword token for 0 <= index < 1B."""
    if not 0 <= index < TOTAL:
        raise ValueError("index outside 1B corpus")
    stem = STEMS[index % len(STEMS)]
    return f"{stem}{index:010d}"

def emit(start: int, count: int) -> None:
    end = start + count
    if start < 0 or count < 0 or end > TOTAL:
        raise SystemExit("requested range must stay inside 0..999,999,999")
    out = sys.stdout
    for index in range(start, end):
        out.write(unique_token(index))
        out.write("\n")

def main() -> None:
    ap = argparse.ArgumentParser()
    group = ap.add_mutually_exclusive_group()
    group.add_argument("--shard", type=int, help="1..1000; emits exactly 1,000,000 unique tokens")
    group.add_argument("--start", type=int, help="absolute starting index")
    ap.add_argument("--count", type=int, default=1_000_000)
    args = ap.parse_args()

    if args.shard is not None:
        if not 1 <= args.shard <= SHARDS:
            raise SystemExit("--shard must be 1..1000")
        emit((args.shard - 1) * SHARD_SIZE, SHARD_SIZE)
    else:
        emit(args.start or 0, args.count)

if __name__ == "__main__":
    main()
