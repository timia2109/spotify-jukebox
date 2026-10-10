import { t, Trans, useLocale } from "@/client/i18n";
export function HomePage() {
  useLocale();
  return (
    <div className="app">
      <h1>
        {t("common.jukebox")}
      </h1>
      <p>
        {t("homePage.partyQueueForSpotifyGuestsVoteOnWhat")}
      </p>
      <div className="card">
        <h2>
          {t("homePage.host")}
        </h2>
        <p>
          <Trans
            message="homePage.toConnectSpotifyAndRunAParty"
            values={{
              adminLink: <a href="/admin">{t("homePage.openAdmin")}</a>,
            }}
          />
        </p>
      </div>
      <div className="card">
        <h2>
          {t("homePage.guest")}
        </h2>
        <p className="small">
          <Trans
            message="homePage.openTheLinkOrScanTheQrCode"
            values={{
              exampleLink: <code>{t("homePage.pYourParty")}</code>,
            }}
          />
        </p>
      </div>
    </div>
  );
}
