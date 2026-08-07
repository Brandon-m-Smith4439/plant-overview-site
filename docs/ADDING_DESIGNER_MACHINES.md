# Adding Designer Machines from the Plant Layout

Version 0.12.0 exposes reusable Machine Design Studio models directly in the Plant Layout editor.

## Workflow

1. Create or edit a custom reusable machine in Machine Design Studio.
2. Open the Plant Layout and choose **Edit layout**.
3. Scroll to **Add to the 3D model** and expand it.
4. Under **Saved designer machine**, select the reusable design.
5. Choose a Plant Layout name, appearance stage, and placement method.
6. Select **Add designer machine**.

## Placement

- **Find open floor space** starts at the current camera focus and searches nearby for a non-overlapping position.
- **Center of current view** places the machine at the current editor focus even when another object is nearby.
- **Plant center** places the machine at the current floor center.

## Linking

The new machine stores the reusable design ID and starts in Match dimensions mode. Later Designer envelope changes update the linked Plant Layout instance while its Plant Layout position, rotation, animation, and timeline settings remain independent.
