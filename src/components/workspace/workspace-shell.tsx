"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, CheckCircle2, CircleHelp, ClipboardList, House, Leaf, LogOut, MapPin, MessageCircle, MessagesSquare, Pencil, ShieldCheck, Sprout, Users, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocationPicker, type LocationSelection } from "@/components/location-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/[locale]/auth-actions";
import { loadLocationOptionsAction, updateProfileLocationAction, updateProfileNameAction, type ProfileActionState } from "@/app/[locale]/workspace-actions";
import type { LocationData } from "@/server/location/types";
import type { AccountProfile } from "@/server/profile";

type Section = { id: string; title: string; icon: typeof House };
type Role = "FARMER" | "OFFICER" | "ADMIN";
const sectionConfig: Record<Role, Section[]> = {
  FARMER: [
    { id: "home", title: "home", icon: House },
    { id: "suggestions", title: "suggestions", icon: Sprout },
    { id: "assistant", title: "assistant", icon: CircleHelp },
    { id: "community", title: "community", icon: MessagesSquare },
    { id: "consult", title: "consult", icon: CalendarDays },
  ],
  OFFICER: [
    { id: "home", title: "home", icon: House },
    { id: "schedule", title: "schedule", icon: CalendarDays },
    { id: "messages", title: "messages", icon: MessageCircle },
  ],
  ADMIN: [
    { id: "home", title: "home", icon: House },
    { id: "farmers", title: "farmers", icon: Users },
    { id: "officers", title: "officers", icon: ShieldCheck },
    { id: "alerts", title: "alerts", icon: CheckCircle2 },
    { id: "reports", title: "reports", icon: ClipboardList },
  ],
};

const initialActionState: ProfileActionState = { ok: false, message: "" };

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts.at(-1)?.[0] ?? "" : parts[0][1] ?? "";
  return `${first}${last}`.toLocaleUpperCase();
}

function initialNameParts(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function selectionFromProfile(profile: AccountProfile): LocationSelection {
  const location = profile.location;
  return location
    ? {
        divisionId: String(location.divisionId),
        districtId: String(location.districtId),
        upazilaId: String(location.upazilaId),
        areaId: location.areaId === null ? "" : String(location.areaId),
      }
    : { divisionId: "", districtId: "", upazilaId: "", areaId: "" };
}

function NavItem({ section, active, compact, onClick }: { section: Section; active: boolean; compact?: boolean; onClick: () => void }) {
  const t = useTranslations("workspace");
  const Icon = section.icon;
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"} ${compact ? "min-w-0 flex-col justify-center gap-1 px-1 py-2 text-[0.65rem]" : "w-full"}`}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span className={compact ? "max-w-full truncate" : ""}>{t(section.title)}</span>
    </button>
  );
}

function ProfileDialog({ profile, onClose }: { profile: AccountProfile; onClose: () => void }) {
  const t = useTranslations("workspace");
  const locale = useLocale();
  const router = useRouter();
  const [nameState, setNameState] = useState<ProfileActionState>(initialActionState);
  const [namePending, startNameTransition] = useTransition();
  const [editingName, setEditingName] = useState(false);
  const [photoNotice, setPhotoNotice] = useState(false);
  const [view, setView] = useState<"profile" | "location">("profile");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationState, setLocationState] = useState<ProfileActionState>(initialActionState);
  const [selection, setSelection] = useState(() => selectionFromProfile(profile));
  const nameParts = useMemo(() => initialNameParts(profile.fullName), [profile.fullName]);
  const selectedUpazila = Number(selection.upazilaId);
  const hasAreas = locationData?.areas.some((area) => area.upazilaId === selectedUpazila) ?? false;
  const locationReady = Boolean(selection.divisionId && selection.districtId && selection.upazilaId && (!hasAreas || selection.areaId));

  async function openLocationEditor() {
    setView("location");
    setLocationState(initialActionState);
    if (locationData) return;
    setLoadingLocation(true);
    setLocationError("");
    try {
      setLocationData(await loadLocationOptionsAction());
    } catch {
      setLocationError(locale === "bn" ? "ঠিকানার তালিকা আনা যায়নি। আবার চেষ্টা করুন।" : "Could not load locations. Please try again.");
    } finally {
      setLoadingLocation(false);
    }
  }

  async function saveLocation() {
    const result = await updateProfileLocationAction({
      divisionId: Number(selection.divisionId),
      districtId: Number(selection.districtId),
      upazilaId: Number(selection.upazilaId),
      areaId: selection.areaId ? Number(selection.areaId) : null,
    }, locale);
    setLocationState(result);
    if (result.ok) {
      router.refresh();
      setView("profile");
    }
  }

  const loc = profile.location;
  const locationLabel = loc
    ? [
        locale === "bn" ? loc.divisionBnName : loc.divisionName,
        locale === "bn" ? loc.districtBnName : loc.districtName,
        locale === "bn" ? loc.upazilaBnName : loc.upazilaName,
        loc.areaId === null ? "" : locale === "bn" ? loc.areaBnName : loc.areaName,
      ].filter(Boolean).join(", ")
    : t("notSet");

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,52rem)] w-[min(94vw,40rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-border px-5 py-4 sm:px-7">
            <div>
              {view === "location" && <button type="button" onClick={() => setView("profile")} className="mb-1 text-xs font-medium text-primary hover:underline">← {t("back")}</button>}
              <DialogPrimitive.Title className="text-lg font-semibold">{view === "profile" ? t("profile") : t("editLocation")}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{view === "profile" ? profile.fullName : t("locationHelp")}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t("close")}><X aria-hidden="true" /></Button>
            </DialogPrimitive.Close>
          </div>

          {view === "profile" ? (
            <div className="space-y-4 overflow-y-auto p-5 sm:p-7">
              <div className="flex items-center gap-4 rounded-2xl bg-muted/50 p-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary text-xl font-semibold text-primary-foreground" aria-label={`${t("profileInitials")}: ${initials(profile.fullName)}`}>{initials(profile.fullName)}</span>
                <div className="min-w-0 flex-1"><p className="font-semibold">{profile.fullName}</p><p className="mt-1 text-sm text-muted-foreground">{t(profile.role === "FARMER" ? "roleFarmer" : profile.role === "OFFICER" ? "roleOfficer" : "roleAdmin")}</p></div>
                <Button type="button" variant="outline" size="icon" aria-label={t("photo")} onClick={() => setPhotoNotice(true)}><Pencil aria-hidden="true" /></Button>
              </div>
              {photoNotice && <p role="status" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">{t("photoUnavailable")}</p>}

              <section className="rounded-2xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">{t("fullName")}</h3><Button type="button" variant="ghost" size="sm" onClick={() => setEditingName((value) => !value)}><Pencil aria-hidden="true" />{t("edit")}</Button></div>
                {editingName ? (
                  <form action={(data) => startNameTransition(async () => {
                    const state = await updateProfileNameAction(initialActionState, data);
                    setNameState(state);
                    if (state.ok) { setEditingName(false); router.refresh(); }
                  })} className="space-y-3">
                    <input type="hidden" name="locale" value={locale} />
                    <label className="block space-y-1.5 text-sm font-medium"><span>{t("firstName")}</span><input name="firstName" defaultValue={nameParts.firstName} minLength={3} maxLength={15} required className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
                    <label className="block space-y-1.5 text-sm font-medium"><span>{t("lastName")}</span><input name="lastName" defaultValue={nameParts.lastName} minLength={3} maxLength={15} required className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
                    {nameState.message && <p role="status" className={`text-sm ${nameState.ok ? "text-success" : "text-destructive"}`}>{nameState.message}</p>}
                    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditingName(false)}>{t("cancel")}</Button><Button type="submit" disabled={namePending}>{namePending ? "…" : t("save")}</Button></div>
                  </form>
                ) : <p className="text-sm text-muted-foreground">{profile.fullName}</p>}
              </section>

              <section className="rounded-2xl border border-border p-4"><h3 className="mb-2 font-semibold">{t("phoneNumber")}</h3><p className="text-sm text-muted-foreground">{profile.phoneNumber}</p></section>

              <section className="rounded-2xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between gap-3"><h3 className="font-semibold">{t("location")}</h3><Button type="button" variant="ghost" size="sm" onClick={openLocationEditor}><MapPin aria-hidden="true" />{loc ? t("edit") : t("setLocation")}</Button></div>
                <p className="text-sm text-muted-foreground">{locationLabel}</p>
              </section>

              <form action={signOutAction}>
                <input type="hidden" name="locale" value={locale} />
                <Button type="submit" variant="destructive" className="w-full"><LogOut aria-hidden="true" />{t("logout")}</Button>
              </form>
            </div>
          ) : (
            <div className="space-y-5 overflow-y-auto p-5 sm:p-7">
              {loadingLocation && <div aria-live="polite" className="animate-pulse space-y-3"><div className="h-11 rounded-xl bg-muted" /><div className="h-11 rounded-xl bg-muted" /><div className="h-11 rounded-xl bg-muted" /></div>}
              {locationError && <p role="alert" className="text-sm text-destructive">{locationError}</p>}
              {locationData && <LocationPicker {...locationData} selection={selection} onChange={(next) => { setSelection(next); setLocationState(initialActionState); }} />}
              {locationState.message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${locationState.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{locationState.message}</p>}
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setView("profile")}>{t("cancel")}</Button><Button type="button" disabled={!locationReady || loadingLocation} onClick={saveLocation}>{t("saveLocation")}</Button></div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function WorkspaceShell({ profile }: { profile: AccountProfile }) {
  const t = useTranslations("workspace");
  const locale = useLocale();
  const [activeSection, setActiveSection] = useState("home");
  const [profileOpen, setProfileOpen] = useState(false);
  const role = profile.role as Role;
  const sections = sectionConfig[role];
  const current = sections.find((section) => section.id === activeSection) ?? sections[0];
  const homeDescription = role === "FARMER" ? t("farmerHome") : role === "OFFICER" ? t("officerHome") : t("adminHome");
  const localizedLocation = profile.location
    ? [
        locale === "bn" ? profile.location.districtBnName : profile.location.districtName,
        locale === "bn" ? profile.location.upazilaBnName : profile.location.upazilaName,
      ].join(" · ")
    : t("notSet");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Leaf aria-hidden="true" className="size-5" /></span>
            <div className="min-w-0"><p className="truncate text-xs font-medium text-muted-foreground">{t("welcome")}</p><h1 className="truncate text-lg font-semibold leading-tight">{t(current.title)}</h1></div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <ThemeToggle />
            <button type="button" aria-label={t("openProfile")} onClick={() => setProfileOpen(true)} className="grid size-10 place-items-center rounded-full bg-primary font-semibold text-primary-foreground ring-offset-2 transition hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{initials(profile.fullName)}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-r border-border p-4 md:flex">
          <nav aria-label={t("workspaceNavigation")} className="space-y-1">
            {sections.map((section) => <NavItem key={section.id} section={section} active={current.id === section.id} onClick={() => setActiveSection(section.id)} />)}
          </nav>
          <div className="mt-auto rounded-2xl bg-muted/60 p-4"><p className="text-sm font-semibold">{profile.fullName}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin aria-hidden="true" className="size-3.5" />{localizedLocation}</p></div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-8 md:pt-8">
          <div className="mx-auto max-w-5xl">
            {current.id === "home" ? (
              <section className="overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-success/10 p-6 shadow-sm sm:p-9">
                <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Sprout aria-hidden="true" className="size-6" /></div>
                <p className="text-sm font-medium text-primary">{t(role === "FARMER" ? "roleFarmer" : role === "OFFICER" ? "roleOfficer" : "roleAdmin")}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t("welcome")}, {profile.fullName.split(/\s+/)[0]}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{homeDescription}</p>
                {!profile.location && <Button type="button" variant="outline" className="mt-6" onClick={() => setProfileOpen(true)}><MapPin aria-hidden="true" />{t("setLocation")}</Button>}
              </section>
            ) : (
              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-9">
                <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-muted text-primary"><current.icon aria-hidden="true" className="size-6" /></div>
                <h2 className="text-2xl font-semibold tracking-tight">{t(current.title)}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{t("comingSoon")}</p>
              </section>
            )}
          </div>
        </main>
      </div>

      <nav aria-label={t("workspaceNavigation")} className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
          {sections.map((section) => <NavItem key={section.id} section={section} active={current.id === section.id} compact onClick={() => setActiveSection(section.id)} />)}
        </div>
      </nav>

      <div className="sm:hidden fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40"><LanguageSwitcher /></div>
      {profileOpen && <ProfileDialog profile={profile} onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
