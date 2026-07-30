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
    machine_script = (ROOT / "public" / "machine-data.js").read_text(encoding="utf-8")
    hosting = json.loads((ROOT / ".openai" / "hosting.json").read_text(encoding="utf-8"))

    prefix = "window.PLANT_CAD_DATA = "
    assert data_script.startswith(prefix) and data_script.rstrip().endswith(";")
    data = json.loads(data_script[len(prefix) :].strip().removesuffix(";"))
    machine_prefix = "window.PLANT_MACHINE_DATA = "
    assert machine_script.startswith(machine_prefix) and machine_script.rstrip().endswith(";")
    machine_data = json.loads(
        machine_script[len(machine_prefix) :].strip().removesuffix(";")
    )

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
        "stage-total",
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
        "Crane runways set",
        "Barefoot tables set",
        "SQ4020 waterjet set",
        "Waterjet filtration set",
        "Kodiak 10-45 set",
        "Denver Surface #1 set",
        "Denver Surface #2 set",
        "Tempering furnace set",
        "Fuze Cube set",
        "First raw glass",
        "Plant offices built",
        "First production",
        "Plant today",
    ]
    for phase in required_phases:
        assert phase in script, phase

    assert machine_data["source"] == data["source"]
    assert machine_data["units"] == "feet"
    assert len(machine_data["machines"]) == 8
    assert sum(
        machine["placement_status"] == "dwg_named"
        for machine in machine_data["machines"]
    ) >= 4
    assert all(machine["crane"]["capacity"] for machine in machine_data["machines"])
    assert any(
        machine["crane"]["capacity"] == "5 ton"
        for machine in machine_data["machines"]
    )
    assert all(machine["dwg_anchor_inches"] for machine in machine_data["machines"])
    reveals = [machine["reveal"] for machine in machine_data["machines"]]
    assert reveals == list(range(6, 14))
    assert "Chop saw" not in machine_script

    fixtures = machine_data["fixtures"]
    assert sum(fixture["type"] == "aFrame" for fixture in fixtures) == 3
    assert any(fixture["type"] == "craneMachine" for fixture in fixtures)

    required_editor_features = [
        "monroe-glass-plant-layout-v3",
        "createEditorPanel",
        "copySelectedMachine",
        "pasteMachine",
        "deleteSelectedMachine",
        "machineTemplate",
        "hiddenColumns",
        "wallSections",
        "worldFromScreen",
        "panCamera",
        'data-editor-tool="pillars"',
        '<option value="aFrame">',
        '<option value="craneMachine">',
    ]
    for feature in required_editor_features:
        assert feature in script, feature
    assert "h:22,color:colors.yellow" in script

    for asset in ("plant-data.js", "machine-data.js", "plant-app.js"):
        assert f'"/{asset}"' in page
        assert f'"{asset}"' in preview
        assert (ROOT / "public" / asset).is_file()

    print("VALIDATION=PASS")
    print(f"CAD_SEGMENTS={len(data['segments'])}")
    print(f"CAD_COLUMNS={len(data['columns'])}")
    print(f"STAGES={len(required_phases)}")
    print(f"MACHINES={len(machine_data['machines'])}")
    print(f"EDITABLE_FIXTURES={len(fixtures)}")
    print("MACHINE_REVEALS=ONE_AT_A_TIME")
    print("CRANES=ALL_MACHINES")
    print("LAYOUT_EDITOR=PERSISTENT")
    print(f"PROJECT_ID={hosting['project_id']}")


if __name__ == "__main__":
    main()
