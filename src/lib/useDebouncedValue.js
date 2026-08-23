import { useEffect, useState } from "react";

// Returns a copy of `value` that only updates after `delay` ms of no changes.
// Keeps a text input snappy while the expensive filtering runs less often.
export function useDebouncedValue(value, delay = 160) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
