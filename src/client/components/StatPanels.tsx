import { localizeMessage } from "../i18n/errors";
import { t, Trans, formatNumber, getLocale, useLocale } from "@/client/i18n";
import * as React from "react";
import type { HostDiagnostics } from "@/shared/types";
import { DEFAULT_PARTY_SEARCH_LIMIT } from "@/shared/types";

export function formatRateLimitWindow(windowMs: number): string {
  const minutes = windowMs / (60 * 1000);
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return t("statPanels.perHours", { count: hours });
  }
  if (minutes >= 1) {
    return t("statPanels.perMinutes", { count: minutes });
  }
  const seconds = Math.round(windowMs / 1000);
  return t("statPanels.perSeconds", { count: seconds });
}

export function StatTile({
  label,
  value,
  meta,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
  tone?: "default" | "warn" | "ok";
}) {
  useLocale();
  return (
    <div className={`stat-tile stat-tile--${tone}`}>
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{value}</span>
      {meta ? <span className="stat-tile-meta">{meta}</span> : null}
    </div>
  );
}

export function StatGrid({
  children,
  columns = 2,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}) {
  useLocale();
  return (
    <div className={`stat-grid stat-grid--cols-${columns}`}>{children}</div>
  );
}

export function QuotaTile({
  label,
  remaining,
  limit,
  windowMs,
  tone = "default",
}: {
  label: string;
  remaining: number;
  limit: number;
  windowMs: number;
  tone?: "default" | "warn" | "ok";
}) {
  useLocale();
  const pct = limit > 0 ? Math.round((remaining / limit) * 100) : 0;

  return (
    <div className={`stat-tile stat-tile--quota stat-tile--${tone}`}>
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{remaining}</span>
      <span className="stat-tile-meta">
        {t("statPanels.ofLeft", { remaining, limit, windowMs: formatRateLimitWindow(windowMs) })}
      </span>
      <div
        className="stat-tile-bar"
        role="progressbar"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={t("statPanels.remainingLabel", { label, remaining, limit })}
      >
        <div className="stat-tile-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BudgetTile({
  label,
  used,
  limit,
  windowMs,
  resetsInMs,
}: {
  label: string;
  used: number;
  limit: number;
  windowMs: number;
  resetsInMs?: number;
}) {
  useLocale();
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.round((remaining / limit) * 100) : 0;
  const tone = remaining <= limit * 0.2 ? "warn" : "default";

  return (
    <div className={`stat-tile stat-tile--quota stat-tile--${tone}`}>
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{used}</span>
      <span className="stat-tile-meta">
        <Trans
          message="statPanels.ofUsed"
          values={{
            used,
            limit,
            windowMs: formatRateLimitWindow(windowMs),
            resetsInMs: resetsInMs != null && resetsInMs > 0
            ? t("statPanels.resetsInS", { resetsInMs: Math.ceil(resetsInMs / 1000) })
            : "",
          }}
        />
      </span>
      <div
        className="stat-tile-bar"
        role="progressbar"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={t("statPanels.remainingLabel", { label, remaining, limit })}
      >
        <div className="stat-tile-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatPanel({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  useLocale();
  return (
    <section className="stat-panel card">
      <h2>{title}</h2>
      {intro ? <p className="stat-panel-intro">{intro}</p> : null}
      {children}
    </section>
  );
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return t("common.duration.seconds", { value: formatNumber(Math.round(ms / 1000)) });
  if (ms < 3_600_000) return t("common.duration.minutes", { value: formatNumber(Math.round(ms / 60_000)) });
  return t("common.duration.hours", { value: formatNumber(ms / 3_600_000, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) });
}

function formatTime(at: number | null): string {
  if (at == null) return "—";
  return new Date(at).toLocaleTimeString(getLocale());
}

function formatPercent(rate: number): string {
  return formatNumber(rate, { style: "percent", maximumFractionDigits: 0 });
}

function limitKindLabel(kind: string): string {
  switch (kind) {
    case "guest_add":
      return t("statPanels.addsBlocked");
    case "guest_upvote":
      return t("statPanels.upvotesBlocked");
    case "guest_downvote":
      return t("statPanels.downvotesBlocked");
    case "guest_boost":
      return t("statPanels.boostsBlocked");
    case "guest_search":
      return t("statPanels.guestSearchesBlocked");
    case "party_search":
      return t("statPanels.partySearchesBlocked");
    default:
      return kind;
  }
}

function countRecent429s(diagnostics: HostDiagnostics): number {
  const cutoff = Date.now() - 5 * 60_000;
  return diagnostics.spotifyApi.rateLimitTimeline.filter((entry) => entry.at >= cutoff)
    .length;
}

function countRecentSearches(diagnostics: HostDiagnostics): number {
  const cutoff = Date.now() - 5 * 60_000;
  return diagnostics.search.recent.filter((entry) => entry.at >= cutoff).length;
}

export function DiagnosticsSummaryPanels({
  diagnostics,
}: {
  diagnostics: HostDiagnostics;
}) {
  useLocale();
  const guestLimits = diagnostics.guestLimits ?? {
    total: 0,
    last5m: 0,
    byKindLast5m: {},
    byKindTotal: {},
  };
  const spotify429Last5m = countRecent429s(diagnostics);
  const searchesLast5m = countRecentSearches(diagnostics);
  const callsPerMin = Math.round(diagnostics.spotifyApi.last5m / 5);
  const guestLimitKinds = Object.entries(guestLimits.byKindLast5m).sort(
    (a, b) => b[1] - a[1],
  );
  const syncRateLimited =
    diagnostics.sync.retryAfterMs != null && diagnostics.sync.retryAfterMs > 0;

  return (
    <>
      <StatPanel
        title={t("statPanels.apiActivity")}
        intro={t("statPanels.spotifyCallVolumeAndRateLimitPressureOver")}
      >
        <StatGrid columns={4}>
          <StatTile
            label={t("statPanels.spotifyCalls5m")}
            value={diagnostics.spotifyApi.last5m}
            meta={t("statPanels.minInLast1m", { callsPerMin, last1m: diagnostics.spotifyApi.last1m })}
          />
          <StatTile
            label={t("statPanels.spotify429s")}
            value={diagnostics.spotifyApi.rateLimitCount}
            meta={
              syncRateLimited
                ? t("statPanels.backingOffInLast5m", { retryAfterMs: formatDuration(diagnostics.sync.retryAfterMs ?? 0), spotify429Last5m })
                : spotify429Last5m > 0
                  ? t("statPanels.inLast5mLastAt", { spotify429Last5m, last429At: formatTime(diagnostics.spotifyApi.last429At) })
                  : diagnostics.spotifyApi.last429At != null
                    ? t("statPanels.lastAt", { last429At: formatTime(diagnostics.spotifyApi.last429At) })
                    : t("statPanels.noneThisSession")
            }
            tone={
              syncRateLimited || spotify429Last5m > 0
                ? "warn"
                : "default"
            }
          />
          <StatTile
            label={t("statPanels.searchQueries5m")}
            value={searchesLast5m}
            meta={t("statPanels.totalCacheHit", { total: diagnostics.search.total, hitRate: formatPercent(diagnostics.search.hitRate) })}
            tone={diagnostics.search.cacheMisses > diagnostics.search.cacheHits ? "warn" : "default"}
          />
          <StatTile
            label={t("statPanels.apiCalls")}
            value={diagnostics.spotifyApi.last24h.toLocaleString(getLocale())}
            meta={t("statPanels.last24hSessionUptime", { uptimeMs: formatDuration(diagnostics.uptimeMs) })}
            tone={diagnostics.spotifyApi.dailyWarnExceeded ? "warn" : "default"}
          />
        </StatGrid>
      </StatPanel>

      <StatPanel
        title={t("statPanels.budgetsLimits")}
        intro={t("statPanels.sharedApiBudgetPartySearchAllowanceAndGuest")}
      >
        <StatGrid columns={4}>
          <BudgetTile
            label={t("statPanels.globalSpotifyBudget")}
            used={diagnostics.globalApiBudget.used}
            limit={diagnostics.globalApiBudget.limit}
            windowMs={diagnostics.globalApiBudget.windowMs}
            resetsInMs={diagnostics.globalApiBudget.resetsInMs}
          />
          {diagnostics.partySearchBudget ? (
            <BudgetTile
              label={t("statPanels.partySearchBudget")}
              used={diagnostics.partySearchBudget.used}
              limit={diagnostics.partySearchBudget.limit}
              windowMs={DEFAULT_PARTY_SEARCH_LIMIT.windowMs}
              resetsInMs={diagnostics.partySearchBudget.resetsInMs}
            />
          ) : (
            <StatTile
              label={t("statPanels.partySearchBudget")}
              value="—"
              meta={t("common.noActiveParty")}
            />
          )}
          <StatTile
            label={t("statPanels.guestLimitsHit5m")}
            value={guestLimits.last5m}
            meta={
              guestLimits.total > 0
                ? t("statPanels.totalThisSession", { total: guestLimits.total })
                : t("statPanels.noGuestBlocksRecently")
            }
            tone={guestLimits.last5m > 0 ? "warn" : "default"}
          />
          <StatTile
            label={t("statPanels.sync")}
            value={diagnostics.sync.deviceActive ? t("statPanels.active") : t("statPanels.idle")}
            meta={
              syncRateLimited
                ? t("statPanels.rateLimited", { lastError: localizeMessage(diagnostics.sync.lastError) ?? t("statPanels.backingOff") })
                : diagnostics.sync.deviceMismatch
                  ? localizeMessage(diagnostics.sync.lastError) ?? t("statPanels.transferringPlayback")
                  : diagnostics.sync.deviceRestricted
                    ? localizeMessage(diagnostics.sync.lastError) ?? t("statPanels.restrictedDevice")
                    : localizeMessage(diagnostics.sync.lastError) ?? t("statPanels.spotifyReachable")
            }
            tone={
              syncRateLimited ||
              diagnostics.sync.deviceRestricted ||
              diagnostics.sync.deviceMismatch
                ? "warn"
                : diagnostics.sync.deviceActive
                  ? "ok"
                  : "default"
            }
          />
        </StatGrid>
        {guestLimitKinds.length > 0 && (
          <div className="stat-breakdown">
            {guestLimitKinds.map(([kind, count]) => (
              <span key={kind} className="stat-breakdown-item">
                {limitKindLabel(kind)} · {count}
              </span>
            ))}
          </div>
        )}
        {diagnostics.spotifyApi.dailyWarnExceeded && (
          <p className="stat-panel-warn">
            {t("statPanels.24hSpotifyCallCountExceedsSoftThresholdExpect", { toLocaleString: diagnostics.spotifyApi.dailyWarnCalls?.toLocaleString(getLocale()) })}
          </p>
        )}
      </StatPanel>
    </>
  );
}

export function GuestQuotaPanel({
  quota,
  rateLimits,
}: {
  quota: { add: number; upvote: number; downvote: number; boost: number };
  rateLimits: {
    add: { count: number; windowMs: number };
    upvote: { count: number; windowMs: number };
    downvote: { count: number; windowMs: number };
    boost: { count: number; windowMs: number };
  };
}) {
  useLocale();
  return (
    <StatPanel
      title={t("statPanels.actionsLeft")}
      intro={t("statPanels.yourRemainingAddsUpvotesDownvotesAndBoostsFor")}
    >
      <StatGrid columns={4}>
        <QuotaTile
          label={t("statPanels.adds")}
          remaining={quota.add}
          limit={rateLimits.add.count}
          windowMs={rateLimits.add.windowMs}
        />
        <QuotaTile
          label={t("common.upvotes")}
          remaining={quota.upvote}
          limit={rateLimits.upvote.count}
          windowMs={rateLimits.upvote.windowMs}
        />
        <QuotaTile
          label={t("common.downvotes")}
          remaining={quota.downvote}
          limit={rateLimits.downvote.count}
          windowMs={rateLimits.downvote.windowMs}
        />
        <QuotaTile
          label={t("common.boosts")}
          remaining={quota.boost}
          limit={rateLimits.boost.count}
          windowMs={rateLimits.boost.windowMs}
        />
      </StatGrid>
    </StatPanel>
  );
}

export function GuestActivityPanel({
  stats,
}: {
  stats: {
    upvotesGiven: number;
    downvotesGiven: number;
    boostsGiven: number;
    songsInQueue: number;
    songsPlayed: number;
    songsAdded: number;
  };
}) {
  useLocale();
  return (
    <StatPanel title={t("statPanels.yourActivity")}>
      <StatGrid columns={3}>
        <StatTile label={t("statPanels.upvotesGiven")} value={stats.upvotesGiven} />
        <StatTile label={t("statPanels.downvotesGiven")} value={stats.downvotesGiven} />
        <StatTile label={t("statPanels.boostsUsed")} value={stats.boostsGiven} />
        <StatTile label={t("statPanels.songsInQueue")} value={stats.songsInQueue} />
        <StatTile label={t("statPanels.songsPlayed")} value={stats.songsPlayed} />
        <StatTile label={t("statPanels.songsAdded")} value={stats.songsAdded} />
      </StatGrid>
    </StatPanel>
  );
}
