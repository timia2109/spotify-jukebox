import { t, queueStatusLabel, useLocale } from "@/client/i18n";
import * as React from "react";
import { queueItemAnchorId } from "@/shared/queue-match";
import type { SearchQueueBlockReason } from "@/shared/queue-match";
import type { QueueItemView, TrackInfo } from "@/shared/types";

export function ThumbsUpIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="thumbs-up-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
    </svg>
  );
}

export function UpvoteCount({ count }: { count: number }) {
  return (
    <span className="upvote-count">
      <ThumbsUpIcon />
      <span>{count}</span>
    </span>
  );
}

export function ThumbsDownIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="thumbs-down-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 .55.45 1 1 1h5.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23 16 16.83V3zM17 1v12h4V1h-4z" />
    </svg>
  );
}

export function DownvoteCount({ count }: { count: number }) {
  return (
    <span className="downvote-count">
      <ThumbsDownIcon />
      <span>{count}</span>
    </span>
  );
}

export function BoostBadge({ boostedBy }: { boostedBy?: string | null }) {
  useLocale();
  return (
    <span className="boost-indicator">
      <span className="boost-badge">
        {t("queueUi.boosted")}
      </span>
      {boostedBy ? <span className="boost-by">{t("queueUi.by", { boostedBy })}</span> : null}
    </span>
  );
}

export function BoostButton({
  disabled,
  onClick,
  className,
}: {
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  useLocale();
  return (
    <button
      type="button"
      className={`boost-badge${disabled ? " boost-badge--disabled" : ""}${className ? ` ${className}` : ""}`}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onClick}
    >
      {t("common.boost")}
    </button>
  );
}

export function TrackVoteStats({
  upvoteCount,
  downvoteCount,
  showDownvotes = true,
}: {
  upvoteCount: number;
  downvoteCount?: number;
  showDownvotes?: boolean;
}) {
  useLocale();
  return (
    <div className="track-vote-stats">
      <UpvoteCount count={upvoteCount} />
      {showDownvotes && downvoteCount != null ? (
        <DownvoteCount count={downvoteCount} />
      ) : null}
    </div>
  );
}

export function TrackTitle({
  name,
  boosted,
  boostedBy,
}: {
  name: string;
  boosted?: boolean;
  boostedBy?: string | null;
}) {
  useLocale();
  return (
    <h3 className="track-title">
      <span className="track-title-name">{name}</span>
      {boosted ? <BoostBadge boostedBy={boostedBy} /> : null}
    </h3>
  );
}

function queueItemHighlightClass(
  itemId: string,
  highlightedItemId?: string | null,
): string {
  return highlightedItemId === itemId ? " queue-item--highlight" : "";
}

export function NowPlayingBanner({
  item,
  highlightedItemId,
}: {
  item: QueueItemView;
  highlightedItemId?: string | null;
}) {
  useLocale();
  return (
    <div
      id={queueItemAnchorId(item.id)}
      className={`banner playing now-playing${queueItemHighlightClass(item.id, highlightedItemId)}`}
    >
      <div className="now-playing-inner">
        {item.albumArtUrl ? (
          <img src={item.albumArtUrl} alt="" className="now-playing-art" />
        ) : (
          <div className="now-playing-art now-playing-art--placeholder" />
        )}
        <div className="now-playing-meta">
          <strong>{t("queueUi.nowPlaying")}</strong>
          <div className="now-playing-title">
            <span className="track-title-name">{item.trackName}</span>
            {item.isBoosted ? <BoostBadge boostedBy={item.boostedBy} /> : null}
          </div>
          <div className="now-playing-sub">{item.artistName} · {item.addedBy}</div>
        </div>
      </div>
    </div>
  );
}

export function UpNextLockedSection({
  item,
  highlightedItemId,
}: {
  item: QueueItemView;
  highlightedItemId?: string | null;
}) {
  useLocale();
  const buffered = item.status === "queued";
  return (
    <section
      id={queueItemAnchorId(item.id)}
      className={`up-next-locked${buffered ? " up-next-locked--buffered" : ""}${item.isBoosted ? " up-next-locked--boosted" : ""}${queueItemHighlightClass(item.id, highlightedItemId)}`}
    >
      <h2 className="up-next-locked-heading">
        {t("queueUi.upNext")}
      </h2>
      <p className="small up-next-locked-note">
        {buffered ? t("queueUi.lockedInSpotify") : t("queueUi.sendingToSpotify")}
      </p>
      <div className="track up-next-locked-track">
        {item.albumArtUrl && <img src={item.albumArtUrl} alt="" />}
        <div className="track-meta">
          <TrackTitle
            name={item.trackName}
            boosted={item.isBoosted}
            boostedBy={item.boostedBy}
          />
          <p className="track-meta-sub">
            {item.artistName} · {item.addedBy}
          </p>
        </div>
        <TrackVoteStats
          upvoteCount={item.upvoteCount}
          downvoteCount={item.downvoteCount}
        />
      </div>
    </section>
  );
}

export function SearchTrackRow({
  track,
  blockedReason,
  queueItemId,
  addDisabled,
  onAdd,
  onGoToQueue,
}: {
  track: TrackInfo;
  blockedReason?: SearchQueueBlockReason;
  queueItemId?: string | null;
  addDisabled?: boolean;
  onAdd: () => void;
  onGoToQueue?: (itemId: string) => void;
}) {
  useLocale();
  const inQueue = blockedReason != null;

  return (
    <div
      className={`track card search-track${inQueue ? " search-track--in-queue" : ""}`}
    >
      {track.albumArtUrl && <img src={track.albumArtUrl} alt="" />}
      <div className="track-meta">
        <h3>{track.name}</h3>
        <p>{track.artistName}</p>
      </div>
      {blockedReason === "active" && queueItemId && onGoToQueue ? (
        <button
          type="button"
          className="search-in-queue search-in-queue--link"
          onClick={() => onGoToQueue(queueItemId)}
        >
          {t("queueUi.inQueue")}
        </button>
      ) : blockedReason === "history" ? (
        <span className="search-in-queue search-in-queue--history">
          {t("queueUi.alreadyPlayed")}
        </span>
      ) : (
        <button type="button" disabled={addDisabled} onClick={onAdd}>{t("queueUi.add")}</button>
      )}
    </div>
  );
}

export function SearchNav({
  label,
  onBack,
}: {
  label: string;
  onBack: () => void;
}) {
  useLocale();
  return (
    <nav className="search-nav">
      <button type="button" className="secondary search-nav-back" onClick={onBack}>
        ← {label}
      </button>
    </nav>
  );
}

export function ReadOnlyQueueRow({ item }: { item: QueueItemView }) {
  useLocale();
  return (
    <div
      className={`track card${item.isBoosted ? " track--boosted" : ""}${item.spotifyLocked ? " track--spotify-locked" : ""}`}
    >
      {item.albumArtUrl && <img src={item.albumArtUrl} alt="" />}
      <div className="track-meta">
        <TrackTitle
          name={item.trackName}
          boosted={item.isBoosted}
          boostedBy={item.boostedBy}
        />
        <p className="track-meta-sub">
          {item.artistName} · {item.addedBy}
          {item.spotifyLocked ? t("queueUi.lockedInSpotify2") : ""}
        </p>
      </div>
      {!item.spotifyLocked && (
        <TrackVoteStats
          upvoteCount={item.upvoteCount}
          downvoteCount={item.downvoteCount}
        />
      )}
    </div>
  );
}

export function AdminQueueRow({
  item,
  onAction,
  partyId,
  canMoveUp = true,
  canMoveDown = true,
  highlightedItemId,
}: {
  item: QueueItemView;
  partyId: string;
  onAction: (path: string, method?: string, body?: unknown) => Promise<void>;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  highlightedItemId?: string | null;
}) {
  useLocale();
  const locked = item.spotifyLocked || item.status === "queued";

  return (
    <div
      id={queueItemAnchorId(item.id)}
      className={`track card${item.isBoosted ? " track--boosted" : ""}${locked ? " track--spotify-locked" : ""}${queueItemHighlightClass(item.id, highlightedItemId)}`}
    >
      {item.albumArtUrl && <img src={item.albumArtUrl} alt="" />}
      <div className="track-meta">
        <TrackTitle
          name={item.trackName}
          boosted={item.isBoosted}
          boostedBy={item.boostedBy}
        />
        <p className="track-meta-sub">
          {item.artistName} · {item.addedBy}
          {locked ? t("queueUi.lockedInSpotify2") : ""}
        </p>
      </div>
      {!locked ? (
        <div className="actions">
          <TrackVoteStats upvoteCount={item.upvoteCount} showDownvotes={false} />
          <button
            className="secondary"
            onClick={() =>
              void onAction(
                `/host/parties/${partyId}/queue/${item.id}`,
                "PATCH",
                { action: "force_next" },
              )
            }
          >
            {t("queueUi.forceNext")}
          </button>
          <button
            className="secondary"
            disabled={!canMoveUp}
            title={!canMoveUp ? t("queueUi.alreadyAtTopOfReorderableQueue") : undefined}
            onClick={() =>
              void onAction(
                `/host/parties/${partyId}/queue/${item.id}`,
                "PATCH",
                { action: "move_up" },
              )
            }
          >
            ↑
          </button>
          <button
            className="secondary"
            disabled={!canMoveDown}
            title={!canMoveDown ? t("queueUi.alreadyAtBottomOfReorderableQueue") : undefined}
            onClick={() =>
              void onAction(
                `/host/parties/${partyId}/queue/${item.id}`,
                "PATCH",
                { action: "move_down" },
              )
            }
          >
            ↓
          </button>
          <button
            className="secondary"
            onClick={() =>
              void onAction(
                `/host/parties/${partyId}/queue/start-from/${item.id}`,
              )
            }
          >
            {t("queueUi.startHere")}
          </button>
          <button
            className="secondary"
            onClick={() =>
              void onAction(
                `/host/parties/${partyId}/queue/${item.id}`,
                "DELETE",
              )
            }
          >
            {t("common.remove")}
          </button>
        </div>
      ) : (
        <TrackVoteStats upvoteCount={item.upvoteCount} showDownvotes={false} />
      )}
    </div>
  );
}

function historyStatusLabel(status: QueueItemView["status"]): string {
  return queueStatusLabel(status);
}

export function AdminHistoryRow({
  item,
  partyId,
  onAction,
}: {
  item: QueueItemView;
  partyId: string;
  onAction: (path: string, method?: string, body?: unknown) => Promise<void>;
}) {
  useLocale();
  const canUnblock = item.status === "played" || item.status === "downvoted";

  return (
    <div className="admin-history-row">
      <div className="admin-history-meta small">
        <strong>{item.trackName}</strong>
        <span>
          {" "}
          · {item.artistName} · {historyStatusLabel(item.status)}
        </span>
      </div>
      {canUnblock && (
        <div className="admin-history-actions">
          <button
            type="button"
            className="secondary small"
            title={t("queueUi.allowThisTrackToBeAddedToThe")}
            onClick={() =>
              void onAction(
                `/host/parties/${partyId}/history/${item.id}/unblock`,
              )
            }
          >
            {t("queueUi.unblock")}
          </button>
        </div>
      )}
    </div>
  );
}

export function SearchFilterChips({
  filters,
}: {
  filters: {
    id: string;
    label: string;
    active?: boolean;
    onClick: () => void;
  }[];
}) {
  useLocale();
  return (
    <div className="search-filters">
      {filters.map((f) => (
        <button
          key={f.id}
          type="button"
          className={`chip${f.active ? " chip--active" : ""}`}
          aria-pressed={f.active ?? false}
          onClick={() => f.onClick()}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export { formatApiError } from "../i18n/errors";
