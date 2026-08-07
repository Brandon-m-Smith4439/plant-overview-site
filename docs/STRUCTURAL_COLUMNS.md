# Automatic Structural Columns

Plant Model Studio v0.11.7 can continue the structural column pattern into floor areas added beyond the original CAD footprint.

## Default structural module

The supplied drawing uses a dominant production-floor bay pattern of:

- **40 ft along X**
- **30 ft along Z**

The generated grid remains anchored to the original drawing coordinates. Enlarging only one side of the floor therefore adds the next valid structural bays on that side without shifting existing columns.

## Editing

Open **Plant Layout → Edit layout → Structure**.

Available controls:

- **Extend the CAD column grid into new floor sections** — shows or hides automatically generated extension columns.
- **X bay spacing** — changes the repeated spacing across the plant width.
- **Z bay spacing** — changes the repeated spacing along the plant length.
- **Restore 40 × 30 ft CAD bay spacing** — restores the supplied structural module.
- **Restore every pillar** — restores hidden original and generated columns.

The live summary reports how many visible columns originate in the CAD data and how many were generated for the extension.

## Placement rules

- Original CAD columns remain unchanged.
- New columns are generated only outside the original CAD floor footprint.
- Generated columns use the same world-coordinate grid as the original structure.
- A one-quarter-bay wall inset prevents a new column from being placed directly inside an exterior wall when the floor is expanded by only a partial bay.
- Shrinking the floor temporarily removes columns outside the new floor bounds; expanding it again restores them at the same stable grid locations.

## Persistence

Generated columns use stable keys based on their X/Z grid indices. Hiding a generated column is preserved in:

- Browser autosave
- Undo and redo
- Layout JSON export and import
- Page reloads

The project continues to use layout schema 6. Existing `hiddenColumns` values still control original CAD pillars, while `hiddenColumnKeys` stores generated-column visibility.

## Performance safeguard

The grid is cached and recalculated only after a floor or structural-spacing change. If an unusually large floor would create more than the safe generated-column budget, the system keeps the same grid anchor but displays an aligned integer subset of grid lines. The Structure panel reports when this safeguard is active.
