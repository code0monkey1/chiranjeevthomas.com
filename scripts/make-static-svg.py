"""
Makes a still version of an animated (SMIL) SVG for readers who ask for reduced motion.

CSS can't stop SMIL inside an <img>, so posts embed each diagram in a <picture> whose
(prefers-reduced-motion: reduce) source is the file this script writes. The still shows the diagram
fully revealed, not the last animation frame (most of these loops fade back out):

- opacity fades that reach 1 -> fully visible
- other opacity animations (decorative pulses) -> hidden
- stroke / fill / other attribute cycles -> their first (base) value
- elements moved by animateMotion (travelling dots) -> hidden

Usage: python3 scripts/make-static-svg.py public/media/rank-fusion.svg [...]
Writes rank-fusion-static.svg next to each input. Standard library only.
"""
import sys
import xml.etree.ElementTree as ET

SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)
ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")
SMIL = {f"{{{SVG}}}{t}" for t in ("animate", "animateTransform", "animateMotion", "set")}


def still(path: str) -> str:
    tree = ET.parse(path)
    root = tree.getroot()
    parents = {child: parent for parent in root.iter() for child in parent}
    for anim in [el for el in root.iter() if el.tag in SMIL]:
        parent = parents[anim]
        tag = anim.tag.split("}")[1]
        attr = anim.get("attributeName")
        values = (anim.get("values") or "").split(";") if anim.get("values") else [v for v in (anim.get("from"), anim.get("to")) if v]
        values = [v.strip() for v in values if v.strip()]
        if tag == "animateMotion":
            parent.set("opacity", "0")
        elif attr == "opacity":
            parent.set("opacity", "1" if any(float(v) >= 1 for v in values) else "0")
        elif tag == "animateTransform":
            pass  # keep the element's own transform
        elif attr and values:
            parent.set(attr, values[0])
        parent.remove(anim)
    out = path[:-4] + "-static.svg"
    tree.write(out, encoding="unicode", xml_declaration=False)
    return out


if __name__ == "__main__":
    for p in sys.argv[1:]:
        print("wrote", still(p))
