import { localizeMessage } from "../i18n/errors";
import { t, Trans, formatNumber, getLocale, useLocale } from "@/client/i18n";
import * as React from "react";
import { Link } from "react-router-dom";
import type {
  HostDiagnostics,
  MetricsSessionSummary,
  MetricsSnapshotSummary,
  PartyView,
} from "@/shared/types";
import { AdminNav } from "../components/AdminNav";
import { DiagnosticsSummaryPanels } from "../components/StatPanels";
import { formatApiError } from "../components/QueueUi";
import { api, apiOptional } from "../http";

interface PartyFull extends PartyView {
  id: string;
  slug: string;
  guestCount?: number;
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

function formatMinuteTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(getLocale(), {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(getLocale());
}

function formatPercent(rate: number): string {
  return formatNumber(rate, { style: "percent", maximumFractionDigits: 0 });
}

function sourceLabel(
  source: HostDiagnostics["search"]["recent"][number]["source"],
): string {
  if (source === "prefetch") return t("adminDiagnosticsPage.prefetch");
  if (source === "host") return t("adminDiagnosticsPage.host");
  return t("adminDiagnosticsPage.guest");
}

function reasonLabel(reason: MetricsSnapshotSummary["reason"]): string {
  if (reason === "rate_limit") return "429";
  if (reason === "startup") return t("adminDiagnosticsPage.start");
  return t("adminDiagnosticsPage.tick");
}

function DiagnosticsPanels({ diagnostics }: { diagnostics: HostDiagnostics }) {
  useLocale();
  const endpointRows = Object.entries(diagnostics.spotifyApi.byEndpointLast5m).sort(
    (a, b) => b[1] - a[1],
  );
  const callerRows = Object.entries(diagnostics.spotifyApi.byCallerLast5m).sort(
    (a, b) => b[1] - a[1],
  );
  const budget = diagnostics.globalApiBudget;
  const recentCalls = diagnostics.spotifyApi.recentApiCalls.slice(-20).reverse();
  const rateLimits = diagnostics.spotifyApi.rateLimitTimeline.slice(-10).reverse();

  return (
    <div className="diagnostics-grid">
      <section className="card diagnostics-card">
        <h2>
          {t("adminDiagnosticsPage.spotifyApi")}
        </h2>
        <p className="diagnostics-stat-line">
          <Trans
            message="adminDiagnosticsPage.callsInLast5mInLast1mIn"
            values={{
              calls5m: <strong>{diagnostics.spotifyApi.last5m}</strong>,
              calls1m: <strong>{diagnostics.spotifyApi.last1m}</strong>,
              calls24h: <strong>{diagnostics.spotifyApi.last24h}</strong>,
              totalCalls: <strong>{diagnostics.spotifyApi.total}</strong>,
            }}
          />
        </p>
        {diagnostics.spotifyApi.dailyWarnExceeded && (
          <p className="small diagnostics-error">
            {t("adminDiagnosticsPage.24hCallCountExceedsSoftThresholdYouMay", { toLocaleString: diagnostics.spotifyApi.dailyWarnCalls?.toLocaleString(getLocale()) })}
          </p>
        )}
        <p className="small">
          <Trans
            message="adminDiagnosticsPage.uptimeRateLimitsPrefetchApiCalls"
            values={{
              uptimeMs: formatDuration(diagnostics.uptimeMs),
              rateLimitCount: diagnostics.spotifyApi.rateLimitCount,
              prefetchApiCalls: diagnostics.spotifyApi.prefetchApiCalls,
              last429At: diagnostics.spotifyApi.last429At != null
              ? t("adminDiagnosticsPage.last429", { time: formatTime(diagnostics.spotifyApi.last429At) })
              : "",
            }}
          />
        </p>
        <p className="small">
          <Trans
            message="adminDiagnosticsPage.globalBudgetInWindow"
            values={{
              used: budget.used,
              limit: budget.limit,
              windowMs: formatDuration(budget.windowMs),
              resetsInMs: budget.resetsInMs > 0
              ? t("adminDiagnosticsPage.resetsIn", { resetsInMs: formatDuration(budget.resetsInMs) })
              : "",
            }}
          />
        </p>
        {callerRows.length > 0 && (
          <>
            <h3 className="diagnostics-subhead">
              {t("adminDiagnosticsPage.byCaller5m")}
            </h3>
            <ul className="diagnostics-list">
              {callerRows.map(([caller, count]) => (
                <li key={caller}>
                  <code>{caller}</code> · {count}
                </li>
              ))}
            </ul>
          </>
        )}
        {endpointRows.length > 0 ? (
          <>
            <h3 className="diagnostics-subhead">
              {t("adminDiagnosticsPage.byEndpoint5m")}
            </h3>
            <ul className="diagnostics-list">
              {endpointRows.map(([endpoint, count]) => (
                <li key={endpoint}>
                  <code>{endpoint}</code> · {count}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="small">
            {t("adminDiagnosticsPage.noSpotifyCallsInTheLast5Minutes")}
          </p>
        )}
        {recentCalls.length > 0 && (
          <details className="diagnostics-details">
            <summary>
              {t("adminDiagnosticsPage.recentApiCalls", { length: recentCalls.length })}
            </summary>
            <ul className="diagnostics-list diagnostics-api-list">
              {recentCalls.map((call, index) => (
                <li key={`${call.at}-${call.path}-${index}`}>
                  <span className="diagnostics-search-meta">
                    <Trans
                      message="adminDiagnosticsPage.ms"
                      values={{
                        at: formatTime(call.at),
                        caller: call.caller,
                        status: call.status,
                        elapsedMs: call.elapsedMs,
                        retryAfterMs: call.retryAfterMs != null
                        ? t("adminDiagnosticsPage.retry", { duration: formatDuration(call.retryAfterMs) })
                        : "",
                      }}
                    />
                  </span>
                  <code>{call.endpoint}</code>
                </li>
              ))}
            </ul>
          </details>
        )}
        {rateLimits.length > 0 && (
          <details className="diagnostics-details">
            <summary>
              {t("adminDiagnosticsPage.429Timeline", { length: rateLimits.length })}
            </summary>
            <ul className="diagnostics-list">
              {rateLimits.map((entry, index) => (
                <li key={`${entry.at}-${index}`}>
                  {t("adminDiagnosticsPage.retryAfter", { at: formatTime(entry.at), caller: entry.caller, retryAfterMs: formatDuration(entry.retryAfterMs) })}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="card diagnostics-card">
        <h2>
          {t("adminDiagnosticsPage.searchActivity")}
        </h2>
        <p className="diagnostics-stat-line">
          <Trans
            message="adminDiagnosticsPage.cacheHitRatePrefetches"
            values={{
              hitRate: <strong>{formatPercent(diagnostics.search.hitRate)}</strong>,
              prefetches: <strong>{diagnostics.search.prefetchCount}</strong>,
            }}
          />
        </p>
        <p className="small">
          {t("adminDiagnosticsPage.lookupsHitsMisses", { total: diagnostics.search.total, cacheHits: diagnostics.search.cacheHits, cacheMisses: diagnostics.search.cacheMisses })}
        </p>
        {diagnostics.partySearchBudget && (
          <p className="small">
            <Trans
              message="adminDiagnosticsPage.partySearchBudget"
              values={{
                used: diagnostics.partySearchBudget.used,
                limit: diagnostics.partySearchBudget.limit,
                resetsInMs: diagnostics.partySearchBudget.resetsInMs > 0
                ? t("adminDiagnosticsPage.resetsIn", { resetsInMs: formatDuration(diagnostics.partySearchBudget.resetsInMs) })
                : "",
              }}
            />
          </p>
        )}
        {diagnostics.search.recent.length > 0 ? (
          <ul className="diagnostics-list diagnostics-search-list">
            {diagnostics.search.recent.map((event) => (
              <li key={`${event.at}-${event.query}-${event.kind}`}>
                <span className="diagnostics-search-query">"{event.query}"</span>
                <span className="diagnostics-search-meta">
                  {sourceLabel(event.source)} · {event.kind} ·{" "}
                  {event.cacheHit ? t("adminDiagnosticsPage.cacheHit") : t("adminDiagnosticsPage.cacheMiss")} · {formatTime(event.at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small">
            {t("adminDiagnosticsPage.noSearchesInThisSnapshot")}
          </p>
        )}
      </section>

      <section className="card diagnostics-card">
        <h2>
          {t("adminDiagnosticsPage.cache")}
        </h2>
        <p className="diagnostics-stat-line">
          <Trans
            message="adminDiagnosticsPage.searchQueriesArtistTrackCachesTrackMetadata"
            values={{
              searchQueries: <strong>{diagnostics.cache.searchQueries.count}</strong>,
              artistCaches: <strong>{diagnostics.cache.artistTracks.count}</strong>,
              trackMetadata: <strong>{diagnostics.cache.trackMetadata.count}</strong>,
            }}
          />
        </p>
        {diagnostics.cache.searchQueries.samples.length > 0 && (
          <>
            <h3 className="diagnostics-subhead">
              {t("adminDiagnosticsPage.cachedSearches")}
            </h3>
            <ul className="diagnostics-list">
              {diagnostics.cache.searchQueries.samples.map((entry) => (
                <li key={entry.query}>
                  <Trans
                    message="adminDiagnosticsPage.tracksArtistsTtl"
                    values={{
                      code: <code>{entry.query}</code>,
                      trackCount: entry.trackCount,
                      artistCount: entry.artistCount,
                      expiresInMs: formatDuration(entry.expiresInMs),
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
        {diagnostics.cache.artistTracks.samples.length > 0 && (
          <>
            <h3 className="diagnostics-subhead">
              {t("adminDiagnosticsPage.cachedArtistTracks")}
            </h3>
            <ul className="diagnostics-list">
              {diagnostics.cache.artistTracks.samples.map((entry) => (
                <li key={entry.artistId}>
                  <Trans
                    message="adminDiagnosticsPage.tracksTtl"
                    values={{
                      code: <code>{entry.artistId}</code>,
                      trackCount: entry.trackCount,
                      expiresInMs: formatDuration(entry.expiresInMs),
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card diagnostics-card">
        <h2>
          {t("adminDiagnosticsPage.syncWorker")}
        </h2>
        <p className="diagnostics-stat-line">
          {diagnostics.sync.spotifyReachable ? t("statPanels.spotifyReachable") : t("adminDiagnosticsPage.spotifyUnreachable")}
          {diagnostics.sync.deviceName ? t("adminDiagnosticsPage.deviceName", { name: diagnostics.sync.deviceName }) : ""}
        </p>
        <p className="small">
          <Trans
            message="adminDiagnosticsPage.device"
            values={{
              deviceActive: diagnostics.sync.deviceActive ? t("adminDiagnosticsPage.active") : t("adminDiagnosticsPage.inactive"),
              deviceRestricted: diagnostics.sync.deviceRestricted ? t("adminDiagnosticsPage.restrictedDevice") : "",
              deviceMismatch: diagnostics.sync.deviceMismatch ? t("adminDiagnosticsPage.transferringDevice") : "",
            }}
          />
        </p>
        <p className="small">
          <Trans
            message="adminDiagnosticsPage.lastSync"
            values={{
              lastSyncedAt: formatTime(diagnostics.sync.lastSyncedAt),
              retryAfterMs: diagnostics.sync.retryAfterMs != null && diagnostics.sync.retryAfterMs > 0
              ? t("adminDiagnosticsPage.rateLimited", { retryAfterMs: formatDuration(diagnostics.sync.retryAfterMs) })
              : "",
              deviceTransferRetryAfterMs: diagnostics.sync.deviceTransferRetryAfterMs != null &&
              diagnostics.sync.deviceTransferRetryAfterMs > 0
                ? t("adminDiagnosticsPage.transferRetry", { deviceTransferRetryAfterMs: formatDuration(diagnostics.sync.deviceTransferRetryAfterMs) })
                : "",
            }}
          />
        </p>
        {localizeMessage(diagnostics.sync.lastError) && (
          <p className="small diagnostics-error">{localizeMessage(diagnostics.sync.lastError)}</p>
        )}
      </section>
    </div>
  );
}

export function AdminDiagnosticsPage() {
  useLocale();
  const [party, setParty] = React.useState<PartyFull | null>(null);
  const [liveDiagnostics, setLiveDiagnostics] = React.useState<HostDiagnostics | null>(
    null,
  );
  const [sessions, setSessions] = React.useState<MetricsSessionSummary[]>([]);
  const [viewMode, setViewMode] = React.useState<"live" | "history">("live");
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
  const [snapshots, setSnapshots] = React.useState<MetricsSnapshotSummary[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<number | null>(
    null,
  );
  const [historicalDiagnostics, setHistoricalDiagnostics] =
    React.useState<HostDiagnostics | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadSessions = React.useCallback(async () => {
    const data = await api<{ sessions: MetricsSessionSummary[] }>(
      "/host/metrics/sessions",
    );
    setSessions(data.sessions);
    return data.sessions;
  }, []);

  const loadLive = React.useCallback(async () => {
    const p = await apiOptional<PartyFull>("/host/parties/current");
    setParty(p);
    const data = await api<HostDiagnostics>("/host/diagnostics");
    setLiveDiagnostics(data);
    return data;
  }, []);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      await Promise.all([loadLive(), loadSessions()]);
    } catch (e) {
      setError(formatApiError(e));
    }
  }, [loadLive, loadSessions]);

  React.useEffect(() => {
    void load();
    const id = setInterval(() => {
      if (viewMode === "live") {
        void loadLive().catch((e) => setError(formatApiError(e)));
        void loadSessions().catch(() => {});
      }
    }, 4000);
    return () => clearInterval(id);
  }, [load, loadLive, loadSessions, viewMode]);

  React.useEffect(() => {
    if (viewMode !== "history" || !selectedSessionId) {
      setSnapshots([]);
      setSelectedSnapshotId(null);
      setHistoricalDiagnostics(null);
      return;
    }

    void (async () => {
      try {
        setError(null);
        const data = await api<{ snapshots: MetricsSnapshotSummary[] }>(
          `/host/metrics/sessions/${selectedSessionId}/snapshots?limit=180&granularity=minute`,
        );
        setSnapshots(data.snapshots);
        const preferred =
          data.snapshots.find((snapshot) => snapshot.reason === "rate_limit") ??
          data.snapshots[0] ??
          null;
        setSelectedSnapshotId(preferred?.id ?? null);
      } catch (e) {
        setError(formatApiError(e));
      }
    })();
  }, [viewMode, selectedSessionId]);

  React.useEffect(() => {
    if (
      viewMode !== "history" ||
      !selectedSessionId ||
      selectedSnapshotId == null
    ) {
      setHistoricalDiagnostics(null);
      return;
    }

    void (async () => {
      try {
        setError(null);
        const data = await api<HostDiagnostics>(
          `/host/metrics/sessions/${selectedSessionId}/snapshots/${selectedSnapshotId}`,
        );
        setHistoricalDiagnostics(data);
      } catch (e) {
        setError(formatApiError(e));
      }
    })();
  }, [viewMode, selectedSessionId, selectedSnapshotId]);

  const activeDiagnostics =
    viewMode === "live" ? liveDiagnostics : historicalDiagnostics;

  const currentSession = sessions.find((session) => session.isCurrent) ?? null;
  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null;

  return (
    <div className="app admin-diagnostics-page">
      <h1>
        {t("common.stats")}
      </h1>
      <AdminNav guestCount={party?.guestCount ?? 0} partyActive={!!party} />
      {error && <p className="error">{error}</p>}

      <section className="card diagnostics-session-bar">
        <div className="row diagnostics-session-controls">
          <button
            type="button"
            className={viewMode === "live" ? undefined : "secondary"}
            onClick={() => {
              setViewMode("live");
              setSelectedSessionId(null);
            }}
          >
            {t("adminDiagnosticsPage.live")}
          </button>
          <label className="small diagnostics-session-select">
            <Trans
              message="adminDiagnosticsPage.session"
              values={{
                select: <select
                  value={viewMode === "history" ? (selectedSessionId ?? "") : ""}
                  onChange={(e) => {
                    const sessionId = e.target.value;
                    if (!sessionId) {
                      setViewMode("live");
                      setSelectedSessionId(null);
                      return;
                    }
                    setViewMode("history");
                    setSelectedSessionId(sessionId);
                  }}
                >
                  <option value="">
                    {t("adminDiagnosticsPage.selectPastSession")}
                  </option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {formatDateTime(session.startedAt)}
                      {session.isCurrent ? " (current)" : ""}
                      {session.rateLimitSnapshotCount > 0
                        ? t("adminDiagnosticsPage.session429", { count: session.rateLimitSnapshotCount })
                        : ""}
                    </option>
                  ))}
                </select>,
              }}
            />
          </label>
        </div>
        <p className="small">
          {viewMode === "live" ? (
            <><Trans
              message="adminDiagnosticsPage.recordingEvery10sShownByMinuteIntoSession"
              values={{
                code: <code>{currentSession?.id ?? liveDiagnostics?.sessionId ?? t("adminDiagnosticsPage.message")}</code>,
                snapshotCount: currentSession
                ? t("adminDiagnosticsPage.snapshotCount", { count: currentSession.snapshotCount })
                : "",
              }}
            /></>
          ) : selectedSession ? (
            <><Trans
              message="adminDiagnosticsPage.viewingSnapshots"
              values={{
                startedAt: formatDateTime(selectedSession.startedAt),
                endedAt: selectedSession.endedAt
                ? t("adminDiagnosticsPage.sessionEnd", { time: formatDateTime(selectedSession.endedAt) })
                : " (running)",
                snapshotCount: selectedSession.snapshotCount,
                rateLimitSnapshotCount: selectedSession.rateLimitSnapshotCount > 0
                ? t("adminDiagnosticsPage.capturedAt429", { rateLimitSnapshotCount: selectedSession.rateLimitSnapshotCount })
                : "",
              }}
            /></>
          ) : (
            t("adminDiagnosticsPage.selectASessionToReviewRecordedMetrics")
          )}
        </p>
      </section>

      {viewMode === "history" && snapshots.length > 0 && (
        <section className="card diagnostics-snapshot-picker">
          <h2>
            {t("adminDiagnosticsPage.timeline1MinuteSummaries")}
          </h2>
          <div className="diagnostics-snapshot-list">
            {snapshots.map((snapshot) => (
              <button
                key={`${snapshot.id}-${snapshot.recordedAt}`}
                type="button"
                className={`diagnostics-snapshot-chip${
                  snapshot.id === selectedSnapshotId
                    ? " diagnostics-snapshot-chip--active"
                    : ""
                }${snapshot.reason === "rate_limit" ? " diagnostics-snapshot-chip--429" : ""}`}
                onClick={() => setSelectedSnapshotId(snapshot.id)}
              >
                <span>{formatMinuteTime(snapshot.recordedAt)}</span>
                <span className="diagnostics-snapshot-chip-meta">
                  <Trans
                    message="adminDiagnosticsPage.5m429"
                    values={{
                      reason: reasonLabel(snapshot.reason),
                      sampleCount: snapshot.sampleCount != null && snapshot.sampleCount > 1
                      ? t("adminDiagnosticsPage.samples", { count: snapshot.sampleCount })
                      : "",
                      apiCallsLast5m: snapshot.apiCallsLast5m,
                      rateLimitCount: snapshot.rateLimitCount,
                    }}
                  />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!activeDiagnostics ? (
        <p>
          {t("adminDiagnosticsPage.loadingDiagnostics")}
        </p>
      ) : (
        <>
          <DiagnosticsSummaryPanels diagnostics={activeDiagnostics} />
          <DiagnosticsPanels diagnostics={activeDiagnostics} />
        </>
      )}

      <p className="small" style={{ marginTop: "1rem" }}>
        <Link to="/admin" className="admin-back-link">{t("common.backToAdmin")}</Link>
      </p>
    </div>
  );
}
