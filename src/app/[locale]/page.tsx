import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { demoAuthCodesEnabled, getCurrentUser } from "@/server/auth/service";
import { getAccountProfile } from "@/server/profile";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export default function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <Suspense fallback={<HomeSkeleton />}><HomeContent params={params} /></Suspense>;
}

// The locale comes from the URL, so it is read inside Suspense to keep the page shell shared across links.
async function HomeContent({ params }: { params: Promise<{ locale: string }> }) {
  // Opt into request-time rendering explicitly; the page reads the database per request.
  await connection();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    const profile = await getAccountProfile(user.id);
    if (profile) return <WorkspaceShell profile={profile} />;
  }
  return <AuthScreen locale={locale as "en" | "bn"} currentUser={user} demoCodesEnabled={demoAuthCodesEnabled()} />;
}

// Same footprint as the loaded card, so the content does not jump when it arrives.
function HomeSkeleton() {
  return (
    <main aria-hidden="true" className="mx-auto my-auto flex w-full max-w-5xl animate-pulse gap-8 rounded-[2rem] border border-border bg-card p-8 shadow-sm">
      <div className="hidden min-h-[32rem] flex-1 rounded-3xl bg-muted lg:block" />
      <div className="flex flex-1 flex-col gap-5 py-10"><div className="h-8 w-2/3 rounded bg-muted" /><div className="h-12 w-full rounded-xl bg-muted" /><div className="h-12 w-full rounded-xl bg-muted" /><div className="h-12 w-full rounded-xl bg-muted" /></div>
    </main>
  );
}
