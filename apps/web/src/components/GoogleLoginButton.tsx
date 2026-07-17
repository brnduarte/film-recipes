// "Continue with Google" entry point.
//
// When a real Google client id is provided (VITE_GOOGLE_CLIENT_ID at build
// time), this loads Google Identity Services and renders Google's official
// button. Sign-in happens entirely on Google's side; GIS hands back a signed
// JWT credential which we decode CLIENT-SIDE only to show the user's name — we
// never send it anywhere, never verify it against a backend (there is none),
// and never store it. That keeps the app's "no data saved on our servers"
// promise intact while still using Google as the identity provider.
//
// With no client id configured (local dev / preview), it falls back to a
// styled button that starts a local guest session so the landing page is fully
// usable without Google setup.

import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "../auth";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GSI_SRC = "https://accounts.google.com/gsi/client";

interface GoogleCredentialResponse {
  credential: string;
}

// Minimal shape of the Google Identity Services API we use.
interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

/** Decode the JWT payload (client-side, display-only — no verification). */
function decodeJwtName(credential: string): { name: string; email?: string } {
  try {
    const payload = JSON.parse(atob(credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return { name: payload.name ?? payload.given_name ?? "Google user", email: payload.email };
  } catch {
    return { name: "Google user" };
  }
}

interface GoogleLoginButtonProps {
  onSignIn: (user: AuthUser) => void;
}

export function GoogleLoginButton({ onSignIn }: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [gisReady, setGisReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return; // fall back path — no script load

    let cancelled = false;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    const script = existing ?? document.createElement("script");

    function init() {
      if (cancelled || !window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID!,
        callback: (response) => {
          const { name, email } = decodeJwtName(response.credential);
          onSignIn({ name, email, provider: "google" });
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        logo_alignment: "left",
      });
      setGisReady(true);
    }

    if (existing && window.google) {
      init();
    } else {
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = init;
      if (!existing) document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [onSignIn]);

  // Real Google button (mounted into this container by GIS).
  if (CLIENT_ID) {
    return (
      <div>
        <div ref={buttonRef} />
        {!gisReady && <p className="mt-2 text-xs text-neutral-400">Loading Google sign-in…</p>}
      </div>
    );
  }

  // Fallback: local guest session, styled to match Google's button.
  return (
    <button
      type="button"
      onClick={() => onSignIn({ name: "Guest", provider: "guest" })}
      className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-800 shadow-lg transition-transform hover:scale-[1.02] active:scale-100"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      Continue with Google
    </button>
  );
}
