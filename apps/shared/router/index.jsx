import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const RouterContext = createContext({
  path: '/',
  navigate: () => {},
  replace: () => {},
});

const getCurrentPath = () => {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
};

export function RouterProvider({ children }) {
  const [path, setPath] = useState(getCurrentPath);

  useEffect(() => {
    const handlePopState = () => {
      setPath(getCurrentPath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const value = useMemo(() => {
    const navigate = (to) => {
      if (typeof window === 'undefined') return;
      if (to === path) return;
      window.history.pushState({}, '', to);
      setPath(to);
    };

    const replace = (to) => {
      if (typeof window === 'undefined') return;
      if (to === path) return;
      window.history.replaceState({}, '', to);
      setPath(to);
    };

    return { path, navigate, replace };
  }, [path]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  return useContext(RouterContext);
}

export function Link({ to, children, onClick, target, rel, ...rest }) {
  const { navigate } = useRouter();

  const handleClick = (event) => {
    if (onClick) {
      onClick(event);
    }

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      target && target !== '_self' ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} target={target} rel={rel} {...rest}>
      {children}
    </a>
  );
}
