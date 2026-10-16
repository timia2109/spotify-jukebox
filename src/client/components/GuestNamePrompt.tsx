import { formatApiError } from "../i18n/errors";
import { t, Trans, useLocale } from "@/client/i18n";
import * as React from "react";
import type { DisplayNameConflictKind } from "@/shared/dedup";
import type { GuestMe } from "@/shared/types";
import { ApiError, api } from "../http";
import { setStoredGuestSession } from "../utils/guest-session";

export function GuestNamePrompt({
  slug,
  onSaved,
}: {
  slug: string;
  onSaved: (profile: GuestMe) => void;
}) {
  useLocale();
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [nameTaken, setNameTaken] = React.useState<{
    existingName: string;
    matchKind: DisplayNameConflictKind;
  } | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function saveName(options?: {
    confirmReclaim?: boolean;
    confirmDistinctName?: boolean;
  }) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const result = await api<{
        id: string;
        displayName: string | null;
        boostUsed: boolean;
        sessionToken?: string;
      }>(`/parties/${slug}/me`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: trimmed,
          confirmReclaim: options?.confirmReclaim,
          confirmDistinctName: options?.confirmDistinctName,
        }),
      });
      if (result.sessionToken) {
        setStoredGuestSession(slug, result.sessionToken);
      }
      setNameTaken(null);
      const profile = await api<Parameters<typeof onSaved>[0]>(`/parties/${slug}/me`);
      onSaved(profile);
    } catch (e) {
      if (e instanceof ApiError && e.code === "NAME_TAKEN") {
        setNameTaken({
          existingName: e.displayName ?? trimmed,
          matchKind: e.matchKind ?? "exact",
        });
        setError(null);
      } else {
        setError(e instanceof Error ? formatApiError(e) : t("guestNamePrompt.couldNotSaveName"));
        setNameTaken(null);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app guest-name-gate">
      <div className="card guest-name-card">
        <h1>
          {t("guestNamePrompt.welcome")}
        </h1>
        <p className="guest-name-intro">
          {t("guestNamePrompt.enterYourNameToJoinThePartyQueue")}
        </p>

        {nameTaken ? (
          <div className="guest-name-taken">
            <p>
              <Trans
                message="guestNamePrompt.someoneNamedIsAlreadyHereIsThatYou"
                values={{
                  name: <strong>{nameTaken.existingName}</strong>,
                }}
              />
            </p>
            <div className="guest-name-taken-actions">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveName({ confirmReclaim: true })}
              >
                {t("guestNamePrompt.yesThatSMe")}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={saving}
                onClick={() => {
                  if (nameTaken.matchKind === "fuzzy") {
                    void saveName({ confirmDistinctName: true });
                    return;
                  }
                  setNameTaken(null);
                  setName("");
                }}
              >
                {nameTaken.matchKind === "fuzzy"
                  ? t("guestNamePrompt.noThatSNotMe")
                  : t("guestNamePrompt.noPickAnotherName")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="guest-name-label" htmlFor="guest-display-name">{t("guestNamePrompt.yourName")}</label>
            <input
              id="guest-display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("guestNamePrompt.displayName")}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && void saveName()}
            />
            <div className="guest-name-submit">
              <button
                type="button"
                onClick={() => void saveName()}
                disabled={!name.trim() || saving}
              >
                {saving ? t("common.saving") : t("guestNamePrompt.continue")}
              </button>
            </div>
          </>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
