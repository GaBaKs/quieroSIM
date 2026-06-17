'use client';
import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
const THEME_KEY = 'admin-theme';

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'dark';
}

function getServerSnapshot(): Theme {
  return 'dark';
}

const ThemeContext = createContext<{theme: Theme, toggleTheme: () => void}>({
  theme: 'dark', toggleTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Sincroniza el DOM y persiste; actualizar sistemas externos sí va en un effect.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    localStorage.setItem(THEME_KEY, theme === 'dark' ? 'light' : 'dark');
    listeners.forEach((listener) => listener());
  };

  return <ThemeContext.Provider value={{theme, toggleTheme}}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
