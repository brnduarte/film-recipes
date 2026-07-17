// Landing page: a fullscreen inspiring before/after hero on the right, and a
// call-to-action column on the left with the Google sign-in entry point. Sign
// in hands off to the editor (App); nothing about the account is persisted.

import { HeroScene } from "../components/HeroScene";
import { GoogleLoginButton } from "../components/GoogleLoginButton";
import { useAuthStore } from "../auth";

export function Home() {
  const signIn = useAuthStore((s) => s.signIn);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Fullscreen animated before/after hero. */}
      <HeroScene />

      {/* Left call-to-action column, layered over the hero's scrim. */}
      <section className="animate-rise-in absolute inset-y-0 left-0 z-10 flex w-full max-w-xl flex-col justify-center gap-6 px-8 sm:px-14">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-neutral-800 text-sm font-bold text-neutral-100 shadow-lg ring-1 ring-white/10">
            F
          </span>
          <span className="text-sm font-semibold tracking-wide text-neutral-200">Fuji Recipes</span>
        </div>

        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Give your photos the soul of real film.
        </h1>

        <p className="max-w-md text-base leading-relaxed text-neutral-300">
          Apply authentic Fujifilm film-simulation recipes to any photo, right in your browser.
          Every edit runs on your device — your images never leave your computer and nothing is
          ever uploaded.
        </p>

        <div className="flex flex-col gap-3">
          <GoogleLoginButton onSignIn={signIn} />
          <p className="text-xs text-neutral-400">
            We use Google only to sign you in. No photos, edits, or personal data are stored on our
            servers — read our{" "}
            <a href="#/terms" className="text-neutral-200 underline underline-offset-2 hover:text-white">
              Terms &amp; Privacy
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
