import { t, Trans, useLocale } from "@/client/i18n";
/** Required Spotify content attribution (Developer Terms). */
export function SpotifyAttribution() {
  useLocale();
  return (
    <p className="small spotify-attribution">
      <Trans
        message="spotifyAttribution.playbackPoweredBy"
        values={{
          spotifyLink: <a
            href="https://www.spotify.com"
            target="_blank"
            rel="noopener noreferrer"
          >{t("common.spotify")}</a>,
        }}
      />
    </p>
  );
}
