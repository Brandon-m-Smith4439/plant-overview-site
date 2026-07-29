from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def read_pairs(path: Path):
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        while True:
            code_line = handle.readline()
            if not code_line:
                break
            value_line = handle.readline()
            if not value_line:
                break
            try:
                code = int(code_line.strip())
            except ValueError:
                continue
            yield code, value_line.rstrip("\r\n")


def parse_entities(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    pairs = iter(read_pairs(path))
    section = None
    entities: list[dict[str, Any]] = []
    header: dict[str, Any] = {}
    current_header = None
    current_type = None
    current_pairs: list[tuple[int, str]] = []
    current_block = ""
    entity_section = ""

    def flush_entity() -> None:
        nonlocal current_type, current_pairs, current_block
        if current_type is None:
            return
        record: dict[str, Any] = {
            "type": current_type,
            "pairs": current_pairs,
            "section": entity_section,
            "block": current_block,
        }
        first: dict[int, str] = {}
        repeated: dict[int, list[str]] = defaultdict(list)
        for code, value in current_pairs:
            first.setdefault(code, value)
            repeated[code].append(value)
        record["layer"] = first.get(8, "")
        record["handle"] = first.get(5, "")
        record["name"] = first.get(2, "")
        if current_type in {"TEXT", "ATTRIB", "ATTDEF"}:
            record["text"] = first.get(1, "")
        elif current_type == "MTEXT":
            record["text"] = "".join(repeated.get(3, [])) + first.get(1, "")
        if "text" in record:
            record["text"] = re.sub(r"\\[A-Za-z][^;]*;", "", record["text"])
            record["text"] = record["text"].replace("\\P", " ").replace("{", "").replace("}", "")
        points = []
        xs = repeated.get(10, [])
        ys = repeated.get(20, [])
        for x, y in zip(xs, ys):
            try:
                points.append((float(x), float(y)))
            except ValueError:
                pass
        if current_type == "LINE":
            try:
                points.append((float(first[11]), float(first[21])))
            except (KeyError, ValueError):
                pass
        if current_type in {"CIRCLE", "ARC"} and points:
            try:
                radius = float(first[40])
                x, y = points[0]
                points.extend([(x - radius, y - radius), (x + radius, y + radius)])
            except (KeyError, ValueError):
                pass
        if points:
            record["points"] = points
            record["bounds"] = [
                min(point[0] for point in points),
                min(point[1] for point in points),
                max(point[0] for point in points),
                max(point[1] for point in points),
            ]
        entities.append(record)
        if entity_section == "BLOCKS" and current_type == "BLOCK":
            current_block = record["name"]
        elif entity_section == "BLOCKS" and current_type == "ENDBLK":
            current_block = ""
        current_type = None
        current_pairs = []

    for code, value in pairs:
        if code == 0 and value == "SECTION":
            _, section_name = next(pairs)
            section = section_name
            continue
        if code == 0 and value == "ENDSEC":
            flush_entity()
            section = None
            current_block = ""
            continue
        if section == "HEADER":
            if code == 9:
                current_header = value
                header[current_header] = []
            elif current_header is not None:
                header[current_header].append((code, value))
            continue
        if section not in {"ENTITIES", "BLOCKS", "OBJECTS"}:
            continue
        if code == 0:
            flush_entity()
            entity_section = section
            current_type = value
            current_pairs = []
        elif current_type is not None:
            current_pairs.append((code, value))

    flush_entity()
    return entities, header


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dxf", type=Path)
    parser.add_argument("--json", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    entities, header = parse_entities(args.dxf)
    type_counts = Counter(entity["type"] for entity in entities)
    layer_counts = Counter(entity["layer"] for entity in entities)
    text_entities = [
        {
            key: entity.get(key)
            for key in ("type", "layer", "handle", "name", "text", "bounds", "points")
            if entity.get(key) not in (None, "", [])
        }
        for entity in entities
        if entity.get("text")
    ]
    insert_entities = [
        {
            key: entity.get(key)
            for key in ("type", "layer", "handle", "name", "bounds", "points")
            if entity.get(key) not in (None, "", [])
        }
        for entity in entities
        if entity["type"] == "INSERT"
    ]

    bounded = [entity["bounds"] for entity in entities if entity.get("bounds")]
    overall_bounds = None
    if bounded:
        overall_bounds = [
            min(bounds[0] for bounds in bounded),
            min(bounds[1] for bounds in bounded),
            max(bounds[2] for bounds in bounded),
            max(bounds[3] for bounds in bounded),
        ]

    payload = {
        "dxf": str(args.dxf),
        "entity_count": len(entities),
        "overall_bounds": overall_bounds,
        "header": header,
        "type_counts": dict(type_counts.most_common()),
        "layer_counts": dict(layer_counts.most_common()),
        "texts": text_entities,
        "inserts": insert_entities,
    }
    args.json.parent.mkdir(parents=True, exist_ok=True)
    args.json.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    keywords = re.compile(
        r"glass|plant|production|monroe|airport|warehouse|tempering|cutting|shipping|office",
        re.IGNORECASE,
    )
    matching = [text for text in text_entities if keywords.search(text.get("text", ""))]
    lines = [
        f"Entities: {len(entities)}",
        f"Overall bounds: {overall_bounds}",
        "",
        "Top entity types:",
        *[f"  {name}: {count}" for name, count in type_counts.most_common(30)],
        "",
        "Top layers:",
        *[f"  {name}: {count}" for name, count in layer_counts.most_common(80)],
        "",
        "Relevant text:",
    ]
    for text in matching:
        lines.append(
            f"  {text.get('text')} | layer={text.get('layer')} | points={text.get('points')}"
        )
    args.report.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"ENTITIES={len(entities)}")
    print(f"TEXTS={len(text_entities)}")
    print(f"BOUNDS={overall_bounds}")
    print(f"RELEVANT_TEXTS={len(matching)}")


if __name__ == "__main__":
    main()
