import { useEffect, useState } from "react";
import { loadData } from "./data.js";
import { useHashRoute, navigate, href } from "./router.js";
import Overview from "./views/Overview.jsx";
import Points from "./views/Points.jsx";
import Players from "./views/Players.jsx";
import History from "./views/History.jsx";
import Me from "./views/Me.jsx";
import Item from "./views/Item.jsx";
import Leeroy from "./components/Leeroy.jsx";
import Loader from "./components/Loader.jsx";
import { useMe } from "./identity.js";

const NAV = [
  { view: "me", label: "My Page" },
  { view: "points", label: "Points" },
  { view: "players", label: "Raiders" },
  { view: "history", label: "SR History" },
  { view: "stats", label: "Statistics" },
];

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("engine");
  const { view, param } = useHashRoute();

  useEffect(() => {
    // onFresh swaps in the newest data if the background check finds a newer
    // version after the fast cached copy has already rendered.
    loadData({ onProgress: setStep, onFresh: setData })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  // Scroll to top on route change.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, param]);

  return (
    <div className="app">
      <Leeroy />
      <header className="topbar">
        <a className="brand" href="#/">
          <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="Moist" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-name">Moist</span>
            <span className="brand-sub">SR Points</span>
          </div>
        </a>
        <nav className="nav">
          {NAV.map((n) => (
            <a
              key={n.view}
              href={href(n.view)}
              className={`nav-link${view === n.view ? " active" : ""}`}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <MeChip active={view === "me"} />
        {data && <GlobalSearch data={data} />}
      </header>

      <main className="content">
        {error && <div className="empty error">Couldn’t load data: {error}</div>}
        {!data && !error && <Loader step={step} />}
        {data && view === "me" && <Me data={data} />}
        {data && view === "stats" && <Overview data={data} />}
        {data && view === "points" && <Points data={data} raid={param} />}
        {data && view === "players" && <Players data={data} name={param} />}
        {data && view === "history" && <History data={data} />}
        {data && view === "item" && <Item data={data} id={param} />}
      </main>

      {data && (
        <footer className="footer">
          <span>
            {data.dataThrough ? (
              <>Data current through <strong>{data.dataThrough}</strong></>
            ) : (
              `Loaded ${data.updated}`
            )}
            {data.dbUpdated && (
              <>
                {" · database updated "}
                <span title={new Date(data.dbUpdated).toLocaleString()}>
                  {timeAgo(data.dbUpdated)}
                </span>
              </>
            )}
            {data.source && data.source !== "remote" && (
              <span className="source-tag"> · {data.source} db</span>
            )}
          </span>
          <span className="muted">live from the guild database</span>
        </footer>
      )}
    </div>
  );
}

// Human "x ago" from an HTTP date string (e.g. Last-Modified).
function timeAgo(dateStr) {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "recently";
  const secs = Math.max(0, (Date.now() - then) / 1000);
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [name, size] of units) {
    const n = Math.floor(secs / size);
    if (n >= 1) return `${n} ${name}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

function MeChip({ active }) {
  const me = useMe();
  if (!me) {
    return (
      <a className={`me-chip me-chip-empty${active ? " active" : ""}`} href={href("me")}>
        <span className="me-chip-avatar">?</span>
        Set your character
      </a>
    );
  }
  return (
    <a className={`me-chip${active ? " active" : ""}`} href={href("me")} title="Your page">
      <span className="me-chip-avatar">{me.slice(0, 2).toUpperCase()}</span>
      {me}
    </a>
  );
}

function GlobalSearch({ data }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const term = q.trim().toLowerCase();
  const matches = term
    ? data.players.filter((p) => p.name.toLowerCase().includes(term)).slice(0, 6)
    : [];

  return (
    <div className="global-search" onBlur={() => setTimeout(() => setOpen(false), 120)}>
      <input
        className="search sm"
        placeholder="⌕ Find a raider…"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0]) {
            navigate("players", matches[0].name);
            setQ("");
          }
        }}
      />
      {open && matches.length > 0 && (
        <div className="search-drop">
          {matches.map((p) => (
            <a
              key={p.name}
              href={href("players", p.name)}
              className="search-drop-item"
              onClick={() => setQ("")}
            >
              <span>{p.name}</span>
              <span className="muted">{p.totalPoints.toLocaleString()} pts</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
