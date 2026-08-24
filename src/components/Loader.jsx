// Themed loading screen. Shows the steps of getting the data ready and ticks
// them off as they complete (driven by the `step` prop from loadData).
const STEPS = [
  ["engine", "Summoning the arcane engine"],
  ["download", "Fetching the guild ledger"],
  ["crunch", "Tallying points and rolls"],
];

export default function Loader({ step }) {
  const current = Math.max(
    0,
    STEPS.findIndex(([k]) => k === step)
  );
  return (
    <div className="loader">
      <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="" className="loader-logo" />
      <div className="loader-title">Preparing the raid…</div>
      <ul className="loader-steps">
        {STEPS.map(([key, label], i) => {
          const state = i < current ? "done" : i === current ? "active" : "pending";
          return (
            <li key={key} className={`loader-step ${state}`}>
              <span className="loader-ico">
                {state === "done" ? "✓" : state === "active" ? <span className="loader-spin" /> : "•"}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
