type Theme = "light" | "dark";
type Listener = () => void;

const listeners = new Set<Listener>();

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let currentTheme: Theme = readInitialTheme();

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Client snapshot for useSyncExternalStore -- the real, current theme. */
export function getSnapshot(): Theme {
  return currentTheme;
}

/** Server/first-hydration-pass snapshot. Must match the default the inline
 * script in layout.tsx assumes absent a stored preference, so React never
 * warns about a hydration mismatch; useSyncExternalStore then reconciles to
 * the real client value right after mount. */
export function getServerSnapshot(): Theme {
  return "light";
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: Theme): void {
  currentTheme = theme;
  window.localStorage.setItem("theme", theme);
  applyThemeClass(theme);
  listeners.forEach((listener) => listener());
}

export function toggleTheme(): void {
  setTheme(currentTheme === "dark" ? "light" : "dark");
}
