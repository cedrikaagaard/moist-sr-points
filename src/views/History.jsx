import { useMemo, useState } from "react";
import { RAID_ORDER, RAID_META } from "../data.js";
import { WowheadLink, RaidBadge, PlayerLink } from "../components/common.jsx";

const PAGE = 60;

export default function History({ data }) {
  const [query, setQuery] = useState("");
  const [raidFilter, setRaidFilter] = useState(new Set());
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);

  const q = query.trim().toLowerCase();

  const rows = useMemo(() => {
    let r = data.srHistory;
    if (q) r = r.filter((x) => x.item.toLowerCase().includes(q) || x.character.toLowerCase().includes(q));
    if (raidFilter.size) r = r.filter((x) => raidFilter.has(x.raid));
    const dir = sort.dir === "asc" ? 1 : -1;
    r = [...r].sort((a, b) => {
      let av = a[sort.key];
      let bv = b[sort.key];
      if (sort.key === "quantity") return (av - bv) * dir;
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return r;
  }, [data.srHistory, q, raidFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pageCount);
  const slice = rows.slice((cur - 1) * PAGE, cur * PAGE);

  const toggleRaid = (r) => {
    setPage(1);
    setRaidFilter((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  };

  const setSortKey = (key) => {
    setPage(1);
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "date" || key === "quantity" ? "desc" : "asc" }));
  };

  const arrow = (key) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h1>SR history</h1>
          <p className="muted">
            {rows.length.toLocaleString()} of {data.srHistory.length.toLocaleString()} records
          </p>
        </div>
        <input
          className="search"
          placeholder="Filter by raider or item…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="filter-bar">
        {RAID_ORDER.map((r) => (
          <button
            key={r}
            className={`chip${raidFilter.has(r) ? " active" : ""}`}
            style={{ "--chip-color": RAID_META[r].color }}
            onClick={() => toggleRaid(r)}
          >
            <span className="seg-dot" style={{ background: RAID_META[r].color }} />
            {RAID_META[r].short}
          </button>
        ))}
        {(raidFilter.size > 0 || q) && (
          <button
            className="chip clear"
            onClick={() => {
              setRaidFilter(new Set());
              setQuery("");
              setPage(1);
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => setSortKey("item")}>Item{arrow("item")}</th>
              <th className="sortable" onClick={() => setSortKey("character")}>Raider{arrow("character")}</th>
              <th className="sortable" onClick={() => setSortKey("date")}>Date{arrow("date")}</th>
              <th className="sortable" onClick={() => setSortKey("raid")}>Raid{arrow("raid")}</th>
              <th className="sortable num" onClick={() => setSortKey("quantity")}>Qty{arrow("quantity")}</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i}>
                <td><WowheadLink id={r.itemId} name={r.item} className="item-name" /></td>
                <td><PlayerLink name={r.character} /></td>
                <td className="mono">{r.date}</td>
                <td><RaidBadge raid={r.raid} size="xs" /></td>
                <td className="num">{r.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {slice.length === 0 && <div className="empty">No records match your filters.</div>}
      </div>

      {pageCount > 1 && (
        <div className="pager">
          <button disabled={cur === 1} onClick={() => setPage(cur - 1)}>← Prev</button>
          <span>Page {cur} / {pageCount}</span>
          <button disabled={cur === pageCount} onClick={() => setPage(cur + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
