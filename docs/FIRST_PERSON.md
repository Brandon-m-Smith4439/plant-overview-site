# First-person navigation

Plant Model Studio v0.11.6 includes a full game-style first-person camera for inspecting the glass plant at floor level.

## Start and exit

Choose **First person** from the Plant Layout toolbar. The model expands to the full browser window and attempts to enter browser full-screen mode. Browser security may require one additional click on the model before mouse capture begins.

Press **Esc** once to leave first-person mode and return to the exact overview camera used before entering. The **Exit first person** button provides the same behavior.

## Controls

- **W/A/S/D** or arrow keys: walk
- **Mouse**: look around
- **Shift**: sprint
- **Space**: jump
- **Ctrl** or **C**: crouch
- **Esc**: exit first-person mode

## Settings

The first-person HUD provides walking speed, eye height, field of view, mouse sensitivity, collision, and subtle walking motion controls.

## Collision behavior

The camera uses a circular collision footprint and cannot pass through solid scene objects, visible structural pillars, or the floor boundary while collision is enabled. When a diagonal movement is blocked, each movement axis is tested independently so the camera can slide along the obstacle.

Objects configured to ignore layout collisions do not block first-person movement. Flat floor features such as safety lines, trenches, and drains also do not block movement.

## Rendering

First-person mode uses perspective projection and clips polygons and lines against a near camera plane. This prevents geometry from flipping, stretching across the display, or appearing behind the camera when walking very close to a machine or wall.

For the smoothest experience, use **Auto** or **Performance** rendering mode on lower-powered computers and leave browser hardware acceleration enabled.


## Keyboard focus behavior

The controller processes movement even when the First person or Capture mouse button was the last clicked control. Text fields and settings inputs still keep normal keyboard behavior until mouse capture begins.

## Rendering and orientation

First-person mode converts the overview orbit direction into a forward-facing camera direction when it starts. Perspective visibility uses reciprocal depth (`1 / cameraDepth`) so triangles that have already been projected to screen space retain correct near/far interpolation. This prevents opaque machine parts and walls from becoming transparent or appearing inside-out while moving the camera.
