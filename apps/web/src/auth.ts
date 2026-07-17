import { create } from "zustand";

/** A signed-in user, held in memory only for the session's UI (a greeting).
 *  Never persisted — see the privacy note in Home/Terms: nothing about the
 *  account is written to storage or sent to any server we control. */
export interface AuthUser {
  name: string;
  email?: string;
  /** The only supported sign-in path: a real Google authentication. */
  provider: "google";
}

interface AuthState {
  user: AuthUser | null;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
}

/** In-memory auth: a page reload returns the user to the landing page, which
 *  keeps the "no data saved" guarantee literally true (no localStorage,
 *  sessionStorage, cookies, or IndexedDB writes for the account). */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  signIn: (user) => set({ user }),
  signOut: () => set({ user: null }),
}));
