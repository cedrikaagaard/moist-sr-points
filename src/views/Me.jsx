import { RaidBadge } from "../components/common.jsx";
import ProfileBody from "../components/ProfileBody.jsx";
import IdentityPicker from "../components/IdentityPicker.jsx";
import { useMe, setMe } from "../identity.js";

export default function Me({ data }) {
  const me = useMe();
  const player = me ? data.playerByName.get(me.toLowerCase()) : null;

  // Not chosen yet → prompt to pick a character.
  if (!me) {
    return (
      <div className="view">
        <section className="me-hero">
          <h1>
            Who <span className="hero-accent">are</span> you?
          </h1>
          <p className="hero-sub">
            Pick your character to see your points, your best bets, and get your rows highlighted
            across the site. No login — it's just saved on this device.
          </p>
          <div className="me-hero-pick">
            <IdentityPicker
              players={data.players}
              autoFocus
              placeholder="Type your character name…"
              onPick={setMe}
            />
          </div>
        </section>
      </div>
    );
  }

  // Chosen, but no data yet → friendly zero-state (brand-new raider).
  if (!player) {
    return (
      <div className="view">
        <MeHeader me={me} />
        <div className="empty me-empty">
          <p>
            No points or soft-reserves recorded for <strong>{me}</strong> yet.
          </p>
          <p className="muted">
            Once you SR items in a raid, they'll show up here — with your points and your odds of
            winning each roll. Points build up 10 per SR (5 in Naxxramas) and carry over until you
            win the item.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <MeHeader me={me} player={player} />
      <ProfileBody data={data} player={player} />
    </div>
  );
}

function MeHeader({ me, player }) {
  return (
    <div className="profile-head me-head">
      <span className="player-avatar lg me-avatar">{me.slice(0, 2).toUpperCase()}</span>
      <div className="me-head-text">
        <div className="me-greeting">Your page</div>
        <h1>{player ? player.name : me}</h1>
        {player && (
          <div className="player-card-raids">
            {player.raids.map((r) => (
              <RaidBadge key={r} raid={r} size="sm" />
            ))}
          </div>
        )}
      </div>
      <button className="link-btn me-change" onClick={() => setMe(null)}>
        Not you? Change
      </button>
    </div>
  );
}
