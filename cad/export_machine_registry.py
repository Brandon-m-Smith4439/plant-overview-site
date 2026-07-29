from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "cad" / "machine_registry.json"
OUTPUT = ROOT / "public" / "machine-data.js"


def main() -> None:
    registry = json.loads(SOURCE.read_text(encoding="utf-8"))
    OUTPUT.write_text(
        "window.PLANT_MACHINE_DATA = "
        + json.dumps(registry, indent=2, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )
    print(f"WROTE={OUTPUT}")
    print(f"MACHINES={len(registry['machines'])}")


if __name__ == "__main__":
    main()
