import { useEffect, useState } from "react";

// Tiny hash router: routes look like #/points/MC or #/players/Tanknarok.
// Keeps URLs shareable without pulling in react-router.
export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return {
    view: parts[0] || "overview",
    param: parts[1] ? decodeURIComponent(parts[1]) : null,
  };
}

export function navigate(view, param) {
  const suffix = param ? `/${encodeURIComponent(param)}` : "";
  window.location.hash = `#/${view}${suffix}`;
}

export function href(view, param) {
  const suffix = param ? `/${encodeURIComponent(param)}` : "";
  return `#/${view}${suffix}`;
}
