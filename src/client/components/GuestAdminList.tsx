import { t, Trans, getLocale, queueStatusLabel, useLocale } from "@/client/i18n";
import type { GuestAdminView } from "@/shared/types";
import { formatLastSeen } from "../utils/formatLastSeen";

export function GuestAdminList({
  guests,
  onBanToggle,
  onResetLimits,
  onClearAll,
}: {
  guests: GuestAdminView[];
  onBanToggle: (guest: GuestAdminView) => void;
  onResetLimits: (guest: GuestAdminView) => void;
  onClearAll: () => void;
}) {
  useLocale();
  return (
    <>
      <div className="guest-admin-header">
        <h2>
          {t("common.guests")}
        </h2>
        {guests.length > 0 ? (
          <button className="secondary" onClick={onClearAll}>{t("guestAdminList.clearAllGuests")}</button>
        ) : null}
      </div>
      {guests.length > 0 ? (
        <p className="small guest-admin-hint">
          {t("guestAdminList.loadTestsCreateNewSessionsEachRunUse")}
        </p>
      ) : null}
      {guests.length === 0 ? (
        <p className="small">
          {t("guestAdminList.noGuestsYetShareTheJoinLinkTo")}
        </p>
      ) : (
        guests.map((guest) => (
          <div key={guest.id} className="guest-admin-row">
            <div className="guest-admin-main">
              <div className="guest-admin-name">
                {guest.displayName ?? t("guestAdminList.anonymous")}
                {guest.disabled ? (
                  <span className="guest-admin-badge guest-admin-badge--banned">
                    {t("guestAdminList.banned")}
                  </span>
                ) : null}
              </div>
              <div className="small guest-admin-meta">
                <Trans
                  message="guestAdminList.lastSeenJoined"
                  values={{
                    lastSeenAt: formatLastSeen(guest.lastSeenAt),
                    toLocaleDateString: new Date(guest.createdAt).toLocaleDateString(getLocale()),
                    span: guest.lastIp ? (
                      <><Trans message="guestAdminList.ip" values={{ span: <span className="guest-admin-ip">{guest.lastIp}</span> }} /></>
                    ) : null,
                  }}
                />
              </div>
              <div className="guest-admin-stats">
                <span>
                  {t("guestAdminList.added", { length: guest.songsAdded.length })}
                </span>
                <span>
                  {t("guestAdminList.upvotes", { count: guest.upvoteCount })}
                </span>
                <span>
                  {t("guestAdminList.downvotes", { count: guest.downvoteCount })}
                </span>
                <span>
                  {t("guestAdminList.boost", { count: guest.boostCount })}
                </span>
              </div>
              {guest.songsAdded.length > 0 ? (
                <ul className="guest-songs-list">
                  {guest.songsAdded.map((song) => (
                    <li key={`${song.addedAt}-${song.trackName}`}>
                      {song.trackName} — {song.artistName}
                      <span className="guest-song-status">{queueStatusLabel(song.status)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small guest-admin-no-songs">
                  {t("guestAdminList.noSongsAdded")}
                </p>
              )}
            </div>
            <div className="guest-admin-actions">
              <button
                className="secondary"
                onClick={() => onResetLimits(guest)}
              >
                {t("guestAdminList.resetLimits")}
              </button>
              <button
                className="secondary"
                onClick={() => onBanToggle(guest)}
              >
                {guest.disabled ? t("guestAdminList.unban") : t("guestAdminList.ban")}
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}
