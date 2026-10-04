import { createContext, useContext, useState, useLayoutEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  const colors = theme === 'light'
    ? { bg: '#ffffff', text: '#333333', navBg: '#f8f9fa', border: '#ddd', cardBg: '#ffffff', textSecondary: '#666' }
    : { bg: '#121212', text: '#f5f5f5', navBg: '#1e1e1e', border: '#333', cardBg: '#1e1e1e', textSecondary: '#aaa' };

  useLayoutEffect(() => {
    document.body.style.backgroundColor = colors.bg;
    document.body.style.color = colors.text;
    document.body.style.margin = '0';
    document.body.style.fontFamily = 'sans-serif';
    document.body.style.transition = 'none';

    const timeout = setTimeout(() => {
      document.body.style.transition = 'background-color 0.3s, color 0.3s';
    }, 50);

    return () => clearTimeout(timeout);
  }, [colors]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);