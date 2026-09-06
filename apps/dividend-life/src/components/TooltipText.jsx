import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_BREAKPOINT = 768;

const getMatches = (query) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(query).matches;
};

// Shared native matchMedia subscription, one per distinct query string.
//
// Root cause of React error #185 ("Maximum update depth exceeded") at
// narrow viewports: a table can mount dozens/hundreds of <TooltipText>
// cells at once, and each one used to create its own MediaQueryList and
// register its own 'change' listener for the same query. When the
// viewport crossed the breakpoint, the browser dispatched that many
// separate native 'change' events -- each as its own task, not batched
// together -- so React committed once per cell in rapid succession
// (confirmed live: ~86 unbatched commits within ~55ms). That exceeds
// React's internal nested-update guard and throws #185, even though
// there is no real infinite loop.
//
// Fix: register exactly one native listener per query and fan out to
// every subscribed component synchronously, from within that single
// callback invocation. All resulting setState calls then happen inside
// one JS turn, so React's automatic batching folds them into a single
// commit no matter how many <TooltipText> cells are mounted.
const mediaQuerySubscriptions = new Map();

function subscribeToBreakpoint(breakpoint, callback) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const query = `(max-width: ${breakpoint}px)`;
  let entry = mediaQuerySubscriptions.get(query);

  if (!entry) {
    const mediaQuery = window.matchMedia(query);
    const subscribers = new Set();
    const handleChange = (event) => {
      entry.matches = event.matches;
      subscribers.forEach((subscriber) => subscriber(entry.matches));
    };
    entry = { mediaQuery, subscribers, handleChange, matches: mediaQuery.matches };
    mediaQuery.addEventListener('change', handleChange);
    mediaQuerySubscriptions.set(query, entry);
  }

  entry.subscribers.add(callback);
  callback(entry.matches);

  return () => {
    entry.subscribers.delete(callback);
    // Only tear down the shared listener if the map's current entry for this
    // query is still the exact object this closure was registered against --
    // guards against a double-cleanup silently orphaning a live listener
    // registration that a newer entry replaced in the meantime.
    if (entry.subscribers.size === 0 && mediaQuerySubscriptions.get(query) === entry) {
      entry.mediaQuery.removeEventListener('change', entry.handleChange);
      mediaQuerySubscriptions.delete(query);
    }
  };
}

export default function TooltipText({
  tooltip,
  children,
  className = '',
  style = {},
  breakpoint = DEFAULT_BREAKPOINT,
  ariaLabel
}) {
  const [isMobile, setIsMobile] = useState(() => getMatches(`(max-width: ${breakpoint}px)`));
  const [open, setOpen] = useState(false);
  const [floatingStyle, setFloatingStyle] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => subscribeToBreakpoint(breakpoint, setIsMobile), [breakpoint]);

  useEffect(() => {
    if (!isMobile && open) {
      setOpen(false);
    }
  }, [isMobile, open]);

  useEffect(() => {
    if (!isMobile || !open) {
      setFloatingStyle(null);
    }
  }, [isMobile, open]);

  const updateFloatingPosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const schedule = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (callback) => window.setTimeout(callback, 0);

    schedule(() => {
      if (!triggerRef.current || !tooltipRef.current) {
        return;
      }

      const margin = 16;
      const footerHeight = 160;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const maxWidth = Math.min(280, viewportWidth - margin * 2);
      const tooltipWidth = Math.min(tooltipRect.width, maxWidth);

      let left = triggerRect.left + triggerRect.width / 2;
      const halfWidth = tooltipWidth / 2;

      if (left - halfWidth < margin) {
        left = margin + halfWidth;
      } else if (left + halfWidth > viewportWidth - margin) {
        left = viewportWidth - margin - halfWidth;
      }

      let top = triggerRect.bottom + 12;
      const bottomBoundary = viewportHeight - footerHeight - margin;

      if (top + tooltipRect.height > bottomBoundary) {
        top = Math.max(triggerRect.top - tooltipRect.height - 12, margin);
      }

      setFloatingStyle({
        top,
        left,
        maxWidth,
      });
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    if (!isMobile || !open) {
      return () => {};
    }

    updateFloatingPosition();

    const handleReposition = () => {
      updateFloatingPosition();
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isMobile, open, updateFloatingPosition]);

  useEffect(() => {
    if (isMobile && open) {
      updateFloatingPosition();
    }
  }, [isMobile, open, tooltip, updateFloatingPosition]);

  const hasTooltip = typeof tooltip === 'string' ? tooltip.trim().length > 0 : Boolean(tooltip);

  if (!hasTooltip) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }

  const combinedClassName = ['tooltip-text', className].filter(Boolean).join(' ');
  const combinedStyle = {
    display: 'inline-block',
    ...style,
  };
  if (!style.cursor) {
    combinedStyle.cursor = isMobile ? 'pointer' : 'help';
  }

  const toggle = () => {
    if (isMobile) {
      setOpen((prev) => !prev);
    }
  };

  const handleKeyDown = (event) => {
    if (!isMobile) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const tooltipLines = String(tooltip).split('\n');

  return (
    <span
      ref={triggerRef}
      className={combinedClassName}
      style={combinedStyle}
      title={isMobile ? undefined : tooltip}
      role={isMobile ? 'button' : undefined}
      tabIndex={0}
      aria-label={ariaLabel || undefined}
      aria-expanded={isMobile ? open : undefined}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      onBlur={() => setOpen(false)}
    >
      {children}
      {isMobile && open && createPortal(
        <span
          ref={tooltipRef}
          className="tooltip-inline tooltip-inline-floating"
          style={floatingStyle
            ? {
                top: `${floatingStyle.top}px`,
                left: `${floatingStyle.left}px`,
                maxWidth: `${floatingStyle.maxWidth}px`,
                bottom: 'auto',
              }
            : undefined}
        >
          {tooltipLines.map((line, idx) => (
            <span key={`${line}-${idx}`}>
              {line}
              {idx < tooltipLines.length - 1 && <br />}
            </span>
          ))}
        </span>,
        document.body
      )}
    </span>
  );
}

