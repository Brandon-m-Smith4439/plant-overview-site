# Creating New Machines

Plant Model Studio v0.11.8 can create a new reusable machine design and insert a separate instance into the Plant Layout.

## Workflow

1. Open **Machine Design Studio**.
2. Select **New** under Design actions.
3. Name the design, set its machine type, and build it from parts.
4. Set the design envelope or choose **Fit envelope around parts**.
5. Expand **Use in plant layout**.
6. Under **Create a new plant machine**, choose the object name, appearance stage, and placement method.
7. Select **Add new machine to Plant Layout**.

The new object uses the design envelope as its width, depth, and height. It is assigned to the current design in **Match dimensions** mode, so later design-envelope edits update that machine.

## Placement

- **Find open floor space** searches outward from the floor center and avoids solid objects.
- **Floor center** places the new object at the current floor center.
- **Plant origin** centers the object on X 0, Z 0.

The new object is automatically selected in the Plant object list and live-syncs into an already open Plant Layout tab.

## Reuse

A design can create multiple independent Plant Layout machines. Each instance can have its own position, rotation, scale, animation, stage visibility, and label while continuing to share the reusable design geometry.
