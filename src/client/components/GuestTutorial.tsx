import { t, useLocale } from "@/client/i18n";
import * as React from "react";
import {
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "./QueueUi";
import { api } from "../http";

export function GuestTutorial({
  slug,
  onDismiss,
}: {
  slug: string;
  onDismiss: () => void;
}) {
  useLocale();
  const STEPS = [
    {
      title: t("guestTutorial.upvoteSongsYouLike"),
      body: t("guestTutorial.upvoteBody"),
      icon: <ThumbsUpIcon size={28} />,
    },
    {
      title: t("guestTutorial.downvoteToSkip"),
      body: t("guestTutorial.downvoteBody"),
      icon: <ThumbsDownIcon size={28} />,
    },
    {
      title: t("guestTutorial.boostOncePerParty"),
      body: t("guestTutorial.boostBody"),
      icon: <span className="boost-badge">{t("common.boost")}</span>,
    },
    {
      title: t("guestTutorial.seeWhatYouVePlayed"),
      body: t("guestTutorial.infoBody"),
      icon: <span className="guest-tutorial-nav-pill">{t("guestTutorial.myInfo")}</span>,
    },
  ] as const;

  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  async function dismiss() {
    if (saving) return;
    setSaving(true);
    try {
      await api(`/parties/${slug}/me`, {
        method: "PATCH",
        body: JSON.stringify({ tutorialSeen: true }),
      });
      onDismiss();
    } catch {
      onDismiss();
    } finally {
      setSaving(false);
    }
  }

  const current = STEPS[step]!;
  const isLast = step >= STEPS.length - 1;

  return (
    <div className="guest-tutorial-overlay" role="dialog" aria-modal="true">
      <div className="guest-tutorial-sheet card">
        <p className="small guest-tutorial-progress">
          {t("guestTutorial.stepOf", { step: step + 1, length: STEPS.length })}
        </p>
        <div className="guest-tutorial-icon">{current.icon}</div>
        <h2>{current.title}</h2>
        <p className="guest-tutorial-body">{current.body}</p>
        <div className="row guest-tutorial-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => void dismiss()}
            disabled={saving}
          >
            {t("guestTutorial.skip")}
          </button>
          {isLast ? (
            <button type="button" onClick={() => void dismiss()} disabled={saving}>
              {saving ? t("common.saving") : t("guestTutorial.gotIt")}
            </button>
          ) : (
            <button type="button" onClick={() => setStep((s) => s + 1)}>{t("guestTutorial.next")}</button>
          )}
        </div>
      </div>
    </div>
  );
}
