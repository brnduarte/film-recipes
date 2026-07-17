// Generic Terms & Conditions / Privacy page. Its central, explicit promise is
// that no user data — photos, edits, or account information — is stored on any
// server the operator controls; all processing is on-device.

const UPDATED = "July 17, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-neutral-300">{children}</div>
    </section>
  );
}

export function Terms() {
  return (
    <main className="h-screen w-screen overflow-y-auto bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-14">
        <div className="flex items-center justify-between">
          <a
            href="#/"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <span aria-hidden>←</span> Back
          </a>
          <span className="text-xs text-neutral-500">Last updated: {UPDATED}</span>
        </div>

        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Terms &amp; Privacy</h1>
          <p className="text-sm text-neutral-400">
            Plain-language terms for using Fuji Recipes. The short version: your photos stay on your
            device, and we don&apos;t keep your data.
          </p>
        </header>

        {/* The headline privacy guarantee, called out. */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-200">
            No data is stored on our servers. Fuji Recipes has no backend that receives, processes,
            or retains your photos, edits, or personal information. Everything happens locally in
            your browser.
          </p>
        </div>

        <Section title="1. What the app does">
          <p>
            Fuji Recipes is a client-side photo editor that applies Fujifilm-style film-simulation
            recipes to images you open. All decoding, editing, and exporting is performed on your
            own device using code running in your browser.
          </p>
        </Section>

        <Section title="2. Your photos never leave your device">
          <p>
            When you open an image, it is held only in your device&apos;s memory for the duration of
            your session. Images are never uploaded, transmitted, or copied to any server we operate.
            When you export, the resulting file is generated locally and downloaded directly by your
            browser.
          </p>
        </Section>

        <Section title="3. Sign-in with Google">
          <p>
            We offer sign-in through Google solely to personalize your session. Authentication is
            handled by Google. We do not run a backend that receives or stores your Google profile,
            email, or token, and we do not link any account to your photos or edits. Your use of
            Google sign-in is also subject to Google&apos;s own privacy policy and terms.
          </p>
        </Section>

        <Section title="4. Local storage on your device">
          <p>
            Any presets or preferences you choose to save are written only to your own browser&apos;s
            local storage on your device — never to a remote server. You can remove them at any time
            using the &quot;Clear all app data&quot; control in the editor, or by clearing your
            browser storage.
          </p>
        </Section>

        <Section title="5. No analytics or tracking">
          <p>
            The app does not include third-party analytics, advertising, or behavioral tracking. We
            do not build profiles of you or sell any information, because we do not collect it in the
            first place.
          </p>
        </Section>

        <Section title="6. No warranty">
          <p>
            The app is provided &quot;as is&quot;, without warranties of any kind. You are
            responsible for keeping your own backups of any original images and exported files. To
            the maximum extent permitted by law, the operators are not liable for any loss or damage
            arising from your use of the app.
          </p>
        </Section>

        <Section title="7. Changes to these terms">
          <p>
            We may update these terms from time to time. Continued use of the app after an update
            constitutes acceptance of the revised terms. Material changes will be reflected by the
            &quot;last updated&quot; date above.
          </p>
        </Section>

        <p className="border-t border-white/10 pt-6 text-xs text-neutral-500">
          This document is a generic template provided for demonstration purposes and is not legal
          advice.
        </p>
      </div>
    </main>
  );
}
