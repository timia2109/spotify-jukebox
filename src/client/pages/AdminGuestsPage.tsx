import { t, useLocale } from "@/client/i18n";
import * as React from "react";
import { Link } from "react-router-dom";
import type { GuestAdminView, PartyView } from "@/shared/types";
import { AdminNav } from "../components/AdminNav";
import { GuestAdminList } from "../components/GuestAdminList";
import { formatApiError } from "../components/QueueUi";
import { api, apiOptional } from "../http";

interface PartyFull extends PartyView {
  id: string;
  slug: string;
  guestCount?: number;
}

export function AdminGuestsPage() {
  useLocale();
  const [party, setParty] = React.useState<PartyFull | null>(null);
  const [guests, setGuests] = React.useState<GuestAdminView[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      const p = await apiOptional<PartyFull>("/host/parties/current");
      setParty(p);
      if (p) {
        const g = await api<{ guests: GuestAdminView[] }>(
          `/host/parties/${p.id}/guests`,
        );
        setGuests(g.guests);
      } else {
        setGuests([]);
      }
    } catch (e) {
      setError(e instanceof Error ? formatApiError(e) : t("common.failedToLoad"));
    }
  }, []);

  React.useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  async function resetLimits(guest: GuestAdminView) {
    if (!party) return;
    const label = guest.displayName ?? t("adminGuestsPage.thisGuest");
    if (
      !confirm(
        t("adminGuestsPage.resetLimitsForTheyCanAddUpvoteDownvote", { label }),
      )
    ) {
      return;
    }
    try {
      setError(null);
      await api(`/host/parties/${party.id}/guests/${guest.id}/reset-limits`, {
        method: "POST",
      });
      await load();
    } catch (e) {
      setError(formatApiError(e));
    }
  }

  async function banToggle(guest: GuestAdminView) {
    if (!party) return;
    try {
      setError(null);
      await api(`/host/parties/${party.id}/guests/${guest.id}`, {
        method: "PATCH",
        body: JSON.stringify({ disabled: !guest.disabled }),
      });
      await load();
    } catch (e) {
      setError(formatApiError(e));
    }
  }

  async function clearAllGuests() {
    if (!party) return;
    if (
      !confirm(
        t("adminGuestsPage.removeAllGuestSTheirSessionsVotesAnd", { length: guests.length }),
      )
    ) {
      return;
    }
    try {
      setError(null);
      await api(`/host/parties/${party.id}/guests`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(formatApiError(e));
    }
  }

  const guestCount = guests.length;

  return (
    <div className="app admin-guests-page">
      <h1>
        {t("adminGuestsPage.jukeboxAdmin")}
      </h1>
      <AdminNav guestCount={guestCount} partyActive={!!party} />
      {error && <p className="error">{error}</p>}

      {!party ? (
        <div className="card">
          <p>
            {t("adminGuestsPage.noActiveParty")}
          </p>
          <Link to="/admin" className="admin-back-link">{t("common.backToAdmin")}</Link>
        </div>
      ) : (
        <div className="card">
          <p className="small guest-page-party">{party.name}</p>
          <GuestAdminList
            guests={guests}
            onBanToggle={(g) => void banToggle(g)}
            onResetLimits={(g) => void resetLimits(g)}
            onClearAll={() => void clearAllGuests()}
          />
        </div>
      )}
    </div>
  );
}
