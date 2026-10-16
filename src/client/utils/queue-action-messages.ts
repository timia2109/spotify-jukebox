import { t } from "@/client/i18n";
import type { QueueItemView } from "@/shared/types";
import { isUpNextError, resolveRateLimitMessage } from "../i18n/errors";
import { ApiError } from "../http";

export function upvoteBlockedMessage(
  item: QueueItemView,
  canMutate: boolean,
  isOwn: boolean,
  upvotesLeft?: number,
): string {
  if (!canMutate) return t("queue-action-messages.partyIsPausedActionsAreOff");
  if (item.guestUpvoteBlocked) {
    const upNextPending =
      item.status === "pending" && !item.guestDownvoteBlocked;
    return upNextPending
      ? t("queue-action-messages.upNextUpvotesAreLocked")
      : t("queue-action-messages.alreadyQueuedInSpotifyUpvotesAreLocked");
  }
  if (isOwn) return t("queue-action-messages.youCanTUpvoteYourOwnSong");
  if (item.guestHasUpvoted) return t("queue-action-messages.youAlreadyUpvotedThisSong");
  if (upvotesLeft === 0) return t("queue-action-messages.noUpvotesLeft");
  return t("queue-action-messages.canTUpvoteThisSong");
}

export function downvoteBlockedMessage(
  item: QueueItemView,
  canMutate: boolean,
  downvotesLeft?: number,
): string {
  if (!canMutate) return t("queue-action-messages.partyIsPausedActionsAreOff");
  if (item.guestDownvoteBlocked) {
    return t("queue-action-messages.alreadyQueuedInSpotifyDownvotesAreLocked");
  }
  if (item.guestHasDownvoted) return t("queue-action-messages.youAlreadyDownvotedThisSong");
  if (downvotesLeft === 0) return t("queue-action-messages.noDownvotesLeft");
  return t("queue-action-messages.canTDownvoteThisSong");
}

export function boostBlockedMessage(
  item: QueueItemView,
  canMutate: boolean,
  boostsLeft: number,
  partyBoostsRemaining?: number | null,
): string {
  if (!canMutate) return t("queue-action-messages.partyIsPausedActionsAreOff");
  if (partyBoostsRemaining === 0) return t("queue-action-messages.boostLimitReachedForThisParty");
  if (item.guestBoostBlocked) {
    const upNextPending =
      item.status === "pending" && !item.guestDownvoteBlocked;
    return upNextPending
      ? t("queue-action-messages.upNextBoostIsLocked")
      : t("queue-action-messages.alreadyQueuedInSpotifyBoostIsLocked");
  }
  if (item.isBoosted) return t("queue-action-messages.alreadyBoosted");
  if (boostsLeft === 0) return t("queue-action-messages.noBoostsLeft");
  return t("queue-action-messages.canTBoostThisSong");
}

export function upvoteApiMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  switch (error.code) {
    case "NEXT_LOCKED":
      return isUpNextError(error)
        ? t("queue-action-messages.upNextUpvotesAreLocked")
        : t("queue-action-messages.alreadyQueuedInSpotifyUpvotesAreLocked");
    case "OWN_SONG":
      return t("queue-action-messages.youCanTUpvoteYourOwnSong");
    case "ALREADY_VOTED":
      return t("queue-action-messages.youAlreadyUpvotedThisSong");
    case "RATE_LIMITED":
      return resolveRateLimitMessage(
        error.message,
        t("queue-action-messages.youVeUsedAllYourUpvotes"),
      );
    case "PARTY_OFF":
      return t("queue-action-messages.partyIsPausedTurnItOnToVote");
    default:
      return null;
  }
}

export function downvoteApiMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  switch (error.code) {
    case "NEXT_LOCKED":
      return t("queue-action-messages.alreadyQueuedInSpotifyDownvotesAreLocked");
    case "ALREADY_DOWNVOTED":
      return t("queue-action-messages.youAlreadyDownvotedThisSong");
    case "NOW_PLAYING":
      return t("queue-action-messages.canTDownvoteWhatSPlayingNow");
    case "RATE_LIMITED":
      return resolveRateLimitMessage(
        error.message,
        t("queue-action-messages.youVeUsedAllYourDownvotes"),
      );
    case "PARTY_OFF":
      return t("queue-action-messages.partyIsPausedTurnItOnToVote");
    default:
      return null;
  }
}

export function boostApiMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  switch (error.code) {
    case "BOOST_USED":
      return t("queue-action-messages.noBoostsLeft");
    case "RATE_LIMITED":
      return resolveRateLimitMessage(
        error.message,
        t("queue-action-messages.youVeUsedYourBoost"),
      );
    case "ALREADY_BOOSTED":
      return t("queue-action-messages.alreadyBoosted");
    case "NEXT_LOCKED":
      return isUpNextError(error)
        ? t("queue-action-messages.upNextBoostIsLocked")
        : t("queue-action-messages.alreadyQueuedInSpotifyBoostIsLocked");
    case "PARTY_OFF":
      return t("queue-action-messages.partyIsPausedTurnItOnToBoost");
    case "BOOST_CAP":
      return t("queue-action-messages.boostLimitReachedForThisParty");
    default:
      return null;
  }
}
