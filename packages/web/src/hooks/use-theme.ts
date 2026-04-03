import { useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

const THEME_KEY = "gastown-theme";

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return "dark";
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === "dark") {
    html.classList.add("dark");
    html.classList.remove("light");
  } else {
    html.classList.remove("dark");
    html.classList.add("light");
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, next); } catch {}
      return next;
    });
  }, []);

  return { theme, toggle };
}
