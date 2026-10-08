## Version 0.13.79

**Zombie movement and model quality:** Endless now mixes shambler, walker, runner, sprinter, and giant zombie gait classes. Each has its own stride length, foot lift, arm swing, weight, and cadence; speed and animation are linked and co-op snapshots carry the gait identity. Zombies lunge with moving arms instead of visibly holding an enemy chainsaw, while retaining melee attacks. The head/eye renderer places pupils and eyes relative to the actual modeled Head part (with editable zombie-model eye anchors), fixing eyes around neck and mouth height.

**Cage/pathfinding:** The existing physical-envelope-aware A-star pursuit now leaves extra clearance around cages, pillars, walls and machines. If an enemy slides along geometry but makes no meaningful progress toward a spotted target for about a second, its waypoint route is invalidated and recalculated. All AI modes retain cached/budgeted routing to avoid unnecessary full-grid searches.

**Outdoor scene:** Zombie mode renders a dark wasteland exterior and moody sky outside the production floor. Combat mode renders desert terrain, stones and sparse scrub beneath a bright warm sky. These terrain features remain outside the plant bounds and do not alter its collision envelopes or standard editor views.

**Mystery Box:** The weapon reel and physical rising animation now run simultaneously over 4.8 seconds, with the final weapon at maximum height when the reel stops. The usual manual E/TAKE claim and unclaimed-descent behavior remain. After clearing waves 2, 4, 6, etc., the box relocates to a different walkable spot at least 24 world units away, away from player spawn and the health station, and the host shares its location in co-op.

**Shared editable 3D combat models:** Fourteen different editable 3D weapons and five zombie class models have been added as real Machine Studio design presets. The Studio browser now has **Zombies** and **Weapons** tabs. The same weapon designs drive the first-person view, AI-held guns and Mystery Box physical prizes. The weapon inspector exposes design-local XYZ muzzle anchors separately for hip fire and aiming (ADS); edited values influence muzzle flash and projectile origin. Saved changes use the shared existing design workspace system; reload/refresh the plant view after major edits.

Regression checks cover the designer tabs, live weapon model registry, zombie movement classes and gameplay. 203 combat-source assertions passed excluding the large published-workspace snapshot fixture that cannot be retrieved through the connector. The asset-catalog check passed for 14 guns and 5 zombie models. Timed mock gameplay verified simultaneous spinning/rising, manual collection and wave-three Mystery Box relocation; full graphical/multiplayer testing is still required.

## Version 0.13.78

**Mystery Box animation and manual collection.** The floor-placed Mystery Box is now 5.4 world units wide and visually styled as a three-reel slot machine. A 950-point purchase begins a 4.8-second decelerating weapon reel that always lands on the actual prize. The weapon then rises out of the top over 1.75 seconds, stays available for 11.5 seconds, and can be claimed with E or the TAKE button at no extra cost. You only receive the weapon if you explicitly collect it; when all three slots are full, your equipped slot is replaced. Unclaimed prizes slowly descend for 2.3 seconds, disappear, and allow another 950-point roll. The reel, inventory and points are local to each player in co-op. Pausing freezes the timer, and restarting or leaving resets it.

**Endless Zombie visual cleanup.** During active Endless Zombie mode all original static person/team-member models are suppressed; only actually spawned zombies (including giant variants) and your active co-op teammates remain visible. Normal Zombie and Combat retain their original person actors.

**Improved enemy navigation across all modes.** AI uses a cached collision grid derived from real physical envelopes, machine geometry, walls and pillars. When direct pursuit is blocked, capped A-star pathfinding finds waypoints around the obstacle; line-of-sight checks can shortcut safely around clear sections. Zombies continue tracking the current player position while Combat soldiers pursue last-known positions for longer after contact. Path planning is throttled to a small budget per frame so enemies do not all run expensive searches at once.

Regression validation passed 191 code-level assertions (excluding the separately unavailable 1.39 MB published-workspace fixture). Simulated gameplay checks verified wall detours, the full Mystery Box roll/claim/despawn/reroll lifecycle and point deductions. Live two-player testing and production browser rendering have not yet been completed.

## Version 0.13.77

**Player-controlled respawning.** In AI Combat and Normal Zombie modes, death runs the complete five-second fall, killer-camera and "Killed by" reveal. After the replay, the player chooses **Respawn** (full health and shield, without erasing kills or deaths) or **Exit mode**. Endless Zombie mode remains one-life survival.

**Wave-based Endless Zombies.** The previous continuous-spawn loop is now a real wave system: each round has a difficulty-scaled target, a progress bar and a brief break after the last kill. Zombie health, speed, group size and spawn tempo scale with wave and Easy/Normal/Hard/Nightmare. Spawn points are selected on open map edges with obstacle checks; zombies pursue the latest location of a living player. Larger, much tougher Giant zombies appear on every fifth wave and in selected later waves. Waves 5, 10, 15, etc. bring two giants, double point rewards and a newly placed health station.

**Survival economy and weapons.** Kills earn 100 points, headshot kills 150; Giants grant 5x, special waves grant 2x, combining multiplicatively. A permanently available Mystery Box costs 950 points and awards a randomized gun from an expanded pool: Viper SMG, Tactical Carbine, Belt-Fed LMG, Burst Rifle, Magnum Revolver, Precision DMR, Auto Shotgun, Heavy Pistol, plus existing special weapons. Carry up to three weapons: 1/2/3 equips the corresponding slot; a full inventory replaces the equipped weapon. A health station costs 800 points and can be used once by each player on each fifth wave when they need healing. Stand within six layout units of a station and press E (or its purchase button) to spend points. The bottom-right inventory, top wave-progress meter and left-hand survivor points board update during play; each player sees their own points deducted.

**Multiplayer and visuals.** The co-op host supplies shared wave progress, giant enemy snapshots, station coordinates and authoritative enemy movement. Zombie melee attacks can target other living teammates, not only the host. Station placement is walkability-checked and the health station remains separated from the mystery box. Enemy eyes have been moved back onto the upper face; the glass and larger explosion effects from 0.13.75 are retained.

Regression checks were updated. Source-level coverage passed 180 assertions excluding the separate published-workspace fixture, which the repository connector returned as empty. Simulated gameplay checks verified wave spawning, player-selected respawn after the full replay, random weapon purchases and health purchases.

## Version 0.13.76

Co-op victories, individual kill/death/headshot statistics, three-second respawns in Combat and Normal Zombie, and 300%-scale explosion/glass effects are retained from 0.13.75. Co-op Play again is now synchronized: the host restarts the whole lobby, teammates see Waiting for host until then, and only the host may emit victory or restart events. Corrected A-frame rack/truck pane geometry and rack glass hitboxes; bullets can hit the glass inside machine collision envelopes.

## Version 0.13.75

Version 0.13.75 expands multiplayer round flow and destructible-glass feedback. Co-op victory is now host-authoritative and broadcast to every teammate so all players receive the same victory screen. Multiplayer round stats track kills, headshots, and deaths per player and the victory screen includes a ranked team leaderboard with kill-leader and most-deaths callouts. AI Combat and Normal Zombie runs now use a three-second downed/respawn flow instead of ending the round on the first death; Endless Zombie remains the survival mode where death ends the run.

Glass destruction now treats glass racks, A-frame carts/trucks, shipping racks, animated glass, and carrier-authored lite/sheet/load components as first-class destructible panes, with procedural fallback hitboxes and visual removal when custom design metadata is incomplete. Rocket/explosion and glass-shatter visuals render at 300% of their previous visual size while gameplay damage radii remain unchanged.

## Version 0.13.74

Version 0.13.74 fixes Combat/Zombie re-entry after leaving a completed or failed round. The controller now performs one idempotent session-UI reset on both exit and entry, clearing stale restart/exit overlays, victory/death classes, countdown/pause state, killer reveal state, delayed death-screen timers, and death-cinematic presentation before the next setup screen opens. The reset also runs before an inactive `stop()` can return, so double-exit or first-person transition paths cannot skip cleanup.

## Version 0.13.73

Version 0.13.73 is a co-op performance and synchronization pass. Host-side AI no longer rebuilds the entire animated machine/glass occluder set for every enemy sight and movement query; combat occluders are cached for roughly one 30 FPS geometry sample and reused across all AI queries in that frame window. This removes the worst frame-time multiplier that appeared after live animated glass was added.

Co-op enemy state is now published as a compact world snapshot on its own cadence instead of rebuilding and serializing the full enemy array on every player heartbeat. Normal plant-character enemies omit repeated machine dimensions, synthetic zombies carry only the extra machine data they need, and snapshots include velocity plus a world sequence. Followers apply each world revision once, then interpolate and briefly extrapolate enemy movement locally every frame for smoother, faster-looking motion. Lightweight player heartbeats now run at 100 ms, preserve the latest host world state when heavy fields are omitted, avoid echoing the host's own heavy world payload back to the host, and bypass durable file-persistence serialization so disk writes cannot stall live movement updates. Hidden lobby/setup DOM is also no longer rebuilt on every gameplay heartbeat.

## Version 0.13.72

Version 0.13.72 restores unrestricted process-route endpoints for layouts that still carry legacy process-pointer geometry. The modern object-to-object route system already supported endpoints outside machine bounds, but legacy `processPointerAnchor*Percent` values were still normalized to `0–100%` before migration, silently pulling older saved start/end points back inside their machines. Legacy X/Y/Z anchors now preserve the same `-1000%` to `1100%` safety range as current process connections, so migrated routes retain outside-machine positions and remain draggable well beyond machine envelopes.

## Version 0.13.71

Version 0.13.71 makes co-op share one authoritative enemy world instead of letting each browser independently simulate its own opponents. The host now publishes enemy identity, position, health, weapon, movement, and destroyed-glass state while the other player follows that snapshot. Remote teammates interpolate and briefly extrapolate between network updates for smoother walking, and ally identity UI now shrinks/fades with distance before transitioning to a blue character outline for long-range recognition. The lobby heartbeat path is also throttled and moved off per-update synchronous disk persistence to reduce movement latency.

Combat glass collision now follows the current animated, nested design geometry every frame and scans all machines, so glass on animated equipment, racks, carts, and other carriers remains shootable wherever the animation moves it. Co-op glass shatters are broadcast to both players. First-person visibility uses conservative current-design bounds for cranes, cutting equipment, furnaces/tempering assets, and other large animated machines so visible geometry is not culled merely because its coarse placement box is off-axis. Cutting-table base collision is always additive to saved envelopes, restoring the original table footprints and service gap even when custom envelope metadata exists.

## Version 0.13.70

Version 0.13.70 expands the Combat/Zombie setup into a full player loadout and multiplayer identity screen. Players can choose **Rifle, Sniper, Shotgun, Rocket Launcher, or Chainsaw** before a match while retaining the pistol as the secondary weapon. Movement locking no longer swallows text input, so player names, lobby codes, and owner-password fields remain fully typeable while the pre-match overlay is open. In live multiplayer, remote players now carry persistent name tags that show both the lobby player name and the selected plant character, while every character currently occupied by a local or remote player is removed from its original plant position so duplicate bodies do not remain behind.

Death presentation now explicitly reports the weapon that eliminated the player (including private-match player kills) and adds a persistent bloody screen treatment through the death replay/end screen. Destructible machine glass is broadened to include authored `glassPanel` parts, AI sight can recognize glass as shootable cover, and both AI bullets/rockets and player fire use the same glass-shatter pipeline so blue machine glass bursts into depth-tested flying shards and disappears for the rest of the round.

## Version 0.13.69

Version 0.13.69 keeps the Combat/Zombie pre-match setup fully mouse-driven. Entering either owner game mode can still switch into first-person/fullscreen, but pointer lock is deliberately deferred while the difficulty, character, match type, and lobby controls are on screen. The existing **Start Match** path becomes the single handoff into captured first-person controls, so the cursor disappears only when gameplay actually begins.

## Version 0.13.68

Version 0.13.68 hardens the new Combat/Zombie multiplayer lobby so joining, creating, configuring, starting, and mutating a match now requires the signed **HttpOnly owner-session cookie** issued after the owner password is accepted. The lobby API no longer accepts a client-supplied owner marker as an authorization shortcut, so the owner-password requirement is enforced server-side.

## Version 0.13.67

Version 0.13.67 repairs the shared pre-match setup so its controls are actually clickable, adds **Easy / Normal / Hard / Nightmare** difficulty to Combat Mode, rebalances Zombie speed so the former full-speed behavior is now exactly **Nightmare**, and lets players select any active person in the plant as their character. Headshot detection now follows the selected model's actual named **Head** component and cuts the torso hitbox off below the neck. Machine glass is promoted to its own combat surface: player shots can shatter it, emit a depth-tested burst of flying glass shards, remove the broken glass component for the round, and continue through the shattered opening where geometry allows. The release also introduces the first password-gated multiplayer lobby: owner-password users can create/join short-code lobbies, synchronize selected characters and live player transforms, run co-op Combat/Zombie matches with shared enemy-hit events, or start a two-player Private Match with synchronized player-vs-player damage and headshots.

## Version 0.13.66

Version 0.13.66 adds a full Zombie Mode setup screen with **Easy, Normal, Hard, and Nightmare** difficulties plus separate **Normal · Clear Plant** and **Endless Survival** run types. Normal Zombie Mode uses the people already in the plant and ends when every zombie is eliminated with no respawns; Endless keeps the edge-spawn survival loop and scales zombie health, speed, damage, spawn cadence, alive cap, starting pressure, and ammo-pickup respawn timing by difficulty. Zombie high scores are now separated by difficulty/run type, with fastest clear tracked for Normal and longest survival for Endless. Incoming-fire direction markers and their FRONT/LEFT/RIGHT/BACK callouts now use the same mirrored first-person camera basis as the rendered view, fixing the confusing reversed left/right behavior.

## Version 0.13.65

Version 0.13.65 turns Zombie Mode into a true survival loop. Zombies now continue spawning from safe positions around the plant edges even while existing people are still alive, ammo pickups are distributed through the layout and respawn after collection, and Zombie high scores track longest survival instead of fastest clear. Zombie appearance now re-tints each person's real Head geometry and adds large protruding eyes rather than relying on a flat face plate. Death falls gain an obstacle-aware slide so nearby machines do not visually swallow the animation. Designer collision envelopes on overhead/gantry cranes now become real first-person/combat collision when present, allowing authored pillar envelopes to act as cover while cranes without envelopes remain pass-through. Restart and Exit controls also receive a matched polished end-screen treatment.

## Version 0.13.64

Version 0.13.64 fixes the first Zombie Mode visual/combat follow-up. Zombie skin, eyes, pupils, and wound marks are now anchored directly to each custom person's actual **Head** component instead of the overall person envelope, preventing masks from appearing flat at neck level. Rifle ADS hides the physical viewmodel optic and lowers the rifle so the dedicated holographic aiming sight remains unobstructed, while player tracer origins now follow the visible muzzle in both hip-fire and ADS. Zombie Mode shotgun fire keeps eight pellets, widens the buckshot cone, and renders every pellet as its own tracer. Enemy death animation now starts on the exact kill frame to eliminate the standing pause before a defeated person falls.

## Version 0.13.63

Version 0.13.63 adds a separate owner-only **Zombie mode** beside Combat Mode. Zombie rounds turn every person into a chainsaw-only, extra-fast zombie while the player uses a shotgun and pistol. Combat hit detection now uses distinct head/body hit volumes with headshot damage and separate regular-kill/headshot-kill statistics on both victory and death screens. Clear times are persisted as per-mode high scores, the restart action is visually upgraded, combat eyes are raised/recessed onto the face again, the player rifle now carries a visible holographic glass/reticle on the 3D weapon itself, and player tracers originate from the rendered gun side instead of the mirrored left side.

## Version 0.13.62

Version 0.13.62 restores the owner Combat Mode handoff and deepens enemy combat behavior. Already-authenticated visits to the private owner workspace now stamp the owner session before returning to the plant so the desktop **Combat mode** button reliably reappears beside **First person**. Enemy rifle, sniper, rocket-launcher, and chainsaw models now use more substantial layered 3D geometry, firing visibly kicks or lunges the weapon/arms, ranged AI uses real magazines with animated reload cycles, and chainsaw enemies sprint much more aggressively while chasing or pursuing the player's last-known position.

## Version 0.13.61

Version 0.13.61 completes the shared machine-envelope rollout and the Combat Mode reliability pass. Desktop and mobile now hydrate the same published Machine Studio/layout workspace, the owner-only desktop **Combat mode** button reliably appears immediately after **First person**, enemy weapons use thicker right-hand geometry, the player rifle keeps the holographic sight window clear while aiming, and defeated enemies consistently complete their fall before the victory screen can take over.

## Version 0.13.60

Machine envelopes and reusable Machine Studio designs now use one shared cross-device workspace instead of remaining trapped in a single browser's local storage. Once an owner session with newer edits opens the site, those definitions publish to the shared workspace and mobile/public viewers hydrate the same layout before rendering. The desktop owner toolbar also reliably restores **Combat mode** directly after **First person**. Combat receives thicker right-hand enemy weapons, a rebuilt player rifle with an unobstructed open holographic sight, and deterministic enemy fall animations before victory.

## Version 0.13.59

Owner Combat Mode now has a much more celebratory **PLANT SECURED** victory sequence and is playable from touch phones using dedicated FIRE, AIM, RELOAD, SWAP, and MENU controls alongside the existing mobile movement/look controls. Combat people also have corrected eye placement and more detailed weapon-specific 3D models, including a large shoulder-fired Rocket Launcher.

## Version 0.13.58

Combat visuals now use depth-tested world-space tracers, surface-aligned bullet holes, blood effects and rocket explosions. Rifle ADS uses a holographic sight, enemy AI can dodge-roll, chainsaw users detect farther and rush faster, combat faces retain visible eyes, and defeated enemies settle consistently before delayed blood-pool/fountain effects.

Combat Mode also hides the normal plant machine/process labels for the duration of a round, then restores the user's existing label configuration when combat ends.

Version 0.13.58 expands owner Combat Mode with visible player tracers, bullet-impact marks, restrained enemy hit/death blood effects, right-click scoped aiming, and randomized enemy weapon classes. Enemy AI now receives rifle, SMG, shotgun, sniper, bazooka, pistol, or chainsaw loadouts with matching 3D models and engagement behavior; chainsaw enemies rush into melee range while sniper and launcher enemies favor distance. The rechargeable shield is reduced from 45 to 22 so it remains useful without absorbing most incoming damage.

## Version 0.13.56

Version 0.13.56 separates Combat Mode state cleanly from the normal first-person walkthrough. Combat now has its own Esc pause menu, a rechargeable shield that absorbs damage before health, hard movement/mouse locking after death, and an improved five-second death replay that drops the camera to floor level before focusing the fatal shooter. The killer is outlined in bright red with an in-world name plate during the replay, pointer lock is released so the mouse returns, and only the death menu can appear until the player chooses Restart or Exit.

## Version 0.13.55

Version 0.13.55 fixes the custom-person Combat Mode path. Named people such as Helper now bypass the retained design batching that previously left many employees visually static/unarmed, while their individual torso/head/hair/hard-hat details remain visible under the articulated combat limbs and 3D rifle. Enemy left/right facing math is corrected so the body and weapon point at the player, yellow structural pillars are permanent collision/LOS cover, and player death now runs a five-second falling-camera/killer reveal before Restart or Exit appears.

## Version 0.13.54

Version 0.13.54 improves combat readability and enemy aiming. Incoming-fire feedback now combines larger directional arrows with explicit eight-way direction text and shooter names. Enemy movement no longer repeatedly spins blocked people in place; active shooters maintain authoritative facing toward the player and their 3D rifles follow that pose. When the player is eliminated, the camera centers on the killer, highlights that enemy in the plant, names them and their distance in the death overlay, and briefly locks restart so the shooter can be reviewed before the next round.

## Version 0.13.53

Version 0.13.53 upgrades Combat Mode's presentation. The owner weapon is now rendered as actual perspective 3D canvas geometry rather than a CSS silhouette, positioned just right of center with walk bob, recoil, muzzle flash, and reload motion. Enemy AI now uses a clearer two-segment walking gait, carries a more detailed 3D rifle, falls toward the floor around its feet when defeated, produces brighter world-space bullet tracers, and drives directional incoming-fire indicators around the player's crosshair.

## Version 0.13.52

Version 0.13.52 turns Combat Mode people into fully animated roaming combat actors. Enemy AI now moves around the plant using obstacle-aware wandering, strafing, advancing and retreating while its runtime pose drives both rendering and hit detection. Combat people visibly walk, aim their weapons, recoil, flash at the muzzle, show shot tracers, react to hits, and fall when defeated. The owner also receives a much larger first-person rifle/handgun render with sway, recoil, reload and muzzle-flash animations. Structural pillars now have a direct first-person collision safety check in addition to the spatial index and remain explicit line-of-sight/gunfire blockers for combat AI.

## Version 0.13.51

Version 0.13.51 tightens the owner-only Combat Mode start flow. The Combat mode button is shown immediately to the right of First person only for authenticated owner sessions. Selecting it automatically enters the first-person plant view, shows a 2-second 2 → 1 → FIGHT countdown, and keeps weapons and enemy AI inactive until the countdown completes. The combat round ends when the final enemy AI is defeated, and restarting a round uses the same countdown.

## Version 0.13.50

Version 0.13.50 adds an owner-only Combat Mode on top of the existing first-person plant walkthrough. The private owner dashboard opens a combat-ready plant view, where the owner can start a temporary FPS session. Person/team-member machine objects become line-of-sight enemy AI, while machines, columns, walls, and Designer collision envelopes block shots and enemy vision. The player has a generic primary rifle and secondary handgun, ammo/reload management, health, hit feedback, win/defeat states, and restart controls. None of the combat state is saved into the plant model, and the feature remains unavailable to public or ordinary editor sessions.

## Version 0.13.49

Version 0.13.49 cleans up the physical 3D machine-label workflow. Label settings are now organized into focused sections, preset colors live directly inside the label color control with custom Background/Text/Accent choices, X/Y/Z placement can move beyond machine bounds using the same -1000%..1100% range as process routes, and label size no longer has an arbitrary upper limit. Legacy screen-space timing/importance and duplicate offset controls are hidden from the active editor but remain compatible with older saved layouts.

## Version 0.13.48

Version 0.13.48 makes the new physical route/label styling easier to control consistently. Process routes can now use their full 30 ft Route Y range from the editor; as they rise, they progressively become physical 3D rails rather than flat ribbons. The already-raised billboard lettering now has an editable Raised text depth setting, allowing a subtle or stronger physical offset from both sign faces. A shared preset palette was also added for labels and process routes so Plant teal, Glass blue, Process blue/green, Amber, Orange, Alert red, Purple, and Steel can be reused consistently while still allowing custom colors.

## Version 0.13.47

Version 0.13.47 adds true vertical volume to elevated process routes and subtle physical depth to billboard lettering. Route Y can now be raised as high as 30 ft. Near the floor a route stays a clean ribbon, but increasing Y progressively turns it into a depth-tested 3D rail with visible side and underside faces; the moving white direction highlights ride on its top surface. Machine billboard text now renders on separate front/rear planes that sit slightly in front of the physical sign faces, giving the names real parallax and a small extruded effect while preserving double-sided readability and the cleaner v0.13.46 styling.

## Version 0.13.46

Version 0.13.46 tones the physical 3D machine billboards down without returning to plain labels. The face is now a cleaner dark industrial plate with a subtle surface gradient, restrained glowing perimeter, fine inner edge, one slim accent rail, strong text, and softer glow. The previous beacon, top rail, bottom status rail, and extra decorative modules are removed so the machine name remains the visual focus. Physical depth, double-sided readability, damped camera following, zoom limits, and the corrected production-route direction remain unchanged.

## Version 0.13.45

Version 0.13.45 keeps the new physical Today route system intact while correcting the moving white direction markers so they travel from source to destination again. The 3D machine billboards receive a much more visible industrial identification-plate design: a luminous top rail, left-side equipment beacon, layered dark face, stronger frame and keyline, bottom status rail, heavier text, and more deliberate glow/shadow treatment. The physical sign sides now stay dark so the configured accent color stands out around the face. A dedicated face-revision token forces retained labels to rebuild with the new appearance.

## Version 0.13.44

Version 0.13.44 completes the stabilized Today route and 3D billboard update. Production-flow routes are now depth-tested world-space floor ribbons that appear automatically on Today, keep a consistent physical width and travel speed while the camera moves, and disappear naturally behind opaque equipment. Machine billboards remain attached to fixed plant coordinates but use damped Y-axis camera following: they turn slowly, accelerate when badly misaligned, and ease into the final readable angle instead of snapping. The billboard face treatment and Labels editor now reflect the physical 3D implementation, and the Standard Add menu again exposes Cutting, Filtration, and the full built-in machine/object set.

## Version 0.13.43

Version 0.13.43 stabilizes the Today production-flow experience and advances the 3D billboard system. Today routes are always visible regardless of billboard text mode and now render as depth-tested world-space floor ribbons, so route thickness and animation speed remain stable while orbiting, zooming, or walking in first person and opaque machines correctly cover routes. Machine billboards keep a fixed world position but smoothly ease their yaw toward the camera using a distance-to-target response instead of snapping. The signs also receive a more polished physical face treatment and the Labels editor now exposes the settings that actually control the 3D implementation. The Standard Add menu once again includes Cutting and Filtration alongside all other built-in plant objects.

## Version 0.13.42

Version 0.13.42 repairs the plant-view freeze introduced by the v0.13.41 physical-label renderer. A frame-reset line accidentally referenced `entry.group` on instanced geometry entries that only contain `entry.mesh`, causing the render loop to throw after the first visible frame. Camera orbit, pan, zoom, stage navigation, and Today now redraw normally again. The 3D label face/edge shader uniforms are also explicitly refreshed from the shared view-projection matrix so fixed world signs stay visually attached to the moving scene.

## Version 0.13.41

Version 0.13.41 turns the experimental world labels into more physical plant signage. Each machine label is now a shallow 3D sign with a solid edge and two independently oriented faces, so text remains readable from either side without mirroring. The sign's world position and Y rotation stay fixed while the camera orbits instead of continuously billboarding toward the viewer. Text receives a configurable glow plus a crisp foreground pass, and zooming changes label size only gently within configurable minimum/maximum limits. The Labels editor exposes fixed rotation, depth, glow, and zoom limits alongside the existing world offsets and vertical lift.

## Version 0.13.40

Version 0.13.40 fixes a production cache-version mismatch in the shared legacy script loader. The visible Next.js shell had reached v0.13.39, but the loader was still requesting the plant renderer with a v0.13.37 release query, allowing the browser/CDN to continue serving the old 2D-label code. The loader now uses the current v0.13.40 release token, and regression coverage verifies that the loader token always matches VERSION. With fresh viewer scripts loaded, the 3D-only review behavior from v0.13.39 is active: old 2D machine labels and process label badges are off, while full world-space machine placards are on.

## Version 0.13.39

Version 0.13.39 makes the 3D-label experiment visually unambiguous. Normal machine labels are now actual textured planes inside the retained Three.js/WebGL scene rather than cards painted afterward on the 2D overlay canvas. Each placard is positioned in plant-world coordinates, follows the owning machine, faces the active camera, and uses the same depth buffer as the physical equipment so a machine can naturally pass in front of its label. For this review build, the previous 2D machine-label layer, compact process-step badges, and route-tag text are intentionally disabled, while the viewer defaults to All / Full labels so the new 3D labels are easy to inspect. Production-flow lines remain visible.

## Version 0.13.38

Version 0.13.38 changes normal machine/object identification labels from collision-reflowed screen tags into stable world-anchored, camera-facing callouts. Each label remains attached to its owning machine through the machine's 3D anchor and configurable World X, World Z, and vertical lift offsets, so moving a machine carries its label with it and orbiting the camera no longer makes the tag jump between alternate screen positions. The Labels editor also adds an Automatic / Major / Normal / Support importance override and a Reset 3D position action. Existing text, abbreviation, color, size, timing, anchor, and leader controls remain available. Production-flow routes, process pointers, and compact numbered process-step labels remain independent from the normal machine-label system. Legacy saved screen offsets are still normalized for backward compatibility, but the normal label renderer no longer uses them for placement.

## Version 0.13.37

Version 0.13.37 upgrades the flowing Necessary process routes from the old two-offset turn model to an **exact multi-pivot floor path editor**. Every selected route can now contain zero to 24 ordered pivot points; each pivot has an exact plant X / Z coordinate, can be added or removed independently, can be typed numerically, and can be dragged directly using its numbered floor handle. Existing v0.13.36 routes keep their current shape through a compatibility conversion until edited, then become exact custom pivot paths. Removing every pivot intentionally creates a direct S → E route. The v0.13.36 adaptive process labels are also generalized: any machine can opt into the compact collision-aware process-step label system with a custom step number and optional label text, while the original Cutting / Polisher / CNC / Washer / Tempering / Wrap / Truck/Rack machines continue to label themselves automatically.

## Version 0.13.36

Version 0.13.36 completes the adaptive Necessary process-label pass by treating projected plant equipment as protected screen space during automatic label placement. The numbered process badges and machine-name tags now search additional above/side positions around their floor-route anchor while avoiding every visible machine rectangle, not only the machine that owns the label. Their font and maximum tag width stay tightly bounded in screen pixels, so zooming the overview out keeps the text readable without allowing tags to scale into large blocks over machinery. This release retains the v0.13.35 direct S/E endpoint dragging, -1000% through 1100% endpoint range, shared step numbering, and camera-culling-independent route persistence.

## Version 0.13.35

Version 0.13.35 refines the animated Necessary floor routes with compact automatic process-step labels, freer endpoint editing, and camera-independent route persistence. Every standard process machine now receives one numbered badge on its route endpoint plus a small machine-name tag above it (Cutting 1, Polisher 2, Denver/Waterjet 3, Washer 4, Tempering 5, Wrap 6, Truck/Rack 7). The tags use bounded screen-space sizing and collision-aware placement so they remain readable when zoomed out without growing into large machine-covering labels. Labels reserve screen space in a stable pass so they do not stack over one another or flicker between front/back order. Selected routes now show explicit S and E endpoint handles; those handles can be dragged directly across the floor and the saved anchor range is expanded to -1000% through 1100%, allowing endpoints far beyond the source/destination machine footprint. Process routes also rebuild missing endpoint entries from the saved process graph instead of depending on current camera culling, so looking away from a source or destination no longer causes the route to disappear. The older custom route-tag control remains available only while editing a selected route; the automatic numbered machine labels are the normal Necessary-mode presentation.

## Version 0.13.34

Version 0.13.34 replaces the flat object-to-object process lines with **animated glowing floor-flow routes** for Today → Necessary mode. Each route now runs just above the plant floor, carries a moving highlight from source to destination, and remains visible in both Overview and First Person. Every route has two editable turn controls plus a Curve/Rounding setting, so the path can bend around equipment or form a smooth arch rather than being limited to a straight/elbow screen-space pointer. The Pointers editor also exposes floor height, flow speed, glow strength, core width, pattern, corner style, destination marker, and the existing independent route tag. The selected route shows numbered Turn 1 / Turn 2 handles in the model to make numeric path editing easier. Route tags still render in a second pass above the animated flow so they remain readable.

## Version 0.13.33

Version 0.13.33 improves the Necessary production-route overlay. Process route tags now render in a dedicated second pass above every route line, so a later route can no longer cross over and hide an earlier tag. Route tags also use lightweight collision avoidance against other labels. On the Today stage, first-person mode now keeps the Necessary route tags visible while omitting the full route-line overlay for a cleaner walkthrough. Process-pointer start/end anchors are no longer restricted to the 0–100% bounds of their source and destination objects; all six endpoint controls now allow -300% through 400%, making it possible to route a pointer well outside a machine footprint.

## Version 0.13.32

Version 0.13.32 adds **workspace recovery and editor-browser protection** after a hosted read-only page could replace newer browser-local layout/design data with the older checked-in published workspace when an editor session expired. Once a browser successfully authenticates as an editor, a durable protection marker prevents public reloads from seeding over that browser's machines or custom designs while still requiring the normal password for future editing sessions. Existing automatic layout-backup evidence also protects an older editor browser immediately, before the new marker has been created. The Project panel now exposes recovery controls for the existing automatic layout backup, the new machine-design backup, and a pre-publish rescue snapshot. Full-workspace export no longer performs a save first, so exporting recovery evidence cannot overwrite the previous-layout backup. Machine Design Studio now preserves the previous design-library payload before every design save.

## Version 0.13.31

Version 0.13.31 separates **Necessary-mode process routing** from **normal machine-label visibility**. A machine participating in the Cutting → Polisher → CNC/Waterjet → Washer → Tempering → Wrap route no longer forces its normal machine label on. The **Show this machine/object label in Necessary mode** checkbox is now authoritative for that normal label, even for process-flow machines such as the Kodiak polishers. Turning the label off leaves the independent process pointer and route tag untouched. The selected label's visual state is cleared immediately when the toggle changes so the editor gives instant feedback.

## Version 0.13.30

Version 0.13.30 fixes production viewer releases being paired with stale cached legacy renderer scripts. The Next.js shell uses hashed assets, but the large plant viewer scripts intentionally retain stable filenames such as `/plant-app.js` and `/three-depth-scene-renderer.js`. The loader previously added a cache-busting query only on localhost, allowing a Railway browser session to display the newest page/version badge while continuing to execute an older camera renderer. Every hosted and local legacy script now receives `?release=0.13.30`, the in-memory script cache is release-scoped, and the standalone Plant Layout / Machine Studio previews use the same release token. This guarantees that the v0.13.29 camera-layer fixes actually reach the browser after deployment.

## Version 0.13.29

Version 0.13.29 fixes the remaining camera-freeze behavior visible in **Today → Necessary** mode. The 3D plant and the Necessary labels are rendered on separate layers. The plant now presents its physical WebGL frame before any 2D process pointers or labels are drawn, so an overlay failure cannot leave the plant stuck on an old camera frame while labels keep moving. The retained Three.js renderer also explicitly refreshes the shared view-projection uniform on every rendered camera frame, including instanced materials. Regression checks verify both the scene-before-overlay ordering and the forced camera-uniform refresh.

## Version 0.13.28

Version 0.13.28 fixes Today Overview navigation when **Necessary** labels are active. The Necessary-label candidate filter introduced in v0.13.25 referenced an out-of-scope `machine` variable for non-flow objects. That JavaScript exception occurred after the 2D production-flow labels were drawn but before the 3D scene renderer presented the updated frame, which made the plant appear frozen while the labels continued moving. The filter now reads `entry.machine.labelShowToday`, so orbit, pan, touch gestures, and wheel zoom continue to update both the plant and labels. The label regression test now explicitly guards against the undefined-variable form.

## Version 0.13.27

Version 0.13.27 makes the two controls easy to find without removing the improvements from v0.13.26. Select an object and open **Objects → Labels**; near the top, use **Show this machine/object label in Necessary mode** to control its normal label on Today Overview. To rename a process-line route tag, open **Objects → Pointers**, select the line, then edit **Route tag text** inside **7 · Optional route tag**. The preview updates live while typing, and blank text still falls back to the automatic source → destination wording.

## Version 0.13.26

Version 0.13.26 makes the two recently added controls unmistakable in the layout editor. **Objects → Labels** is now a dedicated tab instead of burying label controls below Transform, and it includes a prominent **Show label on Today / Hide label on Today** button for Necessary mode. The button affects only the normal machine/object label; process pointers and route tags remain separate. In **Objects → Pointers**, the selected connection's **Route tag text** field is now directly below **Line to edit**, includes an on-screen preview, and updates the route tag live while typing. Blank route-tag text still falls back to the automatic source → destination name.

## Version 0.13.25

Version 0.13.25 adds editable route-tag text to every object-to-object process pointer and explicit per-machine control for showing normal machine labels on Today Overview. In **Objects → Pointers → Optional route tag**, each connection now has a **Route tag text** field; leave it blank for the automatic source → destination name, or enter any custom wording. In **Objects → Label**, the new **Show this machine label on Today Overview in Necessary mode** checkbox lets any machine/person/object label remain visible on Today without changing the process pointer or process-role assignment. Existing route tags and Today behavior are preserved by default.

## Version 0.13.24

Version 0.13.24 expands Today process pointers so either endpoint can be any placed layout object. In **Edit layout → Objects → Pointers**, choose an existing pointer and use **Source object** / **Destination object** to retarget the line directly to a machine, person, rack, truck, table, custom object, or other placed object. New pointers use the same all-object selectors. The connection remains independent from the normal machine label and its short label leader. Existing Cutting → Polisher and other process lines migrate to their exact current objects automatically. Process-role assignment is now optional metadata used for Necessary-label naming, not a requirement for connecting objects.

## Version 0.13.23

Version 0.13.23 corrects the Pointers editor so it is truly **connection-first** instead of machine-first. The top of **Edit layout → Objects → Pointers** now lists every saved machine-to-machine process line directly, including the exact source and destination machine names. Selecting **Cutting · Cutting Table → Polisher · Kodiak Polisher** edits the long process line between those machines. Start/end anchors, visibility, color, width, opacity, pattern, shape, endpoint style, and optional route-tag position are stored only on the selected process connection. The small machine-label callout and its short leader are still edited only under **Objects → Label**. The legacy process-node text field was removed from the Pointers tab to prevent it from being confused with the machine label. The selected process line is highlighted while the Pointers tab is open, and a runtime regression test now proves that process-connection edits do not mutate any machine-label pointer properties.

## Version 0.13.22

Version 0.13.22 fixes the remaining pointer-editor ambiguity by making the **machine-to-machine process arrow itself** the editable object. In **Edit layout → Objects → Pointers**, assign the selected machine to a process node, then choose a specific connection such as **Cutting → Polisher**. The connection has its own source-machine anchor, destination-machine anchor, visibility, line color/width/style, shape, arrowhead, and optional route tag. These values live in a dedicated `processConnections` collection and no longer edit the normal machine label or its label leader. Connections can also be added or removed independently from the process-node assignments.

## Version 0.13.21

Version 0.13.21 fully separates Today machine labels from the Necessary production-flow overlay. A normal machine label remains attached to each process machine and continues to use its own machine-label text, timing, anchor, and styling. The separate process-pointer layer now connects one assigned process machine directly to the next assigned machine and draws a compact route tag such as **Cutting → Polisher** on the connection. Process text is stored independently as `processPointerText`, so changing a machine label no longer renames the process flow and changing a process pointer no longer moves or restyles the machine label. The Pointers tab now describes process-node assignment, connection anchors, route-tag placement, and process-line styling rather than treating the process pointer as a machine label.

## Version 0.13.20

Version 0.13.20 repairs the Layout Editor pointer workflow and adds independent construction-stage label timing. Pointers now edit the active machine even when it belongs to an attached motion assembly, and process-pointer change handlers are registered only once instead of stacking every time the inspector refreshes. In **Edit layout → Objects → Pointers**, the active machine can add, reassign, remove, center, reset, and style its Necessary pointer normally. In the machine **Layout label** section, **Label appears at** and **Label disappears after** control when that machine label is shown across construction stages without changing when the physical machine appears. Today Overview continues to use the separate Necessary / Abbreviated / Full label-mode controls.

## Version 0.13.19

Version 0.13.19 makes Today / Necessary process pointers explicit and stable. Each flow label is now saved to one exact machine instance instead of being recalculated from whichever compatible machine is nearest in the current rendered view. In **Edit layout → Objects → Pointers**, select a machine and use **Necessary label** to add or reassign Cutting, Polisher, Denver CNC, Waterjet, Washer, Tempering Line, Wrap, Glass Truck, or Rack; choose **No necessary pointer** or **Remove pointer from this machine** to remove it. The existing target, tag-position, leader-line, and endpoint controls continue to edit the assigned pointer independently from normal machine labels.

## Version 0.13.18

Version 0.13.18 restores complete access to the Plant Layout edit sidebar outside fullscreen. The control area now occupies only the flexible grid row above the fixed footer, and wheel/trackpad input explicitly scrolls that region when content exceeds the visible height. The sidebar's top and height are calculated from the actual visible intersection of the model frame and browser Visual Viewport, preventing older docked-editor CSS from trapping content outside the window.

## Version 0.13.17

Version 0.13.17 fixes the remaining normal-window Plant Layout sidebar scrolling problem. The editor no longer sizes itself from a percentage of the model frame. Instead it uses the explicit visible-browser height calculated from the Visual Viewport, so the control area is always a real bounded scroll container while the **Done editing** footer remains reachable. Mouse-wheel and touch scrolling are owned by the sidebar while the pointer is over its controls.

## Version 0.13.16

Version 0.13.16 fixes the remaining non-fullscreen Plant Layout editor scrolling issue. The sidebar now has an independently scrollable control region and a fixed footer row, so **Done editing** always stays visible while every control above it can be reached. Height is derived from the browser's actual Visual Viewport and the panel's rendered position rather than estimated from the model frame.

## Version 0.13.15

Version 0.13.15 keeps the Plant Layout editor fully reachable when it is used outside fullscreen by sizing the editor against the actual remaining browser viewport. It also separates production-flow pointers from regular machine labels. A new **Pointers** tab edits each process pointer independently: target X/Y/Z on the machine, process-tag lift and X/Y screen offset, visibility, line color/width/opacity/pattern/shape, tag connection edge, and endpoint type/size. Existing saved pointer placement migrates forward so the current Today production flow keeps its layout while normal machine-label editing remains independent.

## Version 0.13.14

Version 0.13.14 removes the remaining text-encoding artifacts from the Machine Design Studio and standalone viewer surfaces. Dynamic Studio punctuation now uses encoding-safe Unicode escapes, static markup uses HTML entities, and a recursive app/public regression test blocks the mojibake patterns that produced visible `Â`/garbled punctuation. The release also completed a focused rendering and Designer performance review: designer switching, adaptive rendering, overlap detection, retained rendering, production animation caching, deep-performance checks, overview stability, production build, TypeScript, and the production dependency audit all passed.

## Version 0.13.13

Version 0.13.13 preserves the v0.13.12 production-flow and mobile-viewer improvements while hardening the deployed Machine Design Studio with SVG controls. Today production labels now support per-machine custom text, pointer placement, screen offset, line styling, connection geometry, and endpoint styling. Full-height walls and pillars also remain visible when the overview roof panel is hidden.

# Monroe Glass Plant Evolution

Current project version: **0.13.37**

## Full-production rendering performance

The production renderer retains stationary sections of animated designs, shares
opaque animated primitive meshes, and updates their transforms instead of
rebuilding the whole machine. Shape-specific rollers, wheels and beams retain
their existing geometry rules and reuse buffers. Distant curves use fewer
segments without dropping overview components; distant internal animation is
sampled at 20 or 30 Hz and nearby animation at 60 Hz. Layout controls, saved
designs, envelopes, scales and storage keys are unchanged.

Use **Performance → Run 10-second benchmark** for a quick comparison, or
**Run 60-second stability check** while zooming out/in and walking around the
fully loaded Today's Production stage. Warm up the view first and compare the
same camera, window size, mode and saved layout. Export the result to compare
FPS, CPU submission time, p95/p99 frame intervals, geometry growth and context
losses. GPU timing appears only on browsers/drivers supporting asynchronous
WebGL timer queries; unavailable GPU timing is not reported as zero cost.

Run `npm run validate:production-performance` for the synthetic retained-buffer,
animation batching, transform parity, eviction and context-recovery regressions.
These tests use real Three.js geometry with a simulated driver, not browser FPS.
Existing saved production work must be benchmarked in its original browser and
origin; a clean default scene is not a substitute for the customized plant.

## Version 0.13.12

Version 0.13.12 tightens the public labeling and mobile navigation experience. Construction stages now show full labels only for the equipment introduced in that stage, and those labels fade away when the stage advances; the Plant Offices stage explicitly labels Plant office and Maintenance. The final Today overview no longer shows normal machine labels. It automatically switches to a dedicated production-flow overlay that connects Cutting → Polisher → Denver CNC / Waterjet → Washer → Tempering Line → Wrap → Glass Truck / Rack with compact process tags, machine leaders, connector lines, and directional arrowheads. Mobile uses the same flow overlay. Mobile stage descriptions are allowed to wrap completely inside the dark stage dock instead of clipping, and two-finger panning is accelerated for easier touch navigation.

## Version 0.13.11

Version 0.13.11 is a dependency-security, hosting-optimization, mobile-polish, and workspace-publish release. Next.js and its matching ESLint config were updated to 16.3.6, the production `sharp` vulnerability was resolved, and `baseline-browser-mapping` is pinned to a safe 2.11.25 through npm overrides. `npm audit --omit=dev` reports zero production vulnerabilities. Railway production is moved from the West Coast to US East (Virginia). Mobile stage changes no longer scroll the page, phone layouts keep stage context in the compact dark stage dock instead of the desktop stage/timeline panels, Play Progress uses a formatted icon, and fullscreen/First Person now track portrait/landscape rotation. The checked-in public workspace is also refreshed from the current local Microsoft Edge editor workspace so the newest machines, labels, and layout edits publish with this version.

## Version 0.13.10

Version 0.13.10 completes Railway hosting compatibility. The private owner route remains password-only, and the checked-in published plant workspace now loads on any non-local read-only deployment instead of being limited to `*.chatgpt.site`. This keeps ChatGPT Sites and Railway on the same approved public plant/layout snapshot while preserving separate editable owner/browser workspaces.

## Version 0.13.9

Version 0.13.9 removes the ChatGPT-specific authentication dependency from the private owner route. Owner access is now controlled only by the existing editor password gate, so the same protected owner workflow can run on ChatGPT Sites, Railway, or another standard Node host without requiring ChatGPT authentication headers. The hidden five-click owner entry, session-scoped unlock, public read-only viewer, and desktop-only Machine Design Studio behavior are unchanged.

## Version 0.13.8

Version 0.13.8 is a bug-fix-only responsive QA release. It fixes the short phone-landscape overview so the model controls, playback row, and stage dock remain visible together; extends compact mobile label-density rules to coarse-touch landscape phones; and updates the CAD regression validator to match the current variable-height column renderer.

## Version 0.13.7

Version 0.13.7 rotates the owner/Machine Design Studio editor credential while keeping the same protected owner route, session behavior, and public read-only experience. The password itself is not stored in source; both access gates use the updated PBKDF2-derived hash.

## Version 0.13.6

Version 0.13.6 adds a real touch-first First Person mode for phones and tablets. Mobile viewers now get directional movement controls, drag-to-look, run, jump, crouch, and exit actions without relying on desktop pointer lock. The mobile overview label system was also tightened so Adaptive mode abbreviates sooner, limits how many labels can occupy a phone viewport, reduces repeated labels, and avoids force-showing dense label sets at normal mobile zoom.

## Version 0.13.5

Version 0.13.5 declutters the public viewer on phones and keeps editing intentionally desktop-focused. The mobile 3D viewport is taller, gesture guidance and Play progress share one compact row, public viewers no longer see editor navigation, and the hidden owner-entry version marker is reduced to a tiny corner badge. Machine Design Studio now presents a desktop-required screen on phone, tablet, and coarse-touch layouts while remaining fully available on desktop for authenticated owners.

## Version 0.13.4

Version 0.13.4 is the final responsive QA pass over the touch-first viewer. Runtime help now stays touch-correct after control refreshes, portrait touch tablets receive the same mobile-first stage/navigation treatment, and pointer-lock First Person controls stay out of phone layouts. The release also refreshes regression coverage for the current additive collision-envelope behavior.

## Version 0.13.3

Version 0.13.3 makes the public Plant Evolution viewer genuinely touch-first. Phone users can orbit the plant with one finger, pinch to zoom, pan with two fingers, and move through construction stages from a floating stage dock without leaving the 3D view. Mobile-specific gesture guidance replaces desktop mouse instructions, controls use larger touch targets, the current timeline stage automatically stays centered, and the stage details/action area is easier to read and operate on a narrow screen.

The owner Plant Layout editor also gets a more usable phone split between the 3D viewport and editing controls. Machine Design Studio becomes model-first on small screens: the 3D viewport appears before the browser/inspector panels, top actions and camera tools are touch-sized, and dense command areas scroll horizontally instead of crushing the viewport. Edge-to-edge safe-area support is enabled for modern phones.

## Version 0.13.2

Version 0.13.2 adds a discreet owner entry from the normal Plant Evolution header. Rapidly click the **Model Studio v0.13.2** badge five times within 3.5 seconds to open the private owner workspace. Normal visitors receive no visible owner link or prompt.

The hidden gesture is intentionally only a convenience route, not the security boundary: the owner workspace still requires ChatGPT sign-in and the editor password before the Plant Layout editor or Machine Design Studio can be opened. This keeps the public portfolio view clean while giving the owner a memorable way into the existing editing tools.

## Version 0.13.1

Version 0.13.1 keeps stage transitions visually sharp and adds a private hosted owner workflow. Auto rendering no longer lowers the viewport pixel ratio when a transition creates a heavy frame; it reduces distant geometry/detail and shadow work first. The stage information card also transitions without a blur filter.

The normal hosted site remains a clean read-only portfolio/company viewer. A private, non-indexed owner route requires ChatGPT sign-in and the editor password, then unlocks the existing Plant Layout editor and Machine Design Studio for that browser tab. Machine edits continue to use the established reusable design library, nested-machine tools, materials, transforms, and shared animation timeline rather than a separate editor. Hosted saves remain browser-local until an approved workspace is exported and published as the public snapshot.

## Version 0.13.0

Version 0.13.0 turns Machine Design Studio into a clear build-save-place workflow. New machines begin blank, reusable designs now have explicit Save and Save As actions, and saving a machine into the Plant Layout provides a direct handoff to position the newly created object. Redundant Designer controls were consolidated and the interface received a shared professional visual system.

Designer orbit, pan, and wheel zoom directions now match the on-screen guidance. Rendering avoids work from off-screen animations and idle first-person pointer lock, while adaptive detail responds faster to sustained slow frames. First-person culling is more conservative around nearby and peripheral machines so large objects no longer blink out at the sides of the view.

## Version 0.12.17

Version 0.12.17 prevents native browser middle-mouse autoscroll from moving the webpage while panning either 3D viewport. Middle-button drag still pans the Plant Overview and Machine Design Studio scenes normally, including when the view is not fullscreen.

## Version 0.12.16

Version 0.12.16 performs a deeper Designer-to-Plant Overview animation parity correction. Plant Overview now uses the same rotated geometry bounds and transform ordering as Machine Design Studio for all editable part types, including nested merged groups and embedded machines. This removes pivot drift that remained when cylinders, cones, wedges, beams, wheels, or other rotated parts were inside animated assemblies.

Beam rotations are no longer applied both to the beam endpoints and to its rotation fields. Nested motion-driver scaling now treats a nested group as one assembly around its own center before moving that assembly relative to the driver pivot. Custom boxes, wheels, and roller beds also use the same component-then-machine 3D transform order as the Designer, including non-uniform Plant Layout machine scaling. Legacy Pulse animations use the same shape-aware scaling logic as timeline clips.

Machine-design storage remains at **payload version 17** because these are runtime transform/rendering corrections and require no saved-data migration.

## Version 0.12.15

Version 0.12.15 keeps embedded machines at their original design-unit scale when they are inserted into another machine. Adding a saved machine no longer expands the destination design envelope automatically, because changing that envelope can cause an existing Plant Layout instance to rescale every part. If a larger reusable envelope is desired, use **Tight fit** explicitly after arranging the embedded machine.

Plant Layout animation transforms now use the same component-center conventions and rotated geometry bounds as Machine Design Studio. This fixes nested and embedded-machine pivot, rotation, scale, and motion-driver behavior that could look correct in the designer but shift or scale incorrectly in the plant view. Wheel coordinates are now consistently treated as center coordinates during Plant Layout animation transforms.

Machine-design storage remains at **payload version 17** because these corrections change runtime placement and animation math without adding saved-data fields.

## Version 0.12.14

Version 0.12.14 adds **saved machines as reusable components inside another machine**. Open the **Add** panel in Machine Design Studio, choose another saved machine design, and click **Add machine to current design**. Custom machines are listed first, the design currently being edited is excluded to prevent self-embedding, and the inserted machine is centered near the current design floor.

An inserted machine is stored as one embedded-machine group with a snapshot of the source machine's complete part hierarchy. Component and animation-clip IDs are refreshed so the same machine can be inserted more than once safely. Internal part animations remain independent and run from the destination machine's shared animation clock, while animations authored on the embedded-machine wrapper move or rotate the whole inserted assembly. The same hierarchy renders in Plant Layout. Version 0.12.15 later changed insertion so the destination envelope is not resized automatically.

Machine-design storage advances to **payload version 17** to preserve embedded-machine source metadata while keeping the existing browser storage key.

## Version 0.12.13

Version 0.12.13 audits the complete Machine Design Studio timeline animation engine and fixes discrete opacity/visibility clips. **Blink opacity** now uses raw cycle time instead of eased motion progress, so its default Step easing correctly alternates between the visible and dim portions of every cycle. Blink minimum opacity now accepts `0` for a true fully invisible blink.

**Show / hide → Toggle each cycle** now alternates state once per cycle instead of depending on eased progress. Regression coverage now samples every supported timeline animation family, while the shared machine clock, nested merged-item targeting, ripple editing, pivot rotation, fades, and rectangular split behavior from prior versions remain intact. Machine-design storage remains at payload version 16 because no saved-data field changed.

## Version 0.12.12

Version 0.12.12 puts every machine-part animation on one shared machine clock. Parts still retain separate clip collections and timeline targets, but their clip start times are now absolute positions on the same ruler. Machine-wide Loop and Machine speed settings control all nested and top-level parts together in Machine Design Studio and the Plant Layout.

Selecting a merged item from the left Parts panel now uses the same recursive animation-owner resolver as a viewport click, so it opens the nested timeline that actually drives the visible assembly instead of an empty outer target. Extending a clip's right edge now performs a ripple edit: clips that began at or after the original end are pushed right by the extension amount, while clips already overlapping the edited clip remain in place. Dragging clip bodies still creates or removes overlap normally. Machine-design storage advances to payload version 16 for the shared design timeline settings.

## Version 0.12.11

Version 0.12.11 repairs timeline recognition for deeply nested merged items. Every visible render primitive now retains the complete path from the top-level merged item through each nested group to the clicked part. The top-level item remains selected for transforms, while the Animation timeline resolves to the deepest clicked part or merged group that actually owns an animation.

When a clicked child does not own an animation, the editor follows the merged item's configured motion-driver chain to find the timeline that drives the visible assembly. The target picker also lists every nested descendant recursively, and clicking a different child inside an already selected outer group refreshes the timeline target immediately. Machine-design storage remains at payload version 15 because no saved-data structure changed.

## Version 0.12.10

Version 0.12.10 restores the stable version 0.12.8 Rotate implementation and adds a **Flip rotation animation** button. The button reverses the sign of the selected Rotate clip's existing angle, so a positive Z rotation becomes negative and vice versa without adding another saved direction field or changing the pivot-aware animation engine. Rotate clips saved by version 0.12.9 are converted back to the signed-angle format automatically.

Nested merged items now assign new animation clips to the newly created outer merged item by default. Creating an outer merge resets the timeline target away from any previously selected inner group. As a result, an animation intended for the full outer assembly remains visible after deselection and does not move onto the inner merged item when the outer assembly is separated. Machine-design storage remains at payload version 15.

## Version 0.12.8

Version 0.12.8 changes the timeline **Rotate** animation from continuous spinning to a keyed rotation that moves from 0 degrees to one requested final angle over the clip duration. The rotation stops at that angle when **Hold final value** is enabled, so a 90-degree clip produces a 90-degree turn instead of continuing through additional cycles.

Rotate clips now include local X, Y, and Z pivot offsets measured from the selected part's center. A zero offset rotates in place. Moving the pivot away from the center makes the part swing or orbit around that point. Saved timeline clips that used the older internal `spin` type migrate automatically to Rotate while preserving their axis and degree amount. Machine-design storage advances to payload version 15 without changing the browser-storage key.

## Version 0.12.7

Version 0.12.7 expands **Split into rectangles** with a selectable local spread axis and a seeded minimum/maximum column range. X, Y, and Z keep every fragment traveling only along that part axis; All axes preserves the original three-dimensional spread. New split clips choose a stable random count from three through six columns by default, and older fixed-column clips retain their original count and all-axis behavior.

The timeline also adds dedicated **Fade in** and **Fade out** clips. Fades use the clip duration and easing curve, can hold their final opacity, and can be sequenced so a faded-out part remains invisible until a later fade-in. Machine-design storage advances to payload version 14 without changing the browser-storage key.

## Version 0.12.6

Version 0.12.6 adds a seeded **Split into rectangles** timeline animation. A selected part or merged item is divided into an even rectangular grid, then each fragment moves and rotates in a stable pseudo-random direction. The same saved seed produces the same pattern in Machine Design Studio and the Plant Layout.

The clip inspector provides columns, rows, depth layers, spread distance, rotation scatter, and random seed controls. Existing timelines remain compatible, and machine-design storage advances to payload version 13 without changing the browser-storage key.

## Version 0.12.5

Version 0.12.5 repairs oversized timeline spans, enlarges the bottom animation workspace, moves animation creation into the right inspector, and fixes animation deletion.

### Timeline repair and layout

1. Timeline length is automatic: it starts at 30 seconds and only grows when a clip ends later.
2. Legacy or corrupted saved span values such as `886370` are discarded without removing any clips.
3. The bottom timeline is taller and uses the full viewport width because the animation palette now lives in **Selected part → Animation** on the right.
4. Click an animation type in the right panel to append it, or drag it from the right panel onto an exact time.
5. Delete removes the selected animation from the saved part timeline. The Delete or Backspace key performs the same action while the animation timeline is open.

## Version 0.12.4

Version 0.12.4 makes the docked Machine Design Studio timeline easier to control precisely. Every animation type now starts with a practical preset duration, the timeline always begins as a 30-second workspace, and the ruler automatically extends when a clip ends after 30 seconds.

### Timeline workflow improvements

1. Select a part and open **Animation** beneath Pan.
2. Click an animation type to append it after the current last clip using that type's preset duration.
3. Drag an animation type onto the ruler to place it at an exact time instead.
4. Clips that do not overlap share the same lane from left to right. Overlapping clips move to additional lanes automatically.
5. Select a clip before resizing it. Only that clip's orange left and right handles accept resize input.
6. Dragging uses a fixed 44-pixel-per-second scale, so small mouse movements create small timing changes.
7. Use the separate **Play**, **Pause**, and **Restart** buttons while previewing.

The default presets range from 2 seconds for visibility and wait clips to 8 seconds for four-step paths. All durations remain editable in the right inspector.

## Version 0.12.3

Version 0.12.3 moves part animation into a docked timeline workspace at the bottom of Machine Design Studio. The **Animation** button now appears directly under **Pan** in the upper-left tool rail. The timeline exposes every supported animation type at once, supports drag-and-drop placement, lets clips be moved before or after other clips, and lets either clip edge be dragged to change its timing.

### Docked timeline workflow

1. Select one machine part.
2. Click **Animation** under the Pan tool, or press `A`.
3. Click an animation type to add it at the playhead, or drag the type onto an exact timeline position.
4. Drag a clip left or right to change its start time. Clips snap to the selected time step and to neighboring clip edges.
5. Drag the left or right clip handle to change the start or duration.
6. Click a clip to switch the right inspector to that animation's complete settings.
7. Use Play, Pause, Restart, the playhead, timeline looping, playback speed, explicit length, and timeline snap controls while previewing.

The right inspector retains all type-specific settings: clip name, type, enabled state, start, duration, cycle timing, endpoint pauses, repeat count, easing, phase, yoyo, hold behavior, axes, distance, rotation, scale, opacity, visibility, and four-step corner pauses. Merged items can still target either the whole assembly or an individual child.

## Version 0.12.2

Version 0.12.2 added a visual, clip-based animation timeline to every machine part and reorganized all major editing panels into focused tabs. Each part can contain multiple sequential or overlapping clips with exact timing, easing, axes, distances, rotation, cycles, endpoint pauses, cycle pauses, visibility, opacity, and playback settings. Saved timelines preview in Machine Design Studio and play on linked machines in the Plant Layout.

The Designer left panel uses **Library**, **Parts**, **Add**, and **Plant** tabs. The Plant Layout editor uses **Objects**, **Structure**, **Stages**, and **Project**, with the Objects section divided into **Select**, **Transform**, **Animation**, and **Add**.

## Version 0.12.1

Version 0.12.1 makes Machine Design Studio envelopes precise enough to hug the actual machine geometry. Envelope dimensions now accept values down to 0.01 ft, the viewport can display the envelope outline, and **Tight fit to parts** can use zero or user-defined edge clearance. Tight custom dimensions are preserved when the design is added to or synchronized with the Plant Layout.

### Tight-envelope workflow

1. Open the Design tab in Machine Design Studio.
2. Expand **Design envelope**.
3. Leave edge clearance at `0` for an exact axis-aligned fit, or enter a small clearance in inches.
4. Choose whether to fit all parts or only visible parts.
5. Select **Tight fit to parts**.
6. Keep **Show envelope outline in the viewport** enabled while checking the result.

## Version 0.12.0

Version 0.12.0 makes reusable Machine Design Studio models directly available from the Plant Layout editor. Open **Edit layout**, scroll to **Add to the 3D model**, choose a saved designer machine, set its name, appearance stage, and placement, then insert it without leaving the plant page.

### Add a designer-created machine from Plant Layout

1. Create and save a reusable machine in **Machine Design Studio**.
2. Return to the Plant Layout and choose **Edit layout**.
3. Scroll down and open **Add to the 3D model**.
4. Choose the machine under **Saved designer machine**.
5. Optionally change its Plant Layout name, appearance stage, and placement method.
6. Select **Add designer machine**.
7. The new object is selected and focused automatically. It remains linked to the reusable design for later updates.

The panel has a **Refresh** action for designs saved in another tab and a **Create or edit designs** shortcut. Existing standard machines, carts, cranes, animations, floor features, rooms, and other objects remain available under the condensed standard-object section.

## Version 0.11.9

Version 0.11.9 restores the complete CAD-derived pillar layout inside the original plant footprint. Earlier builds intentionally loaded only the first 96 column anchors even though `public/plant-data.js` contains 118. The omitted eastern structure anchors are rendered, selectable, removable, restorable, collision-enabled, and included in shadows and first-person navigation.

### Existing-layout pillar restoration

- All 118 CAD column anchors load inside the original structure.
- The previously omitted eastern column lines near X = 180–226.54 ft are restored.
- Existing hidden-column indices remain compatible.
- Newly restored columns default to visible and do not reset machines, floor dimensions, animations, or custom designs.
- Automatic extension columns generate only outside the original CAD footprint.

## Version 0.11.8

Version 0.11.8 adds a direct **Add new machine to Plant Layout** workflow. Build a reusable design, choose a name, appearance stage, and placement method, then create a new linked Plant Layout instance without modifying an existing machine. New instances use the design envelope as their starting dimensions and continue to receive later saved design changes. See `docs/CREATING_MACHINES.md`.

### Create-machine workflow

1. Open **Machine Design Studio** and choose **New**.
2. Build the machine from parts and set its design envelope.
3. Expand **Use in plant layout**.
4. Enter a machine name and choose its appearance stage and placement method.
5. Select **Add new machine to Plant Layout**.
6. Continue editing the design; the new plant instance remains linked and updates automatically.

## Version 0.11.7

Version 0.11.7 automatically continues the plant's structural column grid when the floor is widened, lengthened, or repositioned beyond the original CAD footprint.

### Structural extension workflow

1. Open **Edit layout → Structure**.
2. Increase the floor **Width** or **Length**, or change its center.
3. Leave **Extend the CAD column grid into new floor sections** enabled.
4. New supports appear on the continued 40 × 30 ft bay pattern only in the added structure area.
5. Adjust **X bay spacing** or **Z bay spacing** when a future building section uses a different structural module.
6. Click any original or generated pillar with the Structure tool to remove it; **Restore every pillar** restores both types.

The original CAD pillars are preserved in place and are not regenerated or duplicated. Generated columns have stable identifiers, so hidden extension columns remain hidden through reloads, undo/redo, and layout JSON export/import. First-person collision and shadows also include the generated structure.

For unusually large floors, the renderer retains grid alignment while reducing column density by an integer stride to prevent a single dimension edit from creating an unsafe number of models.

## Version 0.11.6

Version 0.11.6 corrects first-person orientation and perspective depth. Entering first person now faces the same direction represented by the overview camera, and opaque machines, walls, wheels, and components correctly hide geometry behind them.

### First-person workflow

1. Open the Plant Layout and select **First person**.
2. The model expands to the full browser window and attempts to enter browser full-screen mode.
3. Click the model or choose **Capture mouse** if the mouse is not already captured.
4. Use **W/A/S/D** to walk, the mouse to look around, **Shift** to sprint, **Space** to jump, and **Ctrl** or **C** to crouch.
5. Press **Esc** once to leave first-person mode and return to the saved overview camera.

### Fixed in 0.11.6

- First-person depth now uses reciprocal perspective depth rather than linearly interpolated camera distance.
- Opaque foreground geometry correctly occludes rear geometry while walking.
- The overview orbit angle is converted to the matching first-person look direction on entry.
- Existing WASD, mouse-look, collision, jump, crouch, and one-step Escape behavior remain unchanged.

### Fixed in 0.11.5

- Stale focus on the toolbar or HUD buttons no longer blocks WASD input.
- Losing pointer lock through the browser Escape action requests a full first-person exit.
- Escape key handling also exits directly when the browser delivers the key event to the page.
- Entering first person clears the previously focused control and focuses the model canvas.

### First-person camera and collision

- Uses a true perspective field of view rather than the previous zoomed orthographic view.
- Clips geometry at the camera near plane so walls, floors, and machines do not invert or stretch when the camera gets close.
- Stops at visible solid machines, structural pillars, exterior boundaries, and walls.
- Slides along obstacles when only one movement axis is blocked.
- Searches for a nearby safe starting location if the current overview target is inside a machine or pillar.
- Includes optional walking motion, adjustable eye height, walking speed, field of view, mouse sensitivity, and collision toggle.
- Restores the exact overview camera used before entering first-person mode.

### Compatibility

The update does not change the Plant Layout, Machine Design Studio, machine-design, or rendering-preference storage keys. Existing layouts, designs, animations, floor features, walls, pillars, labels, and timeline edits remain unchanged.

## Version 0.11.3

Version 0.11.3 introduces a compact, zoom-aware machine-label system so the plant remains readable from overview distances without removing useful identification.

### Smart label workflow

- **Smart labels** is the default. Major production equipment remains labeled at wider views, support objects appear as the camera moves closer, and small carts, people, and animation helpers appear only at close range.
- The label button cycles through **Smart labels**, **All labels**, and **Labels off**.
- Production equipment uses larger label text; cranes, rooms, and racks use medium labels; carts, team members, and animation objects use smaller labels.
- Labels use the existing short name when available, remove repeated words such as “machine” and “equipment,” and truncate long names at a readable word boundary.
- Selected objects and objects entering on the current timeline stage remain labeled regardless of zoom.
- Important labels are placed first and use a viewport-based label budget plus collision avoidance so labels do not cover the complete model.

### Compatibility

The update does not change the Plant Layout or Machine Design Studio storage keys. Existing machine names, custom short names, object visibility settings, layouts, designs, animations, floor features, walls, pillars, and timeline edits remain unchanged.

## Version 0.11.2

Version 0.11.2 repairs Plant Layout scaling and makes the scaling controls easier to read and understand.

### Scaling workflow

- Choose **Uniform** to keep width, height, and depth proportional. Enter one percentage value in the full-width scale field.
- Choose **Individual axes** to scale X, Y, and Z independently using three larger numeric fields.
- The selected mode is saved per object and synchronized with Machine Design Studio.
- Editing width, depth, or height while Uniform is selected scales the complete object proportionally. In Individual mode, only the entered dimension changes.
- Custom machine designs now use the chosen instance scaling mode when rendered in Plant Layout, including objects that were previously in Match design dimensions mode.

### Compatibility

Existing layouts remain under `monroe-glass-plant-layout-v6`. Older objects infer their initial scaling mode from their saved axis percentages and design-sizing mode, so the update does not reset current sizes or placements.

## Version 0.11.1

Version 0.11.1 focuses on smooth interaction and predictable frame pacing. Both 3D editors now share an adaptive rendering controller that reduces unnecessary redraw work without removing model or animation capabilities.

### Performance system

- **Auto** is the recommended default. It adapts render resolution after sustained slow or fast frame windows.
- **Balanced** uses moderate geometry detail, reduced shadows, and a 30 FPS animation target.
- **Quality** increases resolution, curved-surface detail, shadow layers, and the animation target.
- **Performance** lowers curved-surface detail, disables shadows, and targets 24 FPS for animation-heavy layouts.
- Direct orbiting, dragging, transforming, and zooming temporarily use a higher interaction frame rate.
- Static scenes redraw at a low idle rate, and hidden browser tabs stop rendering.
- The Performance panel is available in both the Plant Layout and Machine Design Studio. It can also show a live FPS badge.

### Rendering optimizations

- Objects and pillars outside the visible viewport are culled before model geometry is generated.
- Custom-model shadows use a bounded component budget; pillar shadows are reserved for Quality or Full-shadow modes.
- The WebGL renderer reuses its vertex buffer, caches parsed colors, and avoids an extra depth array each frame.
- Machine Design Studio no longer subdivides every large face into many painter-order cells when WebGL depth testing is available.
- Very large designer envelopes use adaptive grid spacing instead of creating thousands of grid lines.
- Existing layouts and machine designs are preserved; performance preferences use a separate browser-storage key.

## Version 0.11.0

Version 0.11.0 unifies exact transforms between the Plant Layout and Machine Design Studio, stabilizes very large floor dimensions, improves shadow footprints, and adds closer camera controls plus a low-height walkthrough mode.

### Transform synchronization

- Plant objects now expose exact X/Y/Z position, X/Y/Z rotation, final width/depth/height, and uniform or per-axis scale percentages.
- Machine Design Studio exposes the same Plant Layout instance values in a dedicated synchronized panel.
- Changes made on either page are saved to the same browser layout and broadcast to other open project tabs.
- Designer parts have exact position, rotation, final dimensions, and uniform/per-axis scale percentages. Direct dimension edits and transform-handle scaling keep percentage metadata synchronized.

### Structure and camera updates

- Floor width and length are clamped to a supported 40–5,000 ft range.
- Large floors use adaptive grid spacing and a hard grid-line limit, avoiding the runaway render work that could freeze the page.
- The Plant Layout supports closer zoom, a low-angle overview, and a low-height walkthrough camera using WASD, Q/E, mouse drag, Shift, and Escape.
- Machine Design Studio supports closer zoom and a lower camera preset.

### Models and shadows

- Safety-yellow markings, utility trenches, and square floor drains now have reusable Design Studio presets and can be opened as linked editable designs.
- Custom machine shadows are generated from individual visible parts rather than one oversized machine envelope.
- Crane shadows use their posts and beams, preventing a bridge crane from casting one giant rectangular shadow.
- The Layout Editor’s frame-selection controls and exact-transform sections were reformatted for clearer use.
- Machine-design payloads advance to version 10 while retaining the existing browser storage key; older designs normalize to 100% scale.

## Version 0.10.6

Version 0.10.6 adds proportion-safe assignment between Machine Design Studio and the Plant Layout. Custom designs now default to uniform scaling, can optionally synchronize the plant object's dimensions to the design envelope, and retain the previous independent-axis stretch mode when intentionally selected.

### Design sizing modes

- **Preserve proportions** uniformly scales the complete design and centers it in the plant object's width/depth footprint. This is the recommended default and keeps wheels round, beam sections consistent, and rotated parts proportional.
- **Match design dimensions** updates the plant object's width, depth, and height to the design envelope and keeps those dimensions synchronized as the linked design changes.
- **Stretch to plant object** retains the earlier independent X/Y/Z scaling behavior for intentionally stretched models.
- **Sync plant dimensions to design** is available in both the Plant Layout editor and Machine Design Studio.

## Version 0.10.5

- Adds four independent pause timers to four-step paths: after step 1, step 2, step 3, and step 4.
- Supports timing such as up → wait 5s → forward → wait 5s → down with no wait → backward with no wait.
- Preserves v0.10.4 timing by migrating axis 1 waits to steps 1/3 and axis 2 waits to steps 2/4.
- Adds soft, depth-tested projected shadows beneath movable plant objects, machines, cranes, carts, people, pillars, and Machine Design Studio parts.
- Shadows move with animated objects and remain correctly hidden by opaque machine bodies and walls.
- Machine-design exports advance to payload version 9 while retaining the same browser storage key.

## Version 0.10.4

- Adds a separate axis 2 pause timer to four-step animations.
- Axis 1 pause is used after the first and third legs.
- Axis 2 pause is used after the second and fourth legs.
- Existing four-step animations preserve their old timing by inheriting the axis 1 pause when no axis 2 value has been saved yet.
- Supports scene objects, regular machine parts, and individual children inside merged machine assemblies.

## Version 0.10.3

- Merged machine components now expose a child selector so every attached part can keep, disable, or edit its own local animation independently.
- The attachment parent carries the full assembly exactly once; children inherit that transform and optionally add their own motion layer.
- Scene-object attachments now include an active-member picker and an explicit own-animation control for each child.
- Added a local-axis four-step path animation: axis 1 forward, axis 2 forward, axis 1 backward, axis 2 backward. This supports paths such as up → forward → down → backward.
- Four-step paths support independent distances, object-relative axes, speed, phase, and a pause at every corner.
- Existing merged designs and layout attachments migrate without changing storage keys. Identical child/parent animations created by older merges default to inherited-only until the child’s local layer is enabled.

## Version 0.10.2

- Multi-selected parts and plant objects can now share settings without being merged.
- Merged animation hierarchies suppress duplicate child motion when children match the parent, preventing doubled speed, excessive travel, and diagonal drift.
- The Plant Layout and Machine Design Studio now pause animations in place and resume from the same frame.


Interactive 3D construction timeline and editable plant-layout model for the Monroe glass plant. The horizontal footprint is grounded in `Monroe Archs w Updates 1-23-25 (002).dwg`; machine detail, vertical dimensions, and photo-correlated placements remain editable interpretations.

## Version 0.10.1

Motion assemblies now use a true parent/child hierarchy instead of applying every animation channel to every object. Choose a **Motion parent** in the Plant Layout and attach the other selected objects to it. The parent carries its children, while each child continues to play its own animation in the parent’s moving coordinate space.

Example: a bridge can travel back and forth on Z while an attached trolley travels on X. The bridge only moves on Z; the trolley inherits the bridge’s Z motion and simultaneously moves on X without detaching. Nested parent/child chains are supported, so a tool head can inherit trolley motion, which already inherits bridge motion.

Merged items in Machine Design Studio now use the same principle. The **Attachment parent** child drives the complete merged assembly, while every other child retains its individual animation. The active part at merge time becomes the initial attachment parent, and it can be changed later in the merged item’s Animation section.

## Version 0.10.0

Machine Design Studio now uses a cleaner slicer-style workflow without removing advanced controls:

- Compact design and assignment actions
- Focused parts tree and categorized shape picker
- Collapsible transform, dimension, animation, and machine-property sections
- Local and World transform orientation
- Corrected beam length and cross-section scaling
- Closed depth-tested beam geometry in the Plant Layout
- New cylinder, sphere/ellipsoid, cone/hopper, and wedge/ramp shapes

The complete primitive library is:

- Box / cabinet
- Cylinder / tank / post
- Sphere / ellipsoid / indicator
- Cone / hopper
- Wedge / ramp / sloped guard
- Glass panel
- Rectangular beam
- Circular roller bed
- Wheel / caster
- Merged component group

Every primitive supports movement, X/Y/Z rotation, independent X/Y/Z scaling, color, opacity, visibility, duplication, grouping, and part animation. Local transforms follow the part’s current orientation; World transforms follow the fixed design grid. For beams, local X changes length, local Y changes height, and local Z changes width.

## Plant Layout

Choose **Edit layout** to open the docked editor. The current system supports:

- Moving, resizing, rotating, renaming, hiding, locking, copying, and deleting scene objects
- Multi-selection with Shift/Ctrl/Command-click
- Collective color changes and grouped movement
- Hierarchical motion assemblies with a selectable parent and independently animated children
- Machines, cranes, A-frame carts and trucks, glass racks, rooms, team members, general boxes, and floor features
- Editable safety lines, utility trenches, drains, floor width, floor length, and floor position
- Editable appearance/disappearance stages and timeline stages
- Local-axis scene animation direction, pauses, speed, phase, and travel distance
- Layout import/export, undo/redo, browser persistence, and live Machine Design Studio synchronization

## Machine Design Studio

Open `/machine-studio` or `public/machine-studio.html`.

Typical workflow:

1. Duplicate the closest supplied design.
2. Open **Parts** and select a component.
3. Choose Select, Move, Rotate, Scale, or Pan.
4. Keep **Local** selected when editing a rotated part; switch to **World** for grid alignment.
5. Use the colored handles for visual edits and the inspector for exact values.
6. Merge related parts when they should stay connected. Select the intended motion parent last before merging, or change the merged item’s Attachment parent afterward.
7. Fit the design envelope around the finished machine.
8. Assign the design to one plant object or every matching object type.

Opening a plant object directly in Machine Design Studio creates or reuses a machine-linked design. Saved changes update that object in the Plant Layout using browser storage events and a same-origin broadcast channel.

## Timeline and animations

The project contains 18 initial construction stages. Timeline Studio can rename, insert, delete, reorder, and describe stages.

Scene and machine-part animations support:

- Back-and-forth movement
- Continuous loop movement
- Keyed X/Y/Z or all-axis timeline rotation with local pivot offsets
- Legacy continuous scene and part spin controls
- Vertical bob
- Axis-specific pulse
- Blink
- Adjustable amount, speed, pause duration, and phase

Attached scene objects retain their own animation settings while inheriting the motion of their parent and every ancestor. Parent motion is not incorrectly driven by child animation.

## Storage compatibility

- Plant layout key: `monroe-glass-plant-layout-v6`
- Plant layout schema: 6
- Machine design key: `monroe-glass-machine-designs-v1`
- Machine design payload: 6

The storage keys remain unchanged. Existing moved machines, added objects, custom designs, assignments, animations, floor features, floor dimensions, timeline edits, walls, and hidden pillars remain available when the updated project is opened from the same browser profile and website address.

Export the current layout JSON before a major update to create a portable backup.

## Run

Use Node.js 22.13 or newer:

For normal local revision and viewing on Windows, double-click:

```text
Start Plant Overview.bat
```

The launcher finds the per-user Node.js installation, installs dependencies on
the first run when needed, rebuilds the current source, opens
`http://127.0.0.1:4173`, and starts the optimized local server. Keep the command
window open while working and press `Ctrl+C` when finished. Restart the launcher
after changing source files so the optimized site is rebuilt. The server listens
only on this computer, so it does not require a Windows Firewall exception.

There is intentionally one Windows launcher. The development/HMR server was
removed from the normal workflow because its retained debugging runtime and
route reloads distort graphics performance after moving between Machine Design
Studio and the full production layout. The optimized launcher also applies a
Windows compatibility fix for vinext's generated asset cache before each build;
without it, the HTML can load while every generated CSS and JavaScript file
returns 404 and the page appears as unstyled text.

The local address is intentionally fixed at port `4173`, matching the standalone
`preview.html` workflow below. Because browser storage belongs to the origin
rather than the page path, the current site can reuse the layouts, machine
designs, backups, and rendering preferences previously saved by the preview.
Close the old Python preview server before using the launcher. Do not allow a
second server to move to another port. Export the layout JSON before moving
revisions between the local and published sites.

If an older `preview.html` still shows saved work that the current site cannot
see, transfer the complete browser workspace:

1. Open the preview where the saved work is visible.
2. Choose **Edit layout → Project → Export full workspace**.
3. Start the current site with `Start Plant Overview.bat`.
4. Choose **Edit layout → Project → Import full workspace** and select the
   downloaded workspace JSON.

The full workspace contains every `monroe-glass-` browser-storage entry,
including current and legacy layouts, automatic layout backups, custom machine
designs, and rendering preferences. The normal layout-only export remains
available for sharing just the plant layout.

Manual optimized startup:

```powershell
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 4173
```

Standalone preview:

```powershell
py -m http.server 4173 --bind 127.0.0.1
```

Open:

- Plant Layout: `http://127.0.0.1:4173/public/preview.html`
- Machine Design Studio: `http://127.0.0.1:4173/public/machine-studio.html`

## Validation

```powershell
npm run validate:js
npm run validate:rendering
npm run validate:animations
npm run validate:floor
npm run validate:wheels
npm run validate:selection
npm run validate:motion-groups
npm run validate:designer
npm run validate:animation-timeline
npm run validate:editor-tabs
```

## Important files

- `public/plant-app.js` — plant rendering, timeline, layout editor, animations, floor features, and persistence
- `public/machine-design-studio.js` — machine component editor and timeline interface
- `public/animation-timeline.js` — shared clip normalization and timeline evaluation engine
- `public/machine-designs.js` — supplied component-based design presets
- `public/depth-scene-renderer.js` — shared WebGL depth renderer
- `public/plant-data.js` — normalized CAD footprint
- `cad/machine_registry.json` — baseline machine placements and evidence
- `cad/export_machine_registry.py` — regenerates `public/machine-data.js`
- `app/globals.css` — shared Plant Layout and Design Studio styling
- `docs/MACHINE_DESIGN_STUDIO.md` — detailed designer controls and workflow
- `docs/ANIMATION_TIMELINE.md` — part timeline clip types and settings
- `docs/EDITOR_PANELS.md` — tab organization for both editors
- `docs/MODEL_REFERENCES.md` — machine research and modeling references

## Scope

This project is intended for recognizable block models, planning, communication, and construction-progress visualization. It is not a substitute for surveyed as-built geometry, vendor CAD assemblies, certified clearances, structural calculations, or rigging plans.

## First-person rendering

Version 0.11.6 corrects first-person camera handedness and uses reciprocal perspective depth for opaque-surface occlusion. The change prevents geometry behind cabinets, machines, wheels, and walls from appearing through the foreground while keeping transparent glass intentional. Entering first person now faces the same general direction as the overview camera.