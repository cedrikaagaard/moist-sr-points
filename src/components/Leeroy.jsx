import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Leeroy Jenkins easter egg (documented in README.md → "Easter eggs").
// Two flavours:
//   • CHARGE — random page loads, Leeroy sprints across the screen (unprompted).
//   • CRY    — type the CODE anywhere for the full battle cry.
// You can also force either via the URL: ?leeroy=charge or ?leeroy (cry).
//
// Tweak these to taste:
const ENABLED = true; //        set false to disable the easter egg entirely
const CHARGE_ODDS = 1 / 20; //  chance per page load of the unprompted charge
//                                (use 1 for "every load" while testing)
const CODE = "leeroy"; //       the word to type for the full battle cry
// ---------------------------------------------------------------------------

export default function Leeroy() {
  const [mode, setMode] = useState(null); // "cry" | "charge" | null
  const buf = useRef("");
  const timer = useRef(null);

  const play = (m) => {
    clearTimeout(timer.current);
    setMode(m);
    timer.current = setTimeout(() => setMode(null), m === "charge" ? 4000 : 4200);
  };

  useEffect(() => {
    if (!ENABLED) return;
    const q = window.location.search.toLowerCase();
    if (q.includes("leeroy")) play(q.includes("charge") ? "charge" : "cry");
    else if (Math.random() < CHARGE_ODDS) play("charge");

    const onKey = (e) => {
      if (e.key.length !== 1) return;
      buf.current = (buf.current + e.key.toLowerCase()).slice(-CODE.length);
      if (buf.current === CODE) {
        buf.current = "";
        play("cry");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer.current);
    };
  }, []);

  // Only the full cry shakes the whole app.
  useEffect(() => {
    document.body.classList.toggle("leeroy-shake", mode === "cry");
    return () => document.body.classList.remove("leeroy-shake");
  }, [mode]);

  if (!mode) return null;
  if (mode === "charge") return <Charge onDone={() => setMode(null)} />;
  return <Cry onDismiss={() => setMode(null)} />;
}

function Charge({ onDone }) {
  // Sprint *along* a random on-screen bar or line of text.
  const [y, setY] = useState(null);

  useEffect(() => {
    const selectors = [
      ".point-bar-track",
      ".barchart-track",
      ".point-bar-fill",
      "h1",
      "h2",
      ".item-title",
      ".stat-value",
    ];
    const inView = [];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 60 && r.top > 40 && r.bottom < window.innerHeight - 20) {
          inView.push(r.top + r.height / 2);
        }
      });
    }
    // Pick a random eligible line; fall back to mid-screen.
    setY(inView.length ? inView[Math.floor(Math.random() * inView.length)] : window.innerHeight * 0.4);
  }, []);

  if (y == null) return null;
  return (
    <div className="leeroy-charge" onClick={onDone}>
      <div className="leeroy-runner" style={{ top: `${y}px` }}>
        <span className="leeroy-shout">LEEEEEROY JENKINS!</span>
        <span className="leeroy-runner-emoji">🏃</span>
        <span className="leeroy-dust">💨</span>
        <span className="leeroy-trail">🐔🍗🐔</span>
      </div>
    </div>
  );
}

function Cry({ onDismiss }) {
  const chickens = Array.from({ length: 26 });
  return (
    <div className="leeroy-overlay" onClick={onDismiss}>
      <div className="leeroy-chickens">
        {chickens.map((_, i) => (
          <span
            key={i}
            className="leeroy-chicken"
            style={{
              left: `${(i / chickens.length) * 100 + Math.random() * 3}%`,
              animationDelay: `${Math.random() * 1.6}s`,
              animationDuration: `${2.4 + Math.random() * 1.8}s`,
              fontSize: `${20 + Math.random() * 26}px`,
            }}
          >
            🐔
          </span>
        ))}
      </div>
      <div className="leeroy-cry">
        <div className="leeroy-name">LEEEEEROY</div>
        <div className="leeroy-name jenkins">JENKINS!</div>
        <div className="leeroy-sub">…at least I have chicken. 🍗</div>
      </div>
    </div>
  );
}
