"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div role="group" aria-label={t("label")} className="inline-flex gap-1">
      {routing.locales.map((target) => {
        const selected = target === locale;
        const name = t(target);
        return (
          <Button
            key={target}
            variant={selected ? "default" : "outline"}
            size="sm"
            aria-pressed={selected}
            aria-label={t("switchTo", { language: name })}
            lang={target}
            onClick={() => {
              if (!selected) router.replace(pathname, { locale: target });
            }}
          >
            {name}
          </Button>
        );
      })}
    </div>
  );
}
