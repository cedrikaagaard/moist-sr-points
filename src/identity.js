// "Who am I" - a no-login identity the user picks once. Persisted in
// localStorage and readable anywhere via useMe(), so the app can highlight the
// user's own rows and show a personalised page. It's just a character name.
import { useSyncExternalStore } from "react";

const KEY = "moist:me";
let me = safeGet();
const subs = new Set();

function safeGet() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function setMe(name) {
  me = name ? name.trim() : null;
  try {
    if (me) localStorage.setItem(KEY, me);
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode / storage disabled - still works for the session */
  }
  subs.forEach((f) => f());
}

export function useMe() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => me
  );
}

// Case-insensitive "is this name me?" helper.
export function makeIsMe(meName) {
  const lower = meName ? meName.toLowerCase() : null;
  return (name) => lower != null && name.toLowerCase() === lower;
}
