# Orbital animation performance and accessibility

The page has one persistent main landmark around the hero and portfolio. The
keyboard-visible “Skip to projects” link completes the reveal and focuses the
first project. Pause/resume freezes the animation clock and stops its continuous
render loop; theme, resize, and reveal changes can still redraw the paused scene.
Reduced-motion preferences continue to avoid downloading the scene entirely.

## Fidelity-preserving changes

- `npm run lettering` precomputes the existing font contours, Fourier harmonics,
  and trace points into `src/generated/orbital-lettering.bin`. It runs before
  development/builds alongside responsive-image generation. The browser no
  longer imports FontLoader or the font JSON, or runs the Fourier transform.
- The binary stores little-endian float64 values without rounding. Tests compare
  every harmonic and contour point with the original computation exactly.
- `src/lib/orbitalKinematics.ts` updates only the robot arm's centerline and the
  affected transform suffix during IK. The renderer updates decorative meshes
  normally. The same eight iterations, joint ordering, and angle limits remain.
  Tests compare poses with the previous solver and require fewer than one-third
  as many matrix updates in the test rigs.
- Per-frame vectors, harmonic selections, and orbit radii are reused. Duplicate
  trigonometric calls and unchanged draw-range updates are avoided. Invisible
  epicycles are not updated after tracing finishes.
- Scene setup fetches the local precomputed data asynchronously, yields before
  renderer creation, and uses Three.js `compileAsync` before revealing the canvas.
  Its benefits depend on the browser's parallel shader compilation support.
- Bloom settings, geometry, stars, antialiasing, pixel ratio, 24-second tracing,
  camera motion, and robot wrist motion are unchanged. No frame-rate cap or
  automatic quality reduction was introduced.

## Verification

Run `npm test` and `npx tsc --noEmit`. Check the production preview on desktop
and mobile: both themes, skip-link focus, pause/resume, scrolling while paused,
returning to the hero, and reduced motion.

Compare PageSpeed/DevTools measurements under the same CPU throttling, viewport,
and cache conditions. Animation duration is not Total Blocking Time: TBT counts
the portion beyond 50ms of long main-thread tasks in the measured interval.
The “Other” bucket does not identify a specific bottleneck by itself. These
changes reduce known work, but do not establish a new PageSpeed score.

An OffscreenCanvas worker is a possible next step if profiling still shows the
scene dominating main-thread work. It was not added in this pass; moving rendering
requires browser-support fallbacks and further visual/lifecycle testing.
