import { en } from "./locales/en";

export type TranslationKey = keyof typeof en;
export type PluralMessage = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;
export type Message = string | PluralMessage;
export type Dictionary = Record<TranslationKey, Message>;
export type TranslationValues = Record<string, string | number | null | undefined>;

/** A missing translation falls back to the complete English message. */
export function createTranslator(locale: string, messages: Partial<Dictionary>) {
  const plurals = new Intl.PluralRules(locale);
  const fallbackPlurals = new Intl.PluralRules("en");
  const numbers = new Intl.NumberFormat(locale);

  function template(key: TranslationKey, values: TranslationValues = {}): string {
    const message: Message = messages[key] ?? en[key];
    if (typeof message === "string") return message;
    const category = (messages[key] == null ? fallbackPlurals : plurals).select(Number(values.count ?? 0));
    return message[category] ?? message.other;
  }

  function translate(key: TranslationKey, values: TranslationValues = {}): string {
    return template(key, values).replace(/\{(\w+)\}/g, (_, name: string) =>
      typeof values[name] === "number" ? numbers.format(values[name]) : String(values[name] ?? ""),
    );
  }

  return { template, translate };
}
