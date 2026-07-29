from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    page = (ROOT / "app" / "page.tsx").read_text(encoding="utf-8")
    preview = (ROOT / "public" / "preview.html").read_text(encoding="utf-8")
    script = (ROOT / "public" / "plant-app.js").read_text(encoding="utf-8")
    data_script = (ROOT / "public" / "plant-data.js").read_text(encoding="utf-8")
    hosting = json.loads((ROOT / ".openai" / "hosting.json").read_text(encoding="utf-8"))

    prefix = "window.PLANT_CAD_DATA = "
    assert data_script.startswith(prefix) and data_script.rstrip().endswith(";")
    data = json.loads(data_script[len(prefix) :].strip().removesuffix(";"))

    assert hosting["project_id"].startswith("appgprj_")
    assert data["source"] == "Monroe Archs w Updates 1-23-25 (002).dwg"
    assert data["units"] == "feet"
    assert len(data["segments"]) >= 2000
    assert len(data["columns"]) >= 100
    assert data["bounds"][2] - data["bounds"][0] > 400
    assert data["bounds"][3] - data["bounds"][1] > 250

    required_ids = {
        "plant-app",
        "plant-canvas",
        "stage-number",
        "stage-title",
        "stage-description",
        "previous-stage",
        "next-stage",
        "timeline-fill",
        "timeline-stages",
    }
    page_ids = set(re.findall(r'id="([^"]+)"', page))
    assert required_ids <= page_ids, required_ids - page_ids

    required_phases = [
        "Empty shell",
        "Trenches dug",
        "Utilities set",
        "Walls painted",
        "Safety yellow",
        "Machines installed",
        "First raw glass",
        "Plant offices built",
        "First production",
        "Plant today",
    ]
    for phase in required_phases:
        assert phase in script, phase

    for asset in ("plant-data.js", "plant-app.js"):
        assert f'"/{asset}"' in page
        assert f'"{asset}"' in preview
        assert (ROOT / "public" / asset).is_file()

    print("VALIDATION=PASS")
    print(f"CAD_SEGMENTS={len(data['segments'])}")
    print(f"CAD_COLUMNS={len(data['columns'])}")
    print(f"STAGES={len(required_phases)}")
    print(f"PROJECT_ID={hosting['project_id']}")


if __name__ == "__main__":
    main()
