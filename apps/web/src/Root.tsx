// Top-level view switcher. Uses lightweight hash routing (no router dependency,
// works offline and needs no server rewrites):
//   #/terms            → Terms & Privacy (reachable signed-in or not)
//   signed in, no hash → the editor (App)
//   otherwise          → the landing page (Home)

import { useEffect, useState } from "react";
import { App } from "./App";
import { Home } from "./pages/Home";
import { Terms } from "./pages/Terms";
import { useAuthStore } from "./auth";

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export function Root() {
  const hash = useHashRoute();
  const user = useAuthStore((s) => s.user);

  if (hash.startsWith("#/terms")) return <Terms />;
  if (user) return <App />;
  return <Home />;
}
