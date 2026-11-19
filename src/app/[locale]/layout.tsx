import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { HtmlLang } from "@/components/html-lang";

// Every page here is locale-specific, so the layout needs the URL locale high in the tree and cannot share a prefetched shell.
export const instant = false;

type LocaleParams = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "app" });
  return { title: t("name"), description: t("description") };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode } & LocaleParams>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <HtmlLang locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
