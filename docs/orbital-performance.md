# Orbital animation performance and accessibility

The page has one persistent main landmark around the hero and portfolio. The
keyboard-visible “Skip to projects” link completes the reveal and focuses the
first project. Pause/resume freezes the animation clock and stops its continuous
render loop; theme, resize, and reveal changes can still redraw the paused scene.
Reduced-motion preferences continue to avoid downloading the scene entirely.

## Animation rollback

The animation optimizations were rolled back after a reported PageSpeed
regression. Runtime font parsing, Fourier calculations, the original robot-arm
solver, and per-frame calculations are restored in `src/lib/orbitalScene.ts`.
Scene construction remains synchronous after the lazy module import, but now
runs in a rendering worker where supported. There is no separate lettering
download or shader-preparation wait.

The lazy scene import waits two seconds after mounting, then starts during browser
idle time (with a two-second idle timeout). Browsers without idle callbacks start
after the initial delay. The static signature remains visible until the scene is
ready. Offscreen or collapsed intros do not start the download; scrolling back
into view can schedule it again. Reduced motion continues to skip loading.
This reduces initial network/CPU competition but does not split synchronous scene
construction or guarantee lower LCP or Total Blocking Time.

## Worker rendering prototype

Supported browsers transfer the canvas to a dedicated worker using
`OffscreenCanvas`. The worker runs the same Three.js scene, lettering calculations,
robot-arm solver, bloom and frame loop. The main page retains layout, scrolling,
accessibility and controls, forwarding theme, reveal, pause, replay, resize and
visibility updates. Hidden pages and paused animations stop continuous frames.

Worker WebGL2 and animation-frame support are probed before transferring the
visible canvas. Unsupported browsers use the main-thread renderer. Worker startup
or runtime failures replace the transferred canvas and retry on the main thread;
if that also fails, the static signature remains. Component teardown cancels
pending startup and terminates its worker.

Add `?orbital=main` to force the main-thread renderer for comparison. The default
uses worker rendering when supported. Both paths retain the same startup delay
and rendering quality. Workers move work off the main thread; they do not remove
GPU cost or guarantee a PageSpeed score. CPU throttling of worker threads may
differ from main-thread throttling in DevTools, so compare responsiveness and
thread attribution rather than claiming equivalent total CPU measurements.

The lettering build script, binary dependency, optimized solver helpers, and
optimization-specific tests were removed. Responsive-image generation and the
accessibility features above remain. Rendering quality and animation timing are
unchanged. Pause/resume only changes animation behavior when explicitly used.

## Verification

Run `npm test` and `npx tsc --noEmit`. Check the production preview on desktop
and mobile: both themes, skip-link focus, pause/resume, scrolling while paused,
returning to the hero, and reduced motion.

Compare PageSpeed/DevTools measurements under the same CPU throttling, viewport,
and cache conditions. Animation duration is not Total Blocking Time: TBT counts
the portion beyond 50ms of long main-thread tasks in the measured interval.
The “Other” bucket does not identify a specific bottleneck by itself. Restoring
the previous animation implementation does not establish a new PageSpeed score.
