import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocationPicker } from "@/components/location-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getLocationData } from "@/server/location/queries";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export default function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-background px-6 py-16 font-sans text-foreground">
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent params={params} />
      </Suspense>
    </div>
  );
}

// The locale comes from the URL, so it is read inside Suspense to keep the page shell shared across links.
async function HomeContent({ params }: { params: Promise<{ locale: string }> }) {
  // Opt into request-time rendering explicitly; the page reads the database per request.
  await connection();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tApp = await getTranslations("app");

  return (
    <>
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <main className="flex w-full max-w-xl flex-col gap-4 rounded-xl bg-card p-8 text-card-foreground shadow-sm ring-1 ring-border">
        <p className="text-sm font-medium text-primary">{tApp("name")}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-base leading-7 text-muted-foreground">{t("description")}</p>
        <Suspense fallback={null}>
          <LocationPickerData />
        </Suspense>
      </main>
    </>
  );
}

// Same footprint as the loaded card, so the content does not jump when it arrives.
function HomeSkeleton() {
  return (
    <main
      aria-hidden="true"
      className="flex w-full max-w-xl animate-pulse flex-col gap-4 rounded-xl bg-card p-8 ring-1 ring-border"
    >
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="h-8 w-3/4 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-5/6 rounded bg-muted" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="h-9 rounded bg-muted" />
        <div className="h-9 rounded bg-muted" />
        <div className="h-9 rounded bg-muted" />
        <div className="h-9 rounded bg-muted" />
      </div>
    </main>
  );
}

// Reads the location tables per request, so the database is needed at render time.
async function LocationPickerData() {
  const locations = await getLocationData();
  return (
    <LocationPicker
      divisions={locations.divisions}
      districts={locations.districts}
      upazilas={locations.upazilas}
      areas={locations.areas}
    />
  );
}
