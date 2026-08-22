import { useEffect, useState } from "react";
import { loadData } from "./data.js";
import { useHashRoute, navigate, href } from "./router.js";
import Overview from "./views/Overview.jsx";
import Points from "./views/Points.jsx";
import Players from "./views/Players.jsx";
import History from "./views/History.jsx";
import Leeroy from "./components/Leeroy.jsx";

const NAV = [
  { view: "overview", label: "Overview" },
  { view: "points", label: "Points" },
  { view: "players", label: "Raiders" },
  { view: "history", label: "SR History" },
];

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { view, param } = useHashRoute();

  useEffect(() => {
    loadData().then(setData).catch((e) => setError(e.message));
  }, []);

  // Scroll to top on route change.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, param]);

  return (
    <div className="app">
      <Leeroy />
      <header className="topbar">
        <a className="brand" href={href("overview")}>
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
        {data && <GlobalSearch data={data} />}
      </header>

      <main className="content">
        {error && <div className="empty error">Couldn’t load data: {error}</div>}
        {!data && !error && <div className="loading">Summoning data…</div>}
        {data && view === "overview" && <Overview data={data} />}
        {data && view === "points" && <Points data={data} raid={param} />}
        {data && view === "players" && <Players data={data} name={param} />}
        {data && view === "history" && <History data={data} />}
      </main>

      {data && (
        <footer className="footer">
          <span>Built {data.updated}</span>
          {data.dataThrough && <span className="muted">Data through {data.dataThrough}</span>}
        </footer>
      )}
    </div>
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
