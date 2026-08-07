# Rendering Performance

Plant Model Studio v0.11.1 includes a shared adaptive rendering system for the Plant Layout and Machine Design Studio.

## Recommended setting

Use **Auto** first. It starts with balanced detail and adjusts only after sustained performance measurements. The setting is saved in the browser under `monroe-glass-render-performance-v1` and does not modify the plant layout or machine-design files.

## Modes

| Mode | Best use | Animation target | Shadows | Curved detail |
| --- | --- | ---: | --- | --- |
| Auto | Normal use | 30 FPS | Reduced | Medium |
| Balanced | Predictable normal editing | 30 FPS | Reduced | Medium |
| Quality | Screenshots and lighter scenes | 45 FPS | Full | High |
| Performance | Large or animation-heavy scenes | 24 FPS | Off | Low |

Direct manipulation temporarily raises the frame target so dragging, orbiting, and scaling remain responsive.

## What is optimized

- Hidden tabs do not render.
- Static views redraw infrequently instead of rebuilding the complete scene at 60 FPS.
- High-DPI canvas resolution is capped by the selected mode.
- Off-screen plant objects and pillars are skipped.
- Shadow layers and shadow-casting component counts are bounded.
- The designer grid adapts to large machine envelopes.
- WebGL buffers are reused and repeated color parsing is cached.
- WebGL models no longer use obsolete painter-order face subdivision.

## Troubleshooting

1. Select **Performance** mode and set Shadows to **Off** to determine whether shadows are the main cost.
2. Keep browser hardware acceleration enabled so the WebGL renderer is used.
3. Avoid forcing Full shadows on machines containing hundreds of separate components.
4. Use the FPS indicator to compare settings while the same animation is playing.
5. If the browser becomes sluggish after remaining open for a long time, reload the page; the saved layout and designs remain in browser storage.
