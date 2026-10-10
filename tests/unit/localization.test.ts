import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createTranslator } from "../../src/client/i18n/core";
import type { Message, TranslationKey } from "../../src/client/i18n/core";
import { en } from "../../src/client/i18n/locales/en";
import { de } from "../../src/client/i18n/locales/de";
import { Trans, queuePositionLabel, queueStatusLabel, resolveLocale, setLocale, getLocale, formatNumber } from "../../src/client/i18n";
import { formatApiError, localizeMessage, resolveRateLimitMessage } from "../../src/client/i18n/errors";
import { ApiError } from "../../src/client/http";
import { HomePage } from "../../src/client/pages/HomePage";
import { GuestTutorial } from "../../src/client/components/GuestTutorial";

function clientFiles(directory = resolve(import.meta.dir, "../../src/client")): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "i18n") return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? clientFiles(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

function placeholders(message: Message): Set<string> {
  const texts = typeof message === "string" ? [message] : Object.values(message);
  return new Set(texts.flatMap((text) => Array.from(text.matchAll(/\{(\w+)\}/g), (match) => match[1]!)));
}

describe("frontend localization", () => {
  test("translations reorder placeholders and format numbers without interpreting their contents", () => {
    const translator = createTranslator("de", {
      "guestPage.addedToTheQueue": "Zur Warteschlange hinzugefügt: {name}",
      "queue.position": "Platz {position}",
    });
    expect(translator.translate("guestPage.addedToTheQueue", { name: "{name} <script>" }))
      .toBe("Zur Warteschlange hinzugefügt: {name} <script>");
    expect(translator.translate("queue.position", { position: 1234 })).toBe("Platz 1.234");
    expect(translator.translate("common.search")).toBe("Search");
  });

  test("plural categories follow the translated language, with English fallback for missing messages", () => {
    const translator = createTranslator("pl", {
      "rateLimit.add": {
        one: "{count} utwór",
        few: "{count} utwory",
        many: "{count} utworów",
        other: "{count} utworu",
      },
    });
    expect(translator.translate("rateLimit.add", { count: 1 })).toBe("1 utwór");
    expect(translator.translate("rateLimit.add", { count: 2 })).toBe("2 utwory");
    expect(translator.translate("rateLimit.add", { count: 5 })).toBe("5 utworów");
    expect(translator.translate("rateLimit.add", { count: 1.5 })).toBe("1,5 utworu");
    expect(translator.translate("adminPage.playlistTracks", { count: 21 })).toBe("21 tracks");
    expect(translator.translate("adminPage.playlistTracks", { count: 1 })).toBe("1 track");
  });

  test("rich messages retain real links and safely escape user content", () => {
    const html = renderToStaticMarkup(createElement(Trans, {
      message: "guestNamePrompt.someoneNamedIsAlreadyHereIsThatYou",
      values: { name: createElement("strong", null, "<script>") },
    }));
    expect(html).toBe("Someone named <strong>&lt;script&gt;</strong> is already here. Is that you?");
    const home = renderToStaticMarkup(createElement(HomePage));
    expect(home).toContain('<a href="/admin">Open admin</a> to connect Spotify and run a party.');
    expect(home).toContain("looks like <code>/p/your-party</code>");
    const tutorial = renderToStaticMarkup(createElement(GuestTutorial, { slug: "party", onDismiss() {} }));
    expect(tutorial).toContain("Step 1 of 4");
    expect(tutorial).toContain("Upvote songs you like");
    expect(tutorial).toContain("Tap the thumbs up");
  });

  test("API rate limits retain counts and retry information, and unknown diagnostics remain available", () => {
    expect(localizeMessage("You've used all 10 upvotes. Try again in 2 minutes."))
      .toBe("You've used all 10 upvotes. Try again in 2 minutes.");
    expect(localizeMessage("You've used your boost. Try again in 1 second."))
      .toBe("You've used your boost. Try again in 1 second.");
    expect(localizeMessage("The party has reached its search limit. Try again in 1 hour."))
      .toBe("The party has reached its search limit. Try again in 1 hour.");
    expect(resolveRateLimitMessage("Rate limited", "fallback")).toBe("fallback");
    expect(formatApiError(new ApiError("Duplicate song", "DUPLICATE")))
      .toBe("That song is already in the queue.");
    expect(localizeMessage("Moving playback from Lounge to Kitchen…"))
      .toBe("Moving playback from Lounge to Kitchen…");
    expect(formatApiError(new ApiError("Could not load tracks", "SPOTIFY_ERROR")))
      .toBe("Could not load tracks");
    expect(localizeMessage("External diagnostic 123")).toBe("External diagnostic 123");
    expect(localizeMessage(null)).toBeNull();
  });

  test("queue labels and regional locale fallback use the catalogue", () => {
    expect(queuePositionLabel("Now playing")).toBe("Now playing");
    expect(queuePositionLabel("Up next")).toBe("Up next");
    expect(queuePositionLabel("#3 in queue")).toBe("#3 in queue");
    expect(queueStatusLabel("skipped")).toBe("Removed");
    expect(queueStatusLabel("pending")).toBe("Pending");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("EN-gb")).toBe("en");
    expect(resolveLocale("unsupported")).toBe("en");
  });

  test("the German catalogue covers every message and preserves each plural form's placeholders", () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as TranslationKey[]) {
      const source: Message = en[key];
      const translation: Message = de[key];
      if (typeof source === "string") {
        expect(typeof translation).toBe("string");
        expect([...placeholders(translation)].sort()).toEqual([...placeholders(source)].sort());
      } else {
        expect(typeof translation).toBe("object");
        if (typeof translation === "string") continue;
        expect(Object.keys(translation).sort()).toEqual(Object.keys(source).sort());
        for (const form of Object.keys(source) as Intl.LDMLPluralRule[]) {
          expect([...placeholders(translation[form]!)].sort())
            .toEqual([...placeholders(source[form]!)].sort());
        }
      }
    }
  });

  test("German regional locales render translated pages, rich messages, and queue labels", () => {
    const previous = getLocale();
    try {
      expect(resolveLocale("de-DE")).toBe("de");
      expect(resolveLocale("de-AT")).toBe("de");
      expect(resolveLocale("DE-ch")).toBe("de");
      setLocale("de-DE");
      expect(getLocale()).toBe("de");
      expect(formatNumber(1234.5)).toBe("1.234,5");
      const home = renderToStaticMarkup(createElement(HomePage));
      expect(home).toContain('<a href="/admin">Verwaltung öffnen</a>, um Spotify zu verbinden');
      expect(home).toContain("zum Beispiel <code>/p/deine-party</code>");
      const tutorial = renderToStaticMarkup(createElement(GuestTutorial, { slug: "party", onDismiss() {} }));
      expect(tutorial).toContain("Schritt 1 von 4");
      expect(tutorial).toContain("Stimme Songs zu, die dir gefallen");
      expect(tutorial).toContain("Tippe beim Song eines anderen Gastes");
      expect(tutorial).toContain("Überspringen");
      const prompt = renderToStaticMarkup(createElement(Trans, {
        message: "guestNamePrompt.someoneNamedIsAlreadyHereIsThatYou",
        values: { name: createElement("strong", null, "<Tim>") },
      }));
      expect(prompt).toBe("Jemand namens <strong>&lt;Tim&gt;</strong> ist bereits hier. Bist du das?");
      expect(queuePositionLabel("Now playing")).toBe("Läuft gerade");
      expect(queuePositionLabel("Up next")).toBe("Als Nächstes");
      expect(queuePositionLabel("#3 in queue")).toBe("Platz 3 in der Warteschlange");
      expect(queueStatusLabel("skipped")).toBe("Entfernt");
      expect(queueStatusLabel("pending")).toBe("Ausstehend");
    } finally {
      setLocale(previous);
    }
  });

  test("German API messages localize retry durations, plural forms, and device transfers", () => {
    const previous = getLocale();
    try {
      setLocale("de");
      expect(localizeMessage("You've used all 10 upvotes. Try again in 2 minutes."))
        .toBe("Du hast alle 10 Zustimmungen verbraucht. Versuche es in 2 Minuten erneut.");
      expect(localizeMessage("You've used your boost. Try again in 1 second."))
        .toBe("Du hast deinen Boost verbraucht. Versuche es in 1 Sekunde erneut.");
      expect(localizeMessage("The party has reached its search limit. Try again in 1.5 hours."))
        .toBe("Die Party hat ihr Suchlimit erreicht. Versuche es in 1,5 Stunden erneut.");
      expect(formatApiError(new ApiError("Duplicate song", "DUPLICATE")))
        .toBe("Dieser Song ist bereits in der Warteschlange.");
      expect(formatApiError(new ApiError("No session", "NO_SESSION")))
        .toBe("Deine Sitzung ist abgelaufen. Tritt der Party erneut bei.");
      expect(localizeMessage("Moving playback from another device to the selected player…"))
        .toBe("Wiedergabe wird von einem anderen Gerät auf das ausgewählte Gerät übertragen…");
      expect(localizeMessage("Could not move playback to target device — retrying in 10s"))
        .toBe("Wiedergabe konnte nicht auf das Zielgerät übertragen werden — erneuter Versuch in 10 s");
      const translator = createTranslator("de", de);
      expect(translator.translate("guestMyInfoPage.youHaveBoostLeft", { count: 1 }))
        .toBe(" Du hast noch 1 Boost übrig.");
      expect(translator.translate("guestMyInfoPage.youHaveBoostLeft", { count: 2 }))
        .toBe(" Du hast noch 2 Boosts übrig.");
      expect(translator.translate("statPanels.perHours", { count: 1 })).toBe("pro Stunde");
      expect(translator.translate("statPanels.perHours", { count: 2 })).toBe("pro 2 Stunden");
    } finally {
      setLocale(previous);
    }
  });

  test("all static translation calls supply the catalogue's placeholders", () => {
    const problems: string[] = [];
    for (const path of clientFiles()) {
      const ast = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
      function check(key: string, values: ts.Expression | undefined, node: ts.Node) {
        const message = en[key as TranslationKey];
        const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
        if (!message) {
          problems.push(`${path}:${line}: unknown key ${key}`);
          return;
        }
        const names = ts.isObjectLiteralExpression(values ?? ast)
          ? new Set((values as ts.ObjectLiteralExpression).properties.map((property) => property.name?.getText(ast)))
          : new Set<string>();
        for (const name of placeholders(message)) {
          if (!names.has(name)) problems.push(`${path}:${line}: ${key} missing ${name}`);
        }
      }
      function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t") {
          const key = node.arguments[0];
          if (key && ts.isStringLiteral(key)) check(key.text, node.arguments[1], node);
        }
        if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "Trans") {
          const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
          const key = attributes.find((attribute) => attribute.name.getText(ast) === "message")?.initializer;
          const values = attributes.find((attribute) => attribute.name.getText(ast) === "values")?.initializer;
          if (key && ts.isStringLiteral(key)) check(key.text, values && ts.isJsxExpression(values) ? values.expression : undefined, node);
        }
        ts.forEachChild(node, visit);
      }
      visit(ast);
    }
    expect(problems).toEqual([]);
  });

  test("UI text and accessible labels are not hardcoded outside language files", () => {
    const problems: string[] = [];
    const visibleAttributes = new Set(["title", "label", "intro", "hint", "placeholder", "aria-label", "ariaLabel", "alt"]);
    for (const path of clientFiles()) {
      const ast = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
      function visit(node: ts.Node) {
        const rawText = ts.isJsxText(node) && /[a-zA-Z]/.test(node.text);
        const rawAttribute = ts.isJsxAttribute(node) && visibleAttributes.has(node.name.getText(ast))
          && node.initializer && ts.isStringLiteral(node.initializer) && node.initializer.text.trim();
        let attribute: ts.JsxAttribute | undefined;
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (ts.isJsxAttribute(parent)) { attribute = parent; break; }
        }
        const technicalAttribute = attribute && !visibleAttributes.has(attribute.name.getText(ast));
        const rawMessage = ts.isStringLiteral(node) && !technicalAttribute
          && /[a-z]{2} [a-z]{2}|^[A-Z][a-z]+.*\s/.test(node.text)
          && !/^(https?:|\/)/.test(node.text);
        if (rawText || rawAttribute || rawMessage) {
          const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
          problems.push(`${path}:${line}: ${node.getText(ast).trim()}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(ast);
    }
    expect(problems).toEqual([]);
  });
});
