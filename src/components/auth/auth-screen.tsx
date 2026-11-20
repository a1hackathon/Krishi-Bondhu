"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check, Leaf, LockKeyhole, Phone, ShieldCheck, Sprout, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { signInAction, signOutAction, signUpAction, type AuthActionState } from "@/app/[locale]/auth-actions";
import type { AuthUser } from "@/server/auth/service";

type Role = "FARMER" | "OFFICER" | "ADMIN";
type Copy = {
  brand: string; tagline: string; welcome: string; description: string; continueAs: string;
  farmer: string; officer: string; admin: string; phone: string; password: string;
  forgot: string; continue: string; create: string; existing: string; first: string; last: string;
  confirm: string; accessCode: string; officerCode: string; passwordHint: string;
  signUp: string; signIn: string; reset: string; home: string; secure: string;
  roleHelp: string; passwordMismatch: string; eightChars: string; farmerCard: string; registrationUnavailable: string;
};

const translations: Record<"en" | "bn", Copy> = {
  en: {
    brand: "Krishi Bondhu", tagline: "A trusted companion for every growing season.", welcome: "Welcome back",
    description: "Sign in to get practical support for your farm, wherever you are.", continueAs: "Continue as",
    farmer: "Farmer", officer: "Officer", admin: "Admin", phone: "Phone number", password: "Password",
    forgot: "Password reset delivery is not configured for this demo.", continue: "Continue", create: "Create an account",
    existing: "Already have an account?", first: "First name", last: "Last name", confirm: "Confirm password",
    accessCode: "Admin access code", officerCode: "Officer demo bypass code", passwordHint: "At least 8 characters",
    signUp: "Create your account", signIn: "Sign in", reset: "Choose a role to get started.", home: "Back to sign in",
    secure: "Your account and farm details stay protected.", roleHelp: "Choose the account type you want to use.",
    passwordMismatch: "Passwords do not match.", eightChars: "Password must be at least 8 characters.", farmerCard: "Made for the people who grow our future.",
    registrationUnavailable: "Registration for this role is not configured in this environment yet.",
  },
  bn: {
    brand: "কৃষি বন্ধু", tagline: "প্রতিটি মৌসুমে আপনার বিশ্বস্ত সঙ্গী।", welcome: "আবার স্বাগতম",
    description: "আপনার খামারের ব্যবহারিক সহায়তা পেতে সাইন ইন করুন।", continueAs: "যে হিসেবে চালিয়ে যাবেন",
    farmer: "কৃষক", officer: "কৃষি কর্মকর্তা", admin: "অ্যাডমিন", phone: "মোবাইল নম্বর", password: "পাসওয়ার্ড",
    forgot: "এই ডেমোতে পাসওয়ার্ড রিসেট বার্তা পাঠানোর ব্যবস্থা নেই।", continue: "চালিয়ে যান", create: "অ্যাকাউন্ট তৈরি করুন",
    existing: "আগে থেকেই অ্যাকাউন্ট আছে?", first: "নামের প্রথম অংশ", last: "নামের শেষ অংশ", confirm: "পাসওয়ার্ড নিশ্চিত করুন",
    accessCode: "অ্যাডমিন অ্যাক্সেস কোড", officerCode: "কর্মকর্তার ডেমো বাইপাস কোড", passwordHint: "কমপক্ষে ৮ অক্ষর",
    signUp: "অ্যাকাউন্ট তৈরি করুন", signIn: "সাইন ইন", reset: "শুরু করতে একটি ভূমিকা বেছে নিন।", home: "সাইন ইন-এ ফিরুন",
    secure: "আপনার অ্যাকাউন্ট ও খামারের তথ্য সুরক্ষিত থাকবে।", roleHelp: "আপনি যে ধরনের অ্যাকাউন্ট ব্যবহার করবেন তা বেছে নিন।",
    passwordMismatch: "পাসওয়ার্ড দুটি মিলছে না।", eightChars: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।", farmerCard: "যারা আমাদের ভবিষ্যৎ গড়েন, তাদের জন্য।",
    registrationUnavailable: "এই পরিবেশে এই ভূমিকার নিবন্ধন এখনো চালু করা হয়নি।",
  },
};

const roleNames: Record<Role, keyof Copy> = { FARMER: "farmer", OFFICER: "officer", ADMIN: "admin" };
const initialState: AuthActionState = { kind: "idle", message: "" };

export function AuthScreen({ locale, currentUser, demoCodesEnabled }: { locale: "en" | "bn"; currentUser: AuthUser | null; demoCodesEnabled: boolean }) {
  const t = translations[locale];
  const [role, setRole] = useState<Role>("FARMER");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loginState, loginAction, loginPending] = useActionState(signInAction, initialState);
  const [signupState, signupAction, signupPending] = useActionState(signUpAction, initialState);
  const state = mode === "signin" ? loginState : signupState;
  const pending = mode === "signin" ? loginPending : signupPending;
  const registrationUnavailable = mode === "signup" && role !== "FARMER" && !demoCodesEnabled;

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-8 sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[32rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 size-[34rem] rounded-full bg-success/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(var(--border)_0.7px,transparent_0.7px)] bg-size-[22px_22px] opacity-40" />
      </div>
      <header className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-7 sm:top-6">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      <main className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border/80 bg-card/90 shadow-2xl shadow-primary/10 backdrop-blur-xl lg:min-h-[700px] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
          <div aria-hidden="true" className="absolute inset-0 opacity-15">
            <div className="absolute -right-16 top-20 size-80 rounded-full border-[1px] border-current" />
            <div className="absolute -right-2 top-36 size-64 rounded-full border-[1px] border-current" />
            <div className="absolute -right-20 bottom-[-9rem] size-[27rem] rounded-full border-[1px] border-current" />
          </div>
          <div className="relative">
            <div className="mb-16 flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/20"><Sprout className="size-7" /></span>
              <span className="text-xl font-semibold tracking-tight">{t.brand}</span>
            </div>
            <div className="mb-8 grid size-16 place-items-center rounded-3xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
              <Leaf className="size-8" />
            </div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.22em] text-primary-foreground/70">{t.welcome}</p>
            <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">{t.farmerCard}</h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-primary-foreground/75">{t.tagline}</p>
          </div>
          <div className="relative flex items-center gap-3 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 text-sm">
            <ShieldCheck className="size-5 shrink-0" />
            <span>{t.secure}</span>
          </div>
        </aside>

        <section className="flex items-center justify-center px-5 py-14 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><Sprout className="size-6" /></span>
              <div><p className="font-semibold tracking-tight">{t.brand}</p><p className="text-xs text-muted-foreground">{t.tagline}</p></div>
            </div>
            {state.authenticated || currentUser ? (
              <div className="rounded-3xl border border-success/30 bg-success/10 p-7 text-center sm:p-9">
                <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-success text-success-foreground"><Check className="size-7" /></span>
                <h2 className="text-2xl font-semibold">{t.signIn}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{state.message || `${currentUser?.fullName ?? ""} · ${t.reset}`}</p>
                <form action={signOutAction} className="mt-7">
                  <input type="hidden" name="locale" value={locale} />
                  <Button variant="outline" className="w-full rounded-xl">{t.home}</Button>
                </form>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <p className="mb-2 text-sm font-medium text-primary">{t.brand}</p>
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{mode === "signin" ? t.welcome : t.create}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode === "signin" ? t.description : t.roleHelp}</p>
                </div>

                <div className="mb-6">
                  <p className="mb-3 text-sm font-medium">{t.continueAs}</p>
                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted/70 p-1.5" role="group" aria-label={t.continueAs}>
                    {(["FARMER", "OFFICER", "ADMIN"] as Role[]).map((item) => {
                      const Icon = item === "FARMER" ? Sprout : item === "OFFICER" ? ShieldCheck : UserRound;
                      return <button key={item} type="button" aria-pressed={role === item} onClick={() => setRole(item)} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-medium transition sm:gap-2 sm:text-sm ${role === item ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}><Icon className="size-4" /><span>{t[roleNames[item]]}</span></button>;
                    })}
                  </div>
                </div>

                <form key={`${mode}-${role}`} action={mode === "signin" ? loginAction : signupAction} className="space-y-4">
                  <input type="hidden" name="role" value={role} />
                  <input type="hidden" name="locale" value={locale} />
                  {mode === "signup" && <div className="grid grid-cols-2 gap-3">
                    <Field label={t.first} name="firstName" autoComplete="given-name" minLength={3} maxLength={15} required />
                    <Field label={t.last} name="lastName" autoComplete="family-name" minLength={3} maxLength={15} required />
                  </div>}
                  <Field label={t.phone} name="phoneNumber" icon={<Phone className="size-4" />} type="tel" autoComplete="tel-national" inputMode="numeric" pattern="01[0-9]{9}" maxLength={11} placeholder="01XXXXXXXXX" required />
                  <Field label={t.password} name="password" icon={<LockKeyhole className="size-4" />} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} maxLength={72} placeholder={t.passwordHint} required />
                  {mode === "signup" && <Field label={t.confirm} name="confirmPassword" icon={<LockKeyhole className="size-4" />} type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder={t.passwordHint} required />}
                  {role === "ADMIN" && (mode === "signin" || demoCodesEnabled) && <Field label={t.accessCode} name="adminAccessCode" icon={<ShieldCheck className="size-4" />} type="password" autoComplete="off" required />}
                  {mode === "signup" && role === "OFFICER" && demoCodesEnabled && <div>
                    <Field label={t.officerCode} name="officerBypassCode" icon={<ShieldCheck className="size-4" />} type="password" autoComplete="off" required />
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{locale === "bn" ? "শুধু ডেমো ব্যবহারের জন্য। এই পথে তৈরি কর্মকর্তা যাচাই না হওয়া পর্যন্ত অপেক্ষমাণ থাকবেন।" : "Demo signup only. Officers created this way remain pending until verified."}</p>
                  </div>}

                  {registrationUnavailable && <p role="status" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm leading-5">{t.registrationUnavailable}</p>}
                  {state.message && <p role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm leading-5 ${state.kind === "pending" ? "border-warning/40 bg-warning/10 text-foreground" : state.kind === "success" ? "border-success/30 bg-success/10 text-foreground" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>{state.message}</p>}
                  <Button type="submit" disabled={pending || registrationUnavailable} className="mt-2 h-12 w-full rounded-xl text-base shadow-lg shadow-primary/15">
                    {pending ? <span className="animate-pulse">{locale === "bn" ? "অপেক্ষা করুন…" : "Please wait…"}</span> : <>{mode === "signin" ? t.continue : t.signUp}<ArrowRight className="ml-1 size-4" /></>}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  {mode === "signin" ? <>{t.existing} <button type="button" onClick={() => setMode("signup")} className="font-semibold text-primary underline-offset-4 hover:underline">{t.create}</button></> : <><button type="button" onClick={() => setMode("signin")} className="font-semibold text-primary underline-offset-4 hover:underline">{t.signIn}</button></>}
                </div>
                {mode === "signin" && <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">{t.forgot}</p>}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: React.ReactNode }) {
  const id = props.name;
  return <label htmlFor={id} className="block space-y-2 text-sm font-medium">
    <span>{label}</span>
    <span className="relative block">
      {icon && <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
      <input id={id} {...props} className={`h-12 w-full rounded-xl border border-input bg-background/70 px-4 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10 ${icon ? "pl-11" : ""}`} />
    </span>
  </label>;
}
