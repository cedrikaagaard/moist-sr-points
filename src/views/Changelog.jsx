import { CHANGELOG, VERSION, REPO_URL } from "../changelog.js";
import { GitHubIcon } from "../components/common.jsx";

export default function Changelog() {
  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h1>Changelog</h1>
          <p className="muted">
            What's new in Moist SR Points · currently <strong>v{VERSION}</strong>
          </p>
        </div>
        <div className="item-page-links">
          <a className="ext-link" href={REPO_URL} target="_blank" rel="noreferrer">
            <GitHubIcon size={15} /> GitHub
          </a>
        </div>
      </div>

      <ol className="changelog">
        {CHANGELOG.map((entry) => (
          <li key={entry.version} className="changelog-entry">
            <div className="changelog-marker">
              <span className="changelog-version">v{entry.version}</span>
              <span className="changelog-date mono">{entry.date}</span>
            </div>
            <ul className="changelog-changes">
              {entry.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
