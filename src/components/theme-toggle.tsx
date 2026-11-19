"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";
const STORAGE_KEY = "theme";
const CHANGE_EVENT = "themechange";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  // Follow OS changes only while the user has not chosen a theme.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    applyTheme(media.matches ? "dark" : "light");
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// The inline script in the locale layout sets the class before first paint, so the DOM is the source of truth.
function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = useTranslations("theme");

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? t("switchToLight") : t("switchToDark")}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
