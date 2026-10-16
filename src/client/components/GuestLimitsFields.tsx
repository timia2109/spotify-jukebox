import { t, Trans, useLocale } from "@/client/i18n";
import * as React from "react";
import type { DefaultGuestLimits, PartyRateLimits, RateLimitConfig } from "@/shared/types";
import { api } from "../http";
import { formatApiError } from "./QueueUi";

function LimitRow({
  label,
  hint,
  value,
  windowUnit,
  onChange,
}: {
  label: string;
  hint: string;
  value: RateLimitConfig;
  windowUnit: "min" | "sec";
  onChange: (next: RateLimitConfig) => void;
}) {
  useLocale();
  const windowValue =
    windowUnit === "sec"
      ? Math.round(value.windowMs / 1000)
      : Math.round(value.windowMs / 60_000);

  return (
    <div className="limit-row">
      <div className="limit-row-label">{label}</div>
      <div className="small">{hint}</div>
      <div className="row limit-row-inputs">
        <label className="small">
          <Trans
            message="guestLimitsFields.max"
            values={{
              input: <input
                type="number"
                min={1}
                max={999}
                className="limit-row-number"
                value={value.count}
                onChange={(e) =>
                  onChange({ ...value, count: Number(e.target.value) })
                }
              />,
            }}
          />
        </label>
        <label className="small">
          <Trans
            message="guestLimitsFields.per"
            values={{
              input: <input
                type="number"
                min={1}
                max={windowUnit === "sec" ? 300 : 240}
                className="limit-row-number"
                value={windowValue}
                onChange={(e) => {
                  const amount = Number(e.target.value);
                  onChange({
                    ...value,
                    windowMs:
                      windowUnit === "sec" ? amount * 1000 : amount * 60_000,
                  });
                }}
              />,
              unit: windowUnit === "sec" ? t("guestLimitsFields.seconds") : t("guestLimitsFields.minutes"),
            }}
          />
        </label>
      </div>
    </div>
  );
}

export function GuestLimitsFields({
  downvoteThreshold,
  boostCap,
  rateLimits,
  onDownvoteThresholdChange,
  onBoostCapChange,
  onRateLimitsChange,
  showIntro = true,
}: {
  downvoteThreshold: number;
  boostCap: number | null;
  rateLimits: PartyRateLimits;
  onDownvoteThresholdChange: (value: number) => void;
  onBoostCapChange: (value: number | null) => void;
  onRateLimitsChange: (next: PartyRateLimits) => void;
  showIntro?: boolean;
}) {
  useLocale();
  function patchLimit(key: keyof PartyRateLimits, next: RateLimitConfig) {
    onRateLimitsChange({ ...rateLimits, [key]: next });
  }

  return (
    <>
      {showIntro && (
        <p className="small guest-limits-intro">
          {t("guestLimitsFields.perGuestActionBudgetsResetAfterEachTime")}
        </p>
      )}
      <label className="form-field">
        <span>
          {t("guestLimitsFields.downvotesToSkipASong")}
        </span>
        <input
          type="number"
          min={1}
          max={20}
          value={downvoteThreshold}
          onChange={(e) => onDownvoteThresholdChange(Number(e.target.value))}
        />
      </label>
      <label className="form-field">
        <span>
          {t("guestLimitsFields.activeBoostCap")}
        </span>
        <input
          type="number"
          min={1}
          max={99}
          placeholder={t("guestLimitsFields.unlimited")}
          value={boostCap ?? ""}
          onChange={(e) => {
            const raw = e.target.value.trim();
            onBoostCapChange(raw === "" ? null : Number(raw));
          }}
        />
        <span className="small">
          {t("guestLimitsFields.maxBoostedTracksInTheQueueAtOnce")}
        </span>
      </label>
      <LimitRow
        label={t("guestLimitsFields.addSongs")}
        hint={t("guestLimitsFields.howManyTracksAGuestCanQueueIn")}
        value={rateLimits.add}
        windowUnit="min"
        onChange={(next) => patchLimit("add", next)}
      />
      <LimitRow
        label={t("common.upvotes")}
        hint={t("guestLimitsFields.howManyUpvotesAGuestCanSpendIn")}
        value={rateLimits.upvote}
        windowUnit="min"
        onChange={(next) => patchLimit("upvote", next)}
      />
      <LimitRow
        label={t("common.downvotes")}
        hint={t("guestLimitsFields.howManyDownvotesAGuestCanCastIn")}
        value={rateLimits.downvote}
        windowUnit="min"
        onChange={(next) => patchLimit("downvote", next)}
      />
      <LimitRow
        label={t("common.boost")}
        hint={t("guestLimitsFields.howManyTimesAGuestCanBoostA")}
        value={rateLimits.boost}
        windowUnit="min"
        onChange={(next) => patchLimit("boost", next)}
      />
      <LimitRow
        label={t("guestLimitsFields.searchPerGuest")}
        hint={t("guestLimitsFields.spotifySearchesOneGuestCanTriggerInThe")}
        value={rateLimits.search}
        windowUnit="min"
        onChange={(next) => patchLimit("search", next)}
      />
      <LimitRow
        label={t("guestLimitsFields.searchPartyWide")}
        hint={t("guestLimitsFields.totalSpotifySearchesAcrossAllGuestsInThe")}
        value={rateLimits.partySearch}
        windowUnit="sec"
        onChange={(next) => patchLimit("partySearch", next)}
      />
    </>
  );
}

export function GuestLimitsPanel({
  partyId,
  downvoteThreshold,
  boostCap,
  rateLimits,
  defaultGuestLimits,
  onDefaultGuestLimitsChange,
  onSaved,
}: {
  partyId: string;
  downvoteThreshold: number;
  boostCap: number | null;
  rateLimits: PartyRateLimits;
  defaultGuestLimits: DefaultGuestLimits;
  onDefaultGuestLimitsChange: (limits: DefaultGuestLimits) => void;
  onSaved: () => void;
}) {
  useLocale();
  const [limits, setLimits] = React.useState<PartyRateLimits>(rateLimits);
  const [downvoteThresholdValue, setDownvoteThresholdValue] = React.useState(downvoteThreshold);
  const [boostCapValue, setBoostCapValue] = React.useState<number | null>(boostCap);
  const [saving, setSaving] = React.useState(false);
  const [savingDefaults, setSavingDefaults] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLimits(rateLimits);
    setDownvoteThresholdValue(downvoteThreshold);
    setBoostCapValue(boostCap);
  }, [partyId]);

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/host/parties/${partyId}`, {
        method: "PATCH",
        body: JSON.stringify({
          rateLimits: limits,
          downvoteThreshold: downvoteThresholdValue,
          boostCap: boostCapValue,
        }),
      });
      setNotice(t("guestLimitsFields.guestLimitsSaved"));
      onSaved();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveAsDefaults() {
    setSavingDefaults(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await api<DefaultGuestLimits>(
        "/host/settings/default-rate-limits",
        {
          method: "PATCH",
          body: JSON.stringify({
            rateLimits: limits,
            downvoteThreshold: downvoteThresholdValue,
            boostCap: boostCapValue,
          }),
        },
      );
      onDefaultGuestLimitsChange(saved);
      setNotice(t("guestLimitsFields.savedAsDefaultsForNewParties"));
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSavingDefaults(false);
    }
  }

  return (
    <div className="admin-section admin-limits-panel">
      <h3>
        {t("guestLimitsFields.guestLimits")}
      </h3>
      <GuestLimitsFields
        downvoteThreshold={downvoteThresholdValue}
        boostCap={boostCapValue}
        rateLimits={limits}
        onDownvoteThresholdChange={setDownvoteThresholdValue}
        onBoostCapChange={setBoostCapValue}
        onRateLimitsChange={setLimits}
      />
      {error && <p className="error">{error}</p>}
      {notice && <p className="small">{notice}</p>}
      <div className="row party-controls">
        <button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? t("common.saving") : t("guestLimitsFields.saveLimits")}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={savingDefaults}
          onClick={() => void saveAsDefaults()}
        >
          {savingDefaults ? t("common.saving") : t("guestLimitsFields.saveAsDefaults")}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setLimits(defaultGuestLimits.rateLimits);
            setDownvoteThresholdValue(defaultGuestLimits.downvoteThreshold);
            setBoostCapValue(defaultGuestLimits.boostCap);
          }}
        >
          {t("guestLimitsFields.resetDefaults")}
        </button>
      </div>
    </div>
  );
}
