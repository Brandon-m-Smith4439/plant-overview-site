# Monroe Glass Plant Evolution

Interactive 3D construction timeline for the Monroe glass plant. The horizontal
geometry comes from the glass-production areas of:

`Monroe Archs w Updates 1-23-25 (002).dwg`

The A6 Barefoot Production Line and A10 Glass Tempering Line drawing areas were
used to isolate the plant. Front offices, breakroom, roof, parking, and other
facility layouts are outside this model.

## Experience

The page moves through 19 stages. After the shell, utility, paint, and crane
runway work, the equipment is installed one machine at a time:

1. Barefoot cutting tables
2. SQ4020 waterjet
3. Waterjet pump and filtration
4. Kodiak 10-45
5. Denver Surface #1
6. Denver Surface #2
7. Tempering furnace oven
8. Fuze Cube
9. Chop saw

Raw glass, plant-floor offices, first production, and the current plant follow
the equipment sequence. Every equipment entry has a crane bridge; the processing
machines use the blue/silver 1,000-lb GORBEL system visible in the photos, while
the tempering furnace uses the yellow 5-ton bridge.

The 3D viewer supports orbit, zoom, overview and floor-plan cameras, CAD and
label toggles, direct timeline selection, Previous/Next controls, keyboard arrow
navigation, and autoplay.

## Run

With Node.js 22.13 or newer:

```powershell
npm ci
npm run dev
```

The standalone buildless preview can also be opened at
`public/preview.html`, or served from this folder with:

```powershell
py -m http.server 4173 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:4173/public/preview.html`.

## Geometry and validation

- `public/plant-data.js` contains the normalized CAD footprint.
- `cad/machine_registry.json` is the equipment placement and evidence record.
- `cad/export_machine_registry.py` regenerates `public/machine-data.js`.
- `cad/extract_glass_plant.py` regenerates that data from the exported DXF.
- `cad/validate_site.py` checks the CAD counts, site structure, and all stages.

The registry distinguishes direct DWG labels from photo-correlated anonymous
equipment footprints. Horizontal anchors are drawing-grounded; vertical heights,
some anonymous-block footprint matches, and stage timing remain interpretive and
should be refined if vendor installation drawings or surveyed equipment
dimensions become available.
