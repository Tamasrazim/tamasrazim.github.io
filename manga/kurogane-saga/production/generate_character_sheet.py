#!/usr/bin/env python3
"""Generate original editable SVG model art for the Kurogane Saga manga pilot.

Uses only Python's standard library. Run from the repository root:
  python manga/kurogane-saga/production/generate_character_sheet.py
"""
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path("manga/kurogane-saga/artwork/character-sheet-ren-tori.svg")
W, H = 1600, 1100
S = []

def emit(x):
    S.append(x)

def rect(x, y, w, h, fill, rx=0, stroke="none", sw=1):
    emit(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

def path(d, fill="none", stroke="none", sw=1):
    emit(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>')

def circle(x, y, r, fill, stroke="none", sw=1):
    emit(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

def ellipse(x, y, rx, ry, fill, stroke="none", sw=1):
    emit(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

def label(x, y, value, size, color="#282621", weight=400, spacing=0):
    emit(f'<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{size}" font-weight="{weight}" letter-spacing="{spacing}" fill="{color}">{escape(value)}</text>')

def head(cx, cy, k, hair, iris, mood="neutral", female=False):
    # Back hair and face silhouette
    if female:
        path(f'M {cx-42*k} {cy-24*k} Q {cx-70*k} {cy+13*k} {cx-47*k} {cy+77*k} L {cx-28*k} {cy+43*k} L {cx+28*k} {cy+45*k} L {cx+51*k} {cy+78*k} Q {cx+70*k} {cy+8*k} {cx+43*k} {cy-30*k} Z', hair, "#4c1420", 1.5*k)
        path(f'M {cx+27*k} {cy-25*k} Q {cx+76*k} {cy-56*k} {cx+90*k} {cy-8*k} Q {cx+101*k} {cy+31*k} {cx+60*k} {cy+58*k} L {cx+42*k} {cy+31*k} Q {cx+75*k} {cy+2*k} {cx+27*k} {cy-25*k} Z', hair, "#4c1420", 1.5*k)
    else:
        path(f'M {cx-40*k} {cy-26*k} Q {cx-65*k} {cy+8*k} {cx-45*k} {cy+65*k} L {cx-25*k} {cy+39*k} L {cx+24*k} {cy+42*k} L {cx+45*k} {cy+65*k} Q {cx+64*k} {cy+4*k} {cx+40*k} {cy-30*k} Z', hair, "#101115", 1.5*k)
    path(f'M {cx-39*k} {cy-25*k} Q {cx-43*k} {cy+8*k} {cx-24*k} {cy+40*k} Q {cx} {cy+62*k} {cx+24*k} {cy+40*k} Q {cx+44*k} {cy+8*k} {cx+39*k} {cy-25*k} Q {cx} {cy-54*k} {cx-39*k} {cy-25*k} Z', "#efc1a4", "#4b302a", 1.4*k)
    # Eyes and brows
    if mood == "angry":
        path(f'M {cx-29*k} {cy-7*k} L {cx-7*k} {cy-1*k} M {cx+7*k} {cy-1*k} L {cx+29*k} {cy-7*k}', stroke="#30201f", sw=2.7*k)
    else:
        path(f'M {cx-28*k} {cy-7*k} Q {cx-18*k} {cy-13*k} {cx-8*k} {cy-7*k} M {cx+8*k} {cy-7*k} Q {cx+18*k} {cy-13*k} {cx+28*k} {cy-7*k}', stroke="#30201f", sw=2*k)
    for ex in (cx-18*k, cx+18*k):
        path(f'M {ex-11*k} {cy+3*k} Q {ex} {cy-7*k} {ex+11*k} {cy+3*k} Q {ex} {cy+11*k} {ex-11*k} {cy+3*k} Z', "#fffdf8", "#30201f", 1*k)
        circle(ex, cy+3*k, 4.2*k, iris)
        circle(ex+1.2*k, cy+1.3*k, 1.3*k, "#ffffff")
    path(f'M {cx} {cy+8*k} l {-2*k} {5*k}', stroke="#ad7764", sw=1*k)
    if mood == "angry":
        path(f'M {cx-10*k} {cy+26*k} L {cx+10*k} {cy+22*k}', stroke="#6c2931", sw=2*k)
    elif mood == "grin":
        path(f'M {cx-11*k} {cy+22*k} Q {cx} {cy+37*k} {cx+12*k} {cy+22*k} Q {cx} {cy+29*k} {cx-11*k} {cy+22*k} Z', "#7c2b37", "#57202b", 1*k)
    elif mood == "flustered":
        ellipse(cx, cy+25*k, 5*k, 4*k, "#9b3041")
        path(f'M {cx-32*k} {cy+16*k} l 8 3 M {cx+25*k} {cy+19*k} l 8 -3', stroke="#d7797e", sw=1.7*k)
    else:
        path(f'M {cx-7*k} {cy+25*k} Q {cx} {cy+28*k} {cx+7*k} {cy+25*k}', stroke="#6c2931", sw=1.5*k)
    # Distinct front bangs
    if female:
        path(f'M {cx-45*k} {cy-21*k} Q {cx-54*k} {cy-63*k} {cx-14*k} {cy-63*k} Q {cx+20*k} {cy-76*k} {cx+43*k} {cy-43*k} L {cx+37*k} {cy-13*k} L {cx+23*k} {cy-36*k} L {cx+10*k} {cy-15*k} L {cx-3*k} {cy-40*k} L {cx-16*k} {cy-15*k} L {cx-30*k} {cy-34*k} L {cx-37*k} {cy-13*k} Z', hair, "#591222", 1.2*k)
        path(f'M {cx-27*k} {cy-20*k} L {cx-17*k} {cy-38*k} M {cx+6*k} {cy-18*k} L {cx+19*k} {cy-42*k} M {cx+44*k} {cy+15*k} Q {cx+51*k} {cy+55*k} {cx+37*k} {cy+86*k}', stroke="#e25568", sw=1.5*k)
        circle(cx+36*k, cy-52*k, 6*k, "#d8a64b", "#644b24", 1*k)
    else:
        path(f'M {cx-44*k} {cy-21*k} Q {cx-54*k} {cy-61*k} {cx-18*k} {cy-65*k} Q {cx+13*k} {cy-79*k} {cx+42*k} {cy-46*k} Q {cx+51*k} {cy-22*k} {cx+39*k} {cy-11*k} L {cx+25*k} {cy-34*k} L {cx+8*k} {cy-15*k} L {cx+2*k} {cy-41*k} L {cx-14*k} {cy-15*k} L {cx-22*k} {cy-38*k} L {cx-36*k} {cy-14*k} Z', hair, "#090a0c", 1.3*k)
        path(f'M {cx-36*k} {cy-14*k} L {cx-22*k} {cy-35*k} M {cx+4*k} {cy-13*k} L {cx+22*k} {cy-38*k}', stroke="#484a52", sw=1.5*k)

def character_ren(cx, top):
    # Studio shadow, legs, and practical early-story uniform
    ellipse(cx, top+565, 100, 12, "#d9d1c5")
    path(f'M {cx-40} {top+340} L {cx-5} {top+342} L {cx-20} {top+525} L {cx-53} {top+525} Z', "#24262c", "#0e0f12", 2)
    path(f'M {cx+5} {top+342} L {cx+41} {top+340} L {cx+56} {top+525} L {cx+24} {top+525} Z', "#202228", "#0e0f12", 2)
    path(f'M {cx-57} {top+519} Q {cx-37} {top+511} {cx-18} {top+525} L {cx-10} {top+539} L {cx-68} {top+539} Z', "#a78b6c", "#31261f", 1.5)
    path(f'M {cx+21} {top+525} Q {cx+41} {top+511} {cx+57} {top+524} L {cx+70} {top+539} L {cx+21} {top+539} Z', "#a78b6c", "#31261f", 1.5)
    path(f'M {cx-36} {top+98} Q {cx-64} {top+123} {cx-64} {top+211} L {cx-55} {top+366} Q {cx} {top+389} {cx+57} {top+366} L {cx+64} {top+211} Q {cx+61} {top+124} {cx+36} {top+98} L {cx+15} {top+124} L {cx-13} {top+124} Z', "#22252b", "#0a0b0e", 2)
    path(f'M {cx-34} {top+100} L {cx-4} {top+151} L {cx+16} {top+124} L {cx+36} {top+100} L {cx+13} {top+188} L {cx-11} {top+171} Z', "#343741", "#090a0d", 1.5)
    path(f'M {cx-53} {top+275} Q {cx} {top+289} {cx+54} {top+275} L {cx+53} {top+295} Q {cx} {top+309} {cx-52} {top+295} Z', "#101216", "#6a6d75", 1.3)
    path(f'M {cx-35} {top+112} Q {cx-65} {top+130} {cx-83} {top+201} L {cx-70} {top+225} L {cx-49} {top+210} L {cx-22} {top+160} Z', "#292c32", "#0a0b0e", 2)
    path(f'M {cx+35} {top+112} Q {cx+63} {top+130} {cx+81} {top+198} L {cx+68} {top+224} L {cx+48} {top+209} L {cx+23} {top+160} Z', "#292c32", "#0a0b0e", 2)
    path(f'M {cx+71} {top+216} L {cx+88} {top+208} Q {cx+99} {top+213} {cx+96} {top+226} L {cx+84} {top+240} L {cx+71} {top+234} Z', "#e8b99c", "#4b302a", 1.3)
    path(f'M {cx+91} {top+228} L {cx+146} {top+414}', stroke="#8c6749", sw=7)
    path(f'M {cx+85} {top+221} L {cx+100} {top+216} L {cx+108} {top+235}', stroke="#6a4a35", sw=4)
    head(cx, top+38, 1.0, "#17191e", "#272c36")
    # neck/collar overlap keeps head integrated with body
    rect(cx-12, top+80, 24, 31, "#e9b99c", 4, "#4b302a", 1)

def character_tori(cx, top):
    ellipse(cx, top+565, 102, 12, "#dfcec7")
    # long hair behind shoulders
    path(f'M {cx-39} {top+37} Q {cx-65} {top+70} {cx-53} {top+226} L {cx-39} {top+363} L {cx-15} {top+294} L {cx+26} {top+368} L {cx+49} {top+219} Q {cx+71} {top+65} {cx+38} {top+31} Z', "#a51d34", "#561322", 2)
    path(f'M {cx+25} {top+1} Q {cx+78} {top-39} {cx+98} {top+16} Q {cx+111} {top+62} {cx+64} {top+99} L {cx+44} {top+72} Q {cx+78} {top+37} {cx+25} {top+1} Z', "#b3223d", "#561322", 2)
    path(f'M {cx+54} {top+12} Q {cx+91} {top+30} {cx+68} {top+75}', stroke="#e3566b", sw=2)
    path(f'M {cx-42} {top+340} L {cx-4} {top+343} L {cx-20} {top+525} L {cx-52} {top+525} Z', "#211e24", "#09080c", 2)
    path(f'M {cx+4} {top+343} L {cx+42} {top+340} L {cx+55} {top+525} L {cx+24} {top+525} Z', "#211e24", "#09080c", 2)
    path(f'M {cx-57} {top+519} Q {cx-37} {top+511} {cx-18} {top+525} L {cx-10} {top+539} L {cx-67} {top+539} Z', "#8f3742", "#31171c", 1.5)
    path(f'M {cx+22} {top+525} Q {cx+42} {top+511} {cx+58} {top+524} L {cx+70} {top+539} L {cx+22} {top+539} Z', "#8f3742", "#31171c", 1.5)
    path(f'M {cx-37} {top+98} Q {cx-65} {top+123} {cx-63} {top+212} L {cx-54} {top+365} Q {cx} {top+388} {cx+55} {top+365} L {cx+64} {top+212} Q {cx+61} {top+125} {cx+36} {top+98} L {cx+15} {top+124} L {cx-14} {top+124} Z', "#a91f35", "#4e1321", 2)
    path(f'M {cx-37} {top+100} L {cx-12} {top+126} L {cx-31} {top+262} L {cx-39} {top+364} L {cx-54} {top+365} L {cx-49} {top+210} Z', "#211e24", "#0a090c", 1.5)
    path(f'M {cx+37} {top+100} L {cx+16} {top+125} L {cx+36} {top+258} L {cx+39} {top+364} L {cx+55} {top+365} L {cx+49} {top+210} Z', "#211e24", "#0a090c", 1.5)
    path(f'M {cx-36} {top+100} L {cx-4} {top+151} L {cx+17} {top+125} L {cx+37} {top+100} L {cx+14} {top+186} L {cx-13} {top+170} Z', "#29232b", "#08080a", 1.5)
    path(f'M {cx-53} {top+275} Q {cx} {top+290} {cx+55} {top+275} L {cx+54} {top+296} Q {cx} {top+310} {cx-52} {top+296} Z', "#171218", "#d0a14e", 1.3)
    path(f'M {cx-36} {top+112} Q {cx-64} {top+129} {cx-81} {top+198} L {cx-68} {top+224} L {cx-47} {top+207} L {cx-22} {top+159} Z', "#951b31", "#4e1321", 2)
    path(f'M {cx+35} {top+112} Q {cx+63} {top+129} {cx+80} {top+198} L {cx+68} {top+222} L {cx+48} {top+208} L {cx+22} {top+159} Z', "#951b31", "#4e1321", 2)
    path(f'M {cx+71} {top+215} L {cx+87} {top+207} Q {cx+98} {top+212} {cx+95} {top+226} L {cx+83} {top+240} L {cx+70} {top+234} Z', "#efbea2", "#4b302a", 1.3)
    path(f'M {cx+91} {top+228} L {cx+151} {top+415}', stroke="#67172a", sw=11)
    path(f'M {cx+91} {top+228} L {cx+151} {top+415}', stroke="#d8bdac", sw=1.7)
    path(f'M {cx+84} {top+220} L {cx+99} {top+215} L {cx+107} {top+235}', stroke="#c9a14e", sw=4)
    head(cx, top+38, 1.0, "#a51d34", "#c32440", female=True)

def expression_card(x, y, kind, mood, title, accent):
    rect(x, y, 194, 130, "#fffdf8", 12, "#d8d0c4", 1.3)
    head(x+96, y+48, .64, "#17191e" if kind=="ren" else "#a51d34", "#272c36" if kind=="ren" else "#c32440", mood, kind=="tori")
    # neck and dark/red shoulders
    rect(x+87, y+79, 18, 13, "#e9b99c", 3, "#4b302a", .7)
    path(f'M {x+33} {y+117} Q {x+45} {y+86} {x+96} {y+87} Q {x+148} {y+86} {x+161} {y+117} Z', "#22252b" if kind=="ren" else "#a51d34", "#111216" if kind=="ren" else "#561322", 1.2)
    label(x+12, y+119, title, 10, accent, 700, .5)

def main():
    emit(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
    emit('<defs><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf8f1"/><stop offset="1" stop-color="#eae2d5"/></linearGradient><pattern id="grain" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="3" cy="5" r=".6" fill="#cfc5b6" opacity=".35"/><circle cx="14" cy="13" r=".5" fill="#cfc5b6" opacity=".25"/></pattern></defs>')
    rect(0, 0, W, H, "url(#paper)")
    rect(0, 0, W, H, "url(#grain)")
    rect(20, 20, W-40, H-40, "none", 16, "#292724", 1.8)
    label(55, 65, "KUROGANE SAGA", 19, "#282522", 800, 3.6)
    label(55, 108, "CHARACTER DESIGN / 001", 35, "#1b1a18", 800, 1.1)
    label(56, 136, "PILOT VISUAL DEVELOPMENT   •   EARLY-STORY DESIGNS   •   COLOUR MASTER", 12, "#766e63", 600, 1.2)
    rect(55, 153, W-110, 2, "#c9c0b2")
    rect(55, 172, 720, 690, "#f6f2ea", 16, "#d3c8b8", 1.2)
    rect(795, 172, 750, 690, "#f7ede9", 16, "#d3b8b5", 1.2)
    label(82, 211, "REN KUROGANE", 29, "#1b1a18", 800, 1.5)
    rect(82, 224, 56, 4, "#191a1d", 2)
    label(82, 250, "AGE 16  /  F-RANK  /  VILLAGE-BORN", 12, "#625c55", 600, 1)
    label(822, 211, "TORI TSUKISHIRO", 29, "#1b1a18", 800, 1.5)
    rect(822, 224, 56, 4, "#b02039", 2)
    label(822, 250, "AGE 16  /  A-RANK  /  ROYAL PRINCESS", 12, "#80535a", 600, 1)
    circle(397, 520, 165, "#e7e1d7"); circle(397, 520, 145, "none", "#d2c9bc", 1)
    path("M 245 520 Q 397 360 549 520 Q 397 682 245 520 Z", stroke="#d1c8ba", sw=1)
    circle(1164, 520, 165, "#f1ddd9"); circle(1164, 520, 145, "none", "#d8b9b5", 1)
    path("M 1012 520 Q 1164 360 1316 520 Q 1164 682 1012 520 Z", stroke="#d8b9b5", sw=1)
    character_ren(397, 323)
    character_tori(1164, 323)
    rect(82, 825, 650, 1.5, "#d4ccbf")
    label(83, 846, "WOODEN PRACTICE SWORD  •  CHARCOAL TRAINING KIMONO", 10, "#6a635a", 600, .55)
    rect(822, 825, 690, 1.5, "#d9b8b4")
    label(823, 846, "CRIMSON / BLACK COMBAT UNIFORM  •  ROYAL KATANA", 10, "#80535a", 600, .55)
    label(55, 900, "EXPRESSION RANGE", 13, "#49433c", 800, 2)
    label(795, 900, "EXPRESSION RANGE", 13, "#6e343d", 800, 2)
    expression_card(55, 918, "ren", "neutral", "DEFAULT", "#25272c")
    expression_card(258, 918, "ren", "grin", "IDIOTIC GRIN", "#25272c")
    expression_card(461, 918, "ren", "angry", "FOCUSED / ANGRY", "#25272c")
    expression_card(795, 918, "tori", "neutral", "ROYAL GLARE", "#a91f35")
    expression_card(998, 918, "tori", "angry", "EXPLOSIVE ANGER", "#a91f35")
    expression_card(1201, 918, "tori", "flustered", "FLUSTERED DENIAL", "#a91f35")
    label(55, 1070, "ORIGINAL PYTHON-GENERATED VECTOR ART  •  EDITABLE SVG SOURCE", 10, "#7b7368", 600, .7)
    label(1452, 1070, "K / 001", 10, "#7b7368", 700, .8)
    emit("</svg>")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(S), encoding="utf-8")
    print(f"Generated {OUT} ({OUT.stat().st_size:,} bytes)")

if __name__ == "__main__":
    main()
