import { Fragment, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createTranslator } from "./core";
import type { Dictionary, TranslationKey, TranslationValues } from "./core";
import { en, wirePatterns } from "./locales/en";
import { de } from "./locales/de";

export type { Dictionary, TranslationKey } from "./core";

// Register additional language files here. Regional codes also match their base language.
const dictionaries: Record<string, Dictionary> = { en, de };
const storageKey = "jukebox_locale";
const listeners = new Set<() => void>();

function matchLocale(requested: string): string | undefined {
  const normalized = requested.toLowerCase();
  return Object.keys(dictionaries).find((code) => code.toLowerCase() === normalized)
    ?? Object.keys(dictionaries).find((code) => code.toLowerCase() === normalized.split("-")[0]);
}

export function resolveLocale(requested: string): string {
  return matchLocale(requested) ?? "en";
}

function initialLocale(): string {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) return resolveLocale(saved);
  } catch {
    // Storage may be disabled in private browsing.
  }
  return window.navigator.languages.map(matchLocale).find((code) => code != null) ?? "en";
}

let locale = initialLocale();
let translator = createTranslator(locale, dictionaries[locale]!);

export function getLocale(): string {
  return locale;
}

export function t(key: TranslationKey, values?: TranslationValues): string {
  return translator.translate(key, values);
}

function updateDocument() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.title = t("common.jukebox");
}

export function setLocale(requested: string): void {
  locale = resolveLocale(requested);
  translator = createTranslator(locale, dictionaries[locale]!);
  try {
    window.localStorage.setItem(storageKey, locale);
  } catch {
    // Translation also works without persistent storage.
  }
  updateDocument();
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => { listeners.delete(notify); };
}

export function useLocale(): string {
  return useSyncExternalStore(subscribe, getLocale, getLocale);
}

/** Rich messages keep links/emphasis as React nodes so translators can reorder them. */
export function Trans({ message, values = {} }: {
  message: TranslationKey;
  values?: Record<string, ReactNode>;
}) {
  useLocale();
  const pluralValues = typeof values.count === "number" ? { count: values.count } : {};
  const template = translator.template(message, pluralValues);
  return (
    <>
      {template.split(/(\{\w+\})/g).map((part, index) => {
        const value = /^\{\w+\}$/.test(part) ? values[part.slice(1, -1)] : part;
        return <Fragment key={index}>{typeof value === "number" ? formatNumber(value) : value}</Fragment>;
      })}
    </>
  );
}

updateDocument();

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function queueStatusLabel(status: string): string {
  switch (status) {
    case "pending": return t("common.status.pending");
    case "queued": return t("common.status.queued");
    case "playing": return t("common.status.playing");
    case "played": return t("common.played");
    case "skipped": return t("common.removed");
    case "downvoted": return t("common.downvoted");
    case "unblocked": return t("common.unblocked");
    default: return t("common.status.unknown");
  }
}

/** Compatibility with the server's existing English queue-position labels. */
export function queuePositionLabel(position: string): string {
  if (position === en["queueUi.nowPlaying"]) return t("queueUi.nowPlaying");
  if (position === en["queueUi.upNext"]) return t("queueUi.upNext");
  const match = position.match(wirePatterns.queuePosition);
  return match ? t("queue.position", { position: Number(match[1]) }) : position;
}
