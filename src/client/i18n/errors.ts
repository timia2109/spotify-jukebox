import { ApiError } from "../http";
import { t } from "./index";
import type { TranslationKey } from "./core";
import { en, apiMessageRules, wirePatterns, spotifyMessagePatterns } from "./locales/en";

const sourceKeys = new Map<string, TranslationKey>();
for (const [key, message] of Object.entries(en)) {
  if (typeof message === "string" && !message.includes("{")) {
    sourceKeys.set(message, key as TranslationKey);
  }
}

const errorKeys: Record<string, TranslationKey> = {
  NOT_FOUND: "errors.notFound",
  IMPORT_NOT_FOUND: "errors.notFound",
  NO_SESSION: "errors.noSession",
  BANNED: "errors.banned",
  UNAUTHORIZED: "errors.unauthorized",
  NOT_CONNECTED: "errors.notConnected",
  SPOTIFY_ERROR: "errors.spotify",
  SPOTIFY_REAUTH_REQUIRED: "errors.notConnected",
  DEVICE_REQUIRED: "errors.deviceRequired",
  DEVICE_NOT_FOUND: "errors.deviceNotFound",
  NO_SEED: "errors.noSeed",
  PLAYLIST_NAME_COLLISION: "errors.playlistCollision",
  INVALID_NAME: "errors.invalidName",
  INVALID_RATE_LIMITS: "errors.invalidLimits",
  NOT_BOOSTED: "errors.notBoosted",
  HISTORY_IMPORT_FAILED: "errors.importFailed",
  PLAYLIST_IMPORT_FAILED: "errors.importFailed",
  INVALID_ITEM: "errors.invalid",
  INVALID_URI: "errors.invalid",
  INVALID: "errors.invalid",
  INVALID_ACTION: "errors.invalid",
  BAD_REQUEST: "errors.invalid",
  DISPLAY_NAME_REQUIRED: "queueUi.enterYourNameBeforeAddingSongs",
  DUPLICATE: "queueUi.thatSongIsAlreadyInTheQueue",
  PARTY_OFF: "queueUi.partyIsPausedTurnItOnToAdd",
  NEXT_LOCKED: "queueUi.thatSongIsAlreadyQueuedInSpotify",
  NOT_OWNER: "queueUi.youCanOnlyChangeYourOwnSongs",
  NOW_PLAYING: "queueUi.thatSongIsPlayingRightNow",
};

/** Translate known application messages; preserve external diagnostic details. */
export function localizeMessage(message: string): string;
export function localizeMessage(message: string | null): string | null;
export function localizeMessage(message: string | undefined): string | undefined;
export function localizeMessage(message: string | null | undefined): string | null | undefined;
export function localizeMessage(message: string | null | undefined): string | null | undefined {
  if (message == null) return message;
  const direct = sourceKeys.get(message);
  if (direct) return t(direct);
  const rateLimit = localizedRateLimit(message);
  if (rateLimit) return rateLimit;
  for (const { pattern, key } of spotifyMessagePatterns) {
    const match = message.match(pattern);
    if (match?.groups) {
      const values = Object.fromEntries(Object.entries(match.groups).map(([name, value]) => [
        name,
        name === "seconds" || name === "retryAfterMs" ? Number(value) : localizeMessage(value),
      ]));
      return t(key, values);
    }
  }
  const legacy = apiMessageRules.find(({ pattern }) => pattern.test(message));
  return legacy ? t(legacy.key) : message;
}

function localizedRateLimit(message: string): string | null {
  let retry = "";
  const retryMatch = message.match(wirePatterns.retry);
  if (retryMatch) {
    const unit = retryMatch[2] as "second" | "minute" | "hour";
    const duration = t(`rateLimit.${unit}`, { count: Number(retryMatch[1]) });
    retry = t("rateLimit.retry", { duration });
  }
  const add = message.match(wirePatterns.addLimit);
  if (add) return t("rateLimit.add", { count: Number(add[1]), retry });
  const action = message.match(wirePatterns.actionLimit);
  if (action) {
    const name = action[2]!.startsWith("search") ? "search"
      : action[2]!.replace(/s$/, "") as "upvote" | "downvote" | "boost";
    return t(`rateLimit.${name}`, { count: Number(action[1]), retry });
  }
  if (wirePatterns.boostLimit.test(message)) return t("rateLimit.boost", { count: 1, retry });
  if (wirePatterns.partySearch.test(message)) return t("rateLimit.partySearch", { retry });
  if (wirePatterns.spotifyBackoff.test(message)) return t("rateLimit.spotifyBackoff", { retry });
  return null;
}

export function resolveRateLimitMessage(message: string | undefined, fallback: string): string {
  return !message || wirePatterns.genericLimit.test(message) ? fallback : localizeMessage(message);
}

export function isUpNextError(error: ApiError): boolean {
  return wirePatterns.nextLocked.test(error.message);
}

export function formatApiError(error: unknown): string {
  if (!(error instanceof Error)) return t("queueUi.somethingWentWrong");
  if (error instanceof ApiError && error.code === "RATE_LIMITED") {
    return resolveRateLimitMessage(error.message, t("queueUi.youVeReachedYourLimitForThatAction"));
  }
  const localized = localizeMessage(error.message);
  if (sourceKeys.has(error.message) || localized !== error.message || apiMessageRules.some(({ pattern }) => pattern.test(error.message))) {
    return localized;
  }
  if (error instanceof ApiError && error.code && errorKeys[error.code]) {
    return t(errorKeys[error.code]!);
  }
  return localized;
}
