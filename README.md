# Monroe Glass Plant Evolution

Interactive 3D construction timeline for the Monroe glass plant. The horizontal
geometry comes from the glass-production areas of:

`Monroe Archs w Updates 1-23-25 (002).dwg`

The A6 Barefoot Production Line and A10 Glass Tempering Line drawing areas were
used to isolate the plant. Front offices, breakroom, roof, parking, and other
facility layouts are outside this model.

## Experience

The page moves through ten stages:

1. Empty shell
2. Trenches dug
3. Utilities set
4. Walls painted
5. Safety yellow
6. Machines installed
7. First raw glass
8. Plant-floor offices built
9. First production
10. Plant today

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
- `cad/extract_glass_plant.py` regenerates that data from the exported DXF.
- `cad/validate_site.py` checks the CAD counts, site structure, and all stages.

Vertical heights and stage timing are interpretive. They should be refined when
dated field photos, equipment dimensions, or construction milestones are
confirmed.
