from __future__ import annotations

import argparse
from collections import defaultdict
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from analyze_dxf import parse_entities


REGIONS = {
    "glass_north": (0.0, -1650.0, 2850.0, 100.0),
    "glass_south": (500.0, -2550.0, 2850.0, -850.0),
    "barefoot": (-2800.0, -2550.0, -1750.0, -850.0),
}

COLORS = {
    "01 Glass Tempering": "#f16f3d",
    "01b Glass Tempering": "#ffad5c",
    "01 Barefoot": "#20b6ad",
    "01 Posts": "#f4cf4e",
    "01 Wire Shelving": "#5eb3df",
    "01 Safety Zones": "#d6b630",
    "AM_0N": "#be8cf0",
    "0": "#73808a",
}

Matrix = tuple[float, float, float, float, float, float]


def first_values(entity: dict) -> dict[int, str]:
    values: dict[int, str] = {}
    for code, value in entity.get("pairs", []):
        values.setdefault(code, value)
    return values


def compose(parent: Matrix, child: Matrix) -> Matrix:
    pa, pb, pc, pd, pe, pf = parent
    ca, cb, cc, cd, ce, cf = child
    return (
        pa * ca + pc * cb,
        pb * ca + pd * cb,
        pa * cc + pc * cd,
        pb * cc + pd * cd,
        pa * ce + pc * cf + pe,
        pb * ce + pd * cf + pf,
    )


def transform_point(matrix: Matrix, point: tuple[float, float]) -> tuple[float, float]:
    a, b, c, d, e, f = matrix
    return a * point[0] + c * point[1] + e, b * point[0] + d * point[1] + f


def insert_matrix(entity: dict, base: tuple[float, float]) -> Matrix:
    values = first_values(entity)
    point = entity.get("points", [(0.0, 0.0)])[0]
    sx = float(values.get(41, "1") or 1)
    sy = float(values.get(42, str(sx)) or sx)
    rotation = math.radians(float(values.get(50, "0") or 0))
    cosine, sine = math.cos(rotation), math.sin(rotation)
    a, b = sx * cosine, sx * sine
    c, d = -sy * sine, sy * cosine
    bx, by = base
    return a, b, c, d, point[0] - a * bx - c * by, point[1] - b * bx - d * by


def expanded_entities(entities: list[dict]) -> list[dict]:
    blocks: dict[str, list[dict]] = defaultdict(list)
    bases: dict[str, tuple[float, float]] = {}
    for entity in entities:
        if entity.get("section") != "BLOCKS":
            continue
        if entity["type"] == "BLOCK":
            values = first_values(entity)
            bases[entity["name"]] = (
                float(values.get(10, "0") or 0),
                float(values.get(20, "0") or 0),
            )
        elif entity.get("block"):
            blocks[entity["block"]].append(entity)

    output: list[dict] = []
    identity: Matrix = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)

    def expand(entity: dict, parent: Matrix, inherited_layer: str, depth: int) -> None:
        layer = entity.get("layer") or inherited_layer
        if layer == "0" and inherited_layer:
            layer = inherited_layer
        if entity["type"] == "INSERT" and depth < 5:
            name = entity.get("name", "")
            if name in blocks:
                matrix = compose(parent, insert_matrix(entity, bases.get(name, (0.0, 0.0))))
                for child in blocks[name]:
                    expand(child, matrix, layer, depth + 1)
            return
        points = [transform_point(parent, point) for point in entity.get("points", [])]
        if not points:
            return
        clone = dict(entity)
        clone["points"] = points
        clone["layer"] = layer
        clone["section"] = "ENTITIES"
        clone["bounds"] = [
            min(point[0] for point in points),
            min(point[1] for point in points),
            max(point[0] for point in points),
            max(point[1] for point in points),
        ]
        output.append(clone)

    for entity in entities:
        if entity.get("section") != "ENTITIES":
            continue
        if entity["type"] == "INSERT":
            output.append(entity)
            expand(entity, identity, entity.get("layer", ""), 0)
        else:
            output.append(entity)
    return output


def intersects(bounds: list[float], region: tuple[float, ...]) -> bool:
    return not (
        bounds[2] < region[0]
        or bounds[0] > region[2]
        or bounds[3] < region[1]
        or bounds[1] > region[3]
    )


def render(entities: list[dict], region: tuple[float, ...], output: Path) -> None:
    width, height, margin = 3000, 1900, 70
    x1, y1, x2, y2 = region
    scale = min((width - 2 * margin) / (x2 - x1), (height - 2 * margin) / (y2 - y1))
    image = Image.new("RGB", (width, height), "#10161a")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=18)
    small_font = ImageFont.load_default(size=14)

    def point(value: tuple[float, float]) -> tuple[float, float]:
        x, y = value
        return margin + (x - x1) * scale, height - margin - (y - y1) * scale

    for entity in entities:
        if entity.get("section") != "ENTITIES" or not entity.get("bounds"):
            continue
        if not intersects(entity["bounds"], region):
            continue
        layer = entity.get("layer", "")
        if layer not in COLORS:
            continue
        points = entity.get("points", [])
        if len(points) < 2:
            continue
        converted = [point(value) for value in points]
        color = COLORS[layer]
        if entity["type"] == "LINE":
            draw.line(converted[:2], fill=color, width=2)
        elif entity["type"] in {"LWPOLYLINE", "SPLINE", "POLYLINE"}:
            draw.line(converted, fill=color, width=1, joint="curve")
        elif entity["type"] in {"CIRCLE", "ARC"} and len(points) >= 3:
            cx, cy = points[0]
            radius = max(abs(points[1][0] - cx), abs(points[1][1] - cy))
            left, top = point((cx - radius, cy + radius))
            right, bottom = point((cx + radius, cy - radius))
            draw.ellipse((left, top, right, bottom), outline=color, width=1)

    for entity in entities:
        if entity.get("section") != "ENTITIES" or not entity.get("points"):
            continue
        x, y = entity["points"][0]
        if not (x1 <= x <= x2 and y1 <= y <= y2):
            continue
        screen = point((x, y))
        if entity["type"] == "INSERT":
            name = entity.get("name", "")
            if name.startswith("*D"):
                continue
            draw.ellipse(
                (screen[0] - 7, screen[1] - 7, screen[0] + 7, screen[1] + 7),
                fill="#ff42b3",
            )
            draw.text(
                (screen[0] + 10, screen[1] - 10),
                f"{name} [{x:.0f},{y:.0f}]",
                fill="#ff9dd4",
                font=small_font,
            )
        elif entity.get("text"):
            text = re.sub(r"\\[^;]*;", " ", entity["text"])
            text = re.sub(r"\s+", " ", text).strip()
            if len(text) < 3 or text.lower() == "windows":
                continue
            text = text[:68]
            draw.text(
                (screen[0] + 4, screen[1] + 3),
                text,
                fill="#f5f2e9",
                font=small_font,
                stroke_width=2,
                stroke_fill="#10161a",
            )

    draw.rectangle(
        (margin, margin, width - margin, height - margin),
        outline="#68757e",
        width=3,
    )
    feet = math.dist((x1, y1), (x2, y1)) / 12
    draw.text(
        (margin, 20),
        f"GLASS PLANT MACHINE PLAN | {feet:.0f} FT WIDE | DWG INCH COORDINATES",
        fill="#f5f2e9",
        font=font,
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, quality=95)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dxf", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    entities, _ = parse_entities(args.dxf)
    entities = expanded_entities(entities)
    for name, region in REGIONS.items():
        output = args.output_dir / f"{name}.png"
        render(entities, region, output)
        print(output)


if __name__ == "__main__":
    main()
