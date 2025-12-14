import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_BREAKPOINT = 768;

const getMatches = (query) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(query).matches;
};

export default function TooltipText({
  tooltip,
  children,
  className = '',
  style = {},
  breakpoint = DEFAULT_BREAKPOINT
}) {
  const [isMobile, setIsMobile] = useState(() => getMatches(`(max-width: ${breakpoint}px)`));
  const [open, setOpen] = useState(false);
  const [floatingStyle, setFloatingStyle] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return () => {};
    }

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const handleChange = (event) => {
      setIsMobile(event.matches);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [breakpoint]);

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
      const footerHeight = 120;
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
      tabIndex={isMobile ? 0 : undefined}
      aria-expanded={isMobile ? open : undefined}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      onBlur={() => setOpen(false)}
    >
      {children}
      {isMobile && open && (
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
        </span>
      )}
    </span>
  );
}

