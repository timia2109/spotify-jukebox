import { t, Trans, useLocale } from "@/client/i18n";
import { Link, useLocation } from "react-router-dom";

export function GuestNav({
  slug,
  activeSongCount,
}: {
  slug: string;
  activeSongCount: number;
}) {
  useLocale();
  const location = useLocation();

  const base = `/p/${slug}`;
  const onQueue =
    location.pathname === base || location.pathname === `${base}/`;
  const onMyInfo =
    location.pathname === `${base}/info` ||
    location.pathname === `${base}/songs`;

  return (
    <nav className="guest-nav" aria-label={t("guestNav.guestSections")}>
      <Link
        to={base}
        className={`guest-nav-link${onQueue ? " guest-nav-link--active" : ""}`}
      >{t("adminNav.queue")}</Link>
      <Link
        to={`${base}/info`}
        className={`guest-nav-link${onMyInfo ? " guest-nav-link--active" : ""}`}
      >
        <Trans
          message="guestNav.myInfo"
          values={{
            span: activeSongCount > 0 ? (
              <span className="guest-nav-badge">{activeSongCount}</span>
            ) : null,
          }}
        />
      </Link>
    </nav>
  );
}
