import { useEffect, useState } from 'react';

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
        <span className="tooltip-inline">
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

