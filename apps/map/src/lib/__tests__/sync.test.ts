import { describe, expect, it } from "vitest";

import {
  applyOutbox,
  deserializeOutbox,
  serializeOutbox,
  type Outbox,
  type PendingChange,
} from "../sync";

describe("outbox overlay", () => {
  const serverLog = new Map<string, string | null>([
    ["Bragança", "2024-09-15"],
    ["Chaves", null],
  ]);

  it("marks, unmarks and re-dates over the server log", () => {
    const outbox: Outbox = new Map<string, PendingChange>([
      ["Chaves", "unmark"],
      ["Miranda do Douro", { visitedOn: null }],
      ["Bragança", { visitedOn: "2025-01-01" }],
    ]);
    expect(applyOutbox(serverLog, outbox)).toEqual(
      new Map([
        ["Bragança", "2025-01-01"],
        ["Miranda do Douro", null],
      ]),
    );
  });

  it("leaves the log untouched when the outbox is empty", () => {
    expect(applyOutbox(serverLog, new Map())).toEqual(serverLog);
  });

  it("coalesces to the last action per place via Map.set", () => {
    const outbox = new Map<string, PendingChange>();
    outbox.set("Évora", { visitedOn: null });
    outbox.set("Évora", { visitedOn: "2025-05-01" });
    outbox.set("Évora", "unmark");
    expect(outbox.size).toBe(1);
    expect(applyOutbox(serverLog, outbox).has("Évora")).toBe(false);
  });
});

describe("outbox persistence", () => {
  it("roundtrips marks, dates and unmarks", () => {
    const outbox: Outbox = new Map<string, PendingChange>([
      ["Bragança", { visitedOn: "2024-09-15" }],
      ["Chaves", { visitedOn: null }],
      ["Évora", "unmark"],
    ]);
    expect(deserializeOutbox(serializeOutbox(outbox))).toEqual(outbox);
  });

  it("returns null for corrupt or unknown payloads", () => {
    expect(deserializeOutbox("{broken")).toBeNull();
    expect(deserializeOutbox('{"v":99,"changes":{}}')).toBeNull();
  });
});
