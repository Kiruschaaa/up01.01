import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      return saved === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const colors = theme === "light"
    ? { bg: "#ffffff", text: "#000000", btnBg: "#4CAF50", btnText: "#ffffff" }
    : { bg: "#1e1e1e", text: "#f5f5f5", btnBg: "#bb86fc", btnText: "#000000" };

  useEffect(() => {
    document.body.style.backgroundColor = colors.bg;
    document.body.style.color = colors.text;
    document.body.style.margin = "0";
  }, [colors]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);