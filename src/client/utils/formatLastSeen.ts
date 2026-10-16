import { t, getLocale } from "@/client/i18n";
export function formatLastSeen(iso: string | null): string {
  if (!iso) return t("formatLastSeen.never");
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return t("formatLastSeen.justNow");
  if (diffMs < 3_600_000) {
    const mins = Math.floor(diffMs / 60_000);
    return t("formatLastSeen.mAgo", { mins });
  }
  if (diffMs < 86_400_000) {
    const hrs = Math.floor(diffMs / 3_600_000);
    return t("formatLastSeen.hAgo", { hrs });
  }
  return new Date(iso).toLocaleString(getLocale());
}
