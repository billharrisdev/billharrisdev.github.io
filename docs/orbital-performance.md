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
Scene construction is synchronous again after the existing lazy module import;
there is no separate lettering download or shader-preparation wait.

The lazy scene import waits two seconds after mounting, then starts during browser
idle time (with a two-second idle timeout). Browsers without idle callbacks start
after the initial delay. The static signature remains visible until the scene is
ready. Offscreen or collapsed intros do not start the download; scrolling back
into view can schedule it again. Reduced motion continues to skip loading.
This reduces initial network/CPU competition but does not split synchronous scene
construction or guarantee lower LCP or Total Blocking Time.

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
