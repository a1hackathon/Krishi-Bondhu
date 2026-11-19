"use client";

import { useEffect } from "react";

// The root layout cannot know the locale, so it sets <html lang> after mount.
export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
