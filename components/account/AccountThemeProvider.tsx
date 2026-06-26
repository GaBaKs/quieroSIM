'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface AccountThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const AccountThemeContext = createContext<AccountThemeContextType | undefined>(undefined);

export function AccountThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light'); // default a light como pidió el usuario
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const savedTheme = localStorage.getItem('account-theme') as Theme;
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Por defecto light
      document.documentElement.classList.remove('dark');
      localStorage.setItem('account-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('account-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <AccountThemeContext.Provider value={{ theme, toggleTheme }}>
      <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
        {children}
      </div>
    </AccountThemeContext.Provider>
  );
}

export function useAccountTheme() {
  const context = useContext(AccountThemeContext);
  if (context === undefined) {
    throw new Error('useAccountTheme must be used within an AccountThemeProvider');
  }
  return context;
}
