import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "bn"],
  defaultLocale: "en",
  // Always show the locale in the URL, so every page has one canonical address per language.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
