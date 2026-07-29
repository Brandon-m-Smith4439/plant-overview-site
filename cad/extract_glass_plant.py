from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parent))
from analyze_dxf import parse_entities


PLANT_BOUNDS = (-2800.0, -2550.0, 2850.0, 600.0)
LAYERS = {
    "01 Barefoot": ("barefoot", "#28a6a1", 420),
    "01 Glass Tempering": ("tempering", "#e56b37", 900),
    "01b Glass Tempering": ("tempering", "#ef9b57", 900),
    "01 Wire Shelving": ("storage", "#69a3c8", 520),
    "01 Posts": ("structure", "#d5a83f", 280),
    "01 Divding Wall": ("walls", "#d5dce3", 160),
    "01 Doors": ("walls", "#d5dce3", 100),
    "01 Safety Zones": ("safety", "#e9c14a", 220),
}


def intersects(bounds: list[float], region: tuple[float, ...]) -> bool:
    return (
        bounds[2] >= region[0]
        and bounds[0] <= region[2]
        and bounds[3] >= region[1]
        and bounds[1] <= region[3]
    )


def clip_point(point: tuple[float, float]) -> tuple[float, float]:
    x1, y1, x2, y2 = PLANT_BOUNDS
    return (min(max(point[0], x1), x2), min(max(point[1], y1), y2))


def extract_segments(entities: list[dict]) -> list[dict]:
    grouped: dict[str, list[list[float]]] = defaultdict(list)
    for entity in entities:
        layer = entity.get("layer", "")
        if (
            entity.get("section") != "ENTITIES"
            or layer not in LAYERS
            or not entity.get("bounds")
            or not intersects(entity["bounds"], PLANT_BOUNDS)
        ):
            continue
        points = [clip_point(point) for point in entity.get("points", [])]
        if len(points) < 2:
            continue
        pairs = zip(points[:-1], points[1:])
        for start, end in pairs:
            length = math.dist(start, end)
            if 2.0 <= length <= 1400.0:
                grouped[layer].append(
                    [
                        round(start[0] / 12.0, 2),
                        round(start[1] / 12.0, 2),
                        round(end[0] / 12.0, 2),
                        round(end[1] / 12.0, 2),
                    ]
                )

    result = []
    for layer, values in grouped.items():
        category, color, cap = LAYERS[layer]
        step = max(1, math.ceil(len(values) / cap))
        result.extend(
            {"c": category, "k": color, "p": segment}
            for segment in values[::step][:cap]
        )
    return result


def extract_columns(entities: list[dict]) -> list[list[float]]:
    candidates: list[tuple[float, float]] = []
    for entity in entities:
        if (
            entity.get("section") != "ENTITIES"
            or entity.get("layer") != "01 Posts"
            or not entity.get("bounds")
            or not intersects(entity["bounds"], PLANT_BOUNDS)
        ):
            continue
        x1, y1, x2, y2 = entity["bounds"]
        if x2 - x1 <= 42 and y2 - y1 <= 42:
            candidates.append(((x1 + x2) / 2, (y1 + y2) / 2))

    columns: list[tuple[float, float]] = []
    for point in sorted(candidates):
        if all(math.dist(point, existing) > 30 for existing in columns):
            columns.append(point)
    return [[round(x / 12, 2), round(y / 12, 2)] for x, y in columns[:180]]


def render_preview(segments: list[dict], output: Path) -> None:
    width, height, margin = 1600, 900, 48
    x1, y1, x2, y2 = (value / 12 for value in PLANT_BOUNDS)
    scale = min((width - 2 * margin) / (x2 - x1), (height - 2 * margin) / (y2 - y1))
    image = Image.new("RGB", (width, height), "#101519")
    draw = ImageDraw.Draw(image)

    def point(x: float, y: float) -> tuple[float, float]:
        return margin + (x - x1) * scale, height - margin - (y - y1) * scale

    draw.rectangle([point(x1, y2), point(x2, y1)], outline="#56636d", width=2)
    for segment in segments:
        sx, sy, ex, ey = segment["p"]
        draw.line([point(sx, sy), point(ex, ey)], fill=segment["k"], width=2)
    draw.text((margin, 14), "ISOLATED GLASS PLANT CAD GEOMETRY", fill="#f3efe7")
    draw.text(
        (width - 510, 14),
        "Barefoot | Tempering | Storage | Structure",
        fill="#9ba8b1",
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dxf", type=Path)
    parser.add_argument("--js", type=Path, required=True)
    parser.add_argument("--preview", type=Path, required=True)
    args = parser.parse_args()

    entities, header = parse_entities(args.dxf)
    segments = extract_segments(entities)
    columns = extract_columns(entities)
    payload = {
        "source": "Monroe Archs w Updates 1-23-25 (002).dwg",
        "units": "feet",
        "bounds": [round(value / 12.0, 2) for value in PLANT_BOUNDS],
        "segments": segments,
        "columns": columns,
        "notes": [
            "Geometry is isolated from the A6 Barefoot Production Line and A10 Glass Tempering Line drawing areas.",
            "Vertical heights and construction timing are interpretive until confirmed by dated field documentation.",
        ],
        "dxfUnits": header.get("$INSUNITS"),
    }
    args.js.parent.mkdir(parents=True, exist_ok=True)
    args.js.write_text(
        "window.PLANT_CAD_DATA = "
        + json.dumps(payload, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    render_preview(segments, args.preview)
    print(f"SEGMENTS={len(segments)}")
    print(f"COLUMNS={len(columns)}")
    print(f"JS={args.js}")
    print(f"PREVIEW={args.preview}")


if __name__ == "__main__":
    main()
