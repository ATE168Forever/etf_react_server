/* eslint-env jest */
import { StrictMode } from 'react';
import { act, render } from '@testing-library/react';
import TooltipText from '../src/components/TooltipText';

// Manual browser repro that confirmed the root cause (2026-08-30):
//
// jsdom has no native matchMedia/MediaQueryList implementation, so it
// cannot reproduce how a real browser *dispatches* matchMedia 'change'
// events. The jsdom mock below fires every subscriber synchronously in
// one loop inside a single `act()`, so it always looks "batched" to
// React no matter how many listeners are registered -- it can prove the
// fixed (single-shared-listener) architecture behaves correctly, but it
// could not have caught the original bug on its own.
//
// To find the real cause, the dev server was pointed at a live backend
// and driven with Chrome via Playwright:
//   1. Loaded the "Explore ETFs" tab (StockTable), which renders 86
//      <TooltipText> cells (one per stock name / column header tooltip).
//   2. Resized the viewport across the 768px breakpoint (1024 -> 390
//      and back), which is exactly what a user dragging the window, or
//      rotating a phone, does.
//   3. React logged "Maximum update depth exceeded" (error #185) from
//      `MediaQueryList.handleChange` in TooltipText.jsx on *every* such
//      crossing, in both directions, 100% reproducibly.
//   4. Instrumenting handleChange to timestamp each invocation showed
//      86 separate calls spread over ~53ms (~0.5-1.4ms apart) for a
//      single crossing -- i.e. NOT one batched React update, but 86
//      independent ones. Each <TooltipText> instance was creating its
//      own `window.matchMedia(query)` and registering its own native
//      'change' listener; a real browser dispatches one 'change' event
//      per MediaQueryList object as a separate task, so all 86 fired as
//      86 separate, unbatched React commits to the same root in rapid
//      succession. That blows past React's internal nested-update
//      guard (~50) and throws #185 -- with no actual infinite loop
//      involved, just an unbatched burst proportional to table size.
//
// Fix: TooltipText.jsx now shares a single native MediaQueryList + one
// 'change' listener per breakpoint query (module-level, ref-counted),
// and fans out to every subscribed component from inside that one
// callback. All resulting setState calls then happen in one JS turn,
// so React's automatic batching folds them into a single commit
// regardless of how many <TooltipText> cells are mounted. The
// `listenerCount()` assertions below are the regression guard for this:
// if the shared-listener architecture ever regresses back to one
// native listener per instance, `listenerCount()` jumps from 1 back up
// to the cell count and these tests fail.

// Tracks the active render's unmount fn so afterEach can always tear it
// down -- if an assertion earlier in a test throws, the test body's own
// unmount()/delete window.matchMedia calls never run, leaving a stale
// entry in TooltipText.jsx's module-level mediaQuerySubscriptions map
// that can confuse a later, unrelated test's listenerCount() result.
let activeUnmount = null;

afterEach(() => {
  if (activeUnmount) {
    activeUnmount();
    activeUnmount = null;
  }
  delete window.matchMedia;
});

function installMatchMediaMock(initialMatches = false) {
  const listeners = new Set();
  let matches = initialMatches;

  window.matchMedia = jest.fn().mockImplementation((query) => ({
    media: query,
    get matches() {
      return matches;
    },
    addEventListener: (event, handler) => {
      if (event === 'change') listeners.add(handler);
    },
    removeEventListener: (event, handler) => {
      if (event === 'change') listeners.delete(handler);
    },
  }));

  return {
    setMatches(next) {
      matches = next;
      const event = { matches };
      [...listeners].forEach((handler) => handler(event));
    },
    listenerCount: () => listeners.size,
  };
}

test('many TooltipText cells mounted together survive StrictMode and repeated breakpoint crossings without React error #185', () => {
  const media = installMatchMediaMock(false);
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  const { unmount } = render(
    <StrictMode>
      <table>
        <tbody>
          <tr>
            {Array.from({ length: 60 }, (_, i) => (
              <td key={i}>
                <TooltipText tooltip={`Yield ${i}: 5%`}>{i}</TooltipText>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </StrictMode>
  );
  activeUnmount = unmount;

  // All 60 cells share the same breakpoint query, so they share a single
  // native MediaQueryList + listener (see the module-level comment
  // above). StrictMode double-invokes effects in dev; cleanup must
  // still leave exactly one shared listener, not zero and not two.
  expect(media.listenerCount()).toBe(1);

  act(() => {
    media.setMatches(true);
    media.setMatches(false);
    media.setMatches(true);
  });

  const maxUpdateDepthLogged = consoleError.mock.calls.some(([message]) =>
    typeof message === 'string' && message.includes('Maximum update depth exceeded')
  );
  expect(maxUpdateDepthLogged).toBe(false);
  expect(media.listenerCount()).toBe(1);

  unmount();
  activeUnmount = null;
  // Every subscriber unmounted -> the shared listener is torn down too.
  expect(media.listenerCount()).toBe(0);

  consoleError.mockRestore();
});

test('a large number of TooltipText cells (production-scale table) mount and unmount cleanly with a single shared listener', () => {
  const media = installMatchMediaMock(true);
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  // 200 cells is comfortably above the ~86 seen live on the "Explore
  // ETFs" table and well past React's internal nested-update guard
  // (~50), so this stands in for the scale that actually triggered
  // error #185 before the shared-listener fix.
  const { unmount } = render(
    <StrictMode>
      <table>
        <tbody>
          <tr>
            {Array.from({ length: 200 }, (_, i) => (
              <td key={i}>
                <TooltipText tooltip={`Yield ${i}: 5%`}>{i}</TooltipText>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </StrictMode>
  );
  activeUnmount = unmount;

  expect(media.listenerCount()).toBe(1);

  act(() => {
    media.setMatches(false);
    media.setMatches(true);
  });

  const maxUpdateDepthLogged = consoleError.mock.calls.some(([message]) =>
    typeof message === 'string' && message.includes('Maximum update depth exceeded')
  );
  expect(maxUpdateDepthLogged).toBe(false);

  unmount();
  activeUnmount = null;
  expect(media.listenerCount()).toBe(0);

  consoleError.mockRestore();
});
