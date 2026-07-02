import { describe, expect, it } from "vitest";

import { formatPages, stripDraftMarkers } from "../format";

describe("formatPages", () => {
  it("collapses consecutive pages into ranges", () => {
    expect(formatPages([89, 90, 91, 93, 100])).toBe("89–91, 93, 100");
  });

  it("leaves isolated pages alone", () => {
    expect(formatPages([12])).toBe("12");
    expect(formatPages([12, 40])).toBe("12, 40");
  });

  it("handles a pair as a range", () => {
    expect(formatPages([66, 67, 139])).toBe("66–67, 139");
  });

  it("returns an empty string for no pages", () => {
    expect(formatPages([])).toBe("");
  });
});

describe("stripDraftMarkers", () => {
  it("removes a ⟨placeholder⟩ and its dangling separator", () => {
    expect(stripDraftMarkers("Viagem a Portugal II — ⟨título a confirmar⟩")).toBe(
      "Viagem a Portugal II",
    );
  });

  it("removes inline markers", () => {
    expect(stripDraftMarkers("Nota ⟨a escrever⟩ final")).toBe("Nota final");
  });

  it("leaves clean titles untouched", () => {
    expect(stripDraftMarkers("Viagem a Portugal I — Trás-os-Montes")).toBe(
      "Viagem a Portugal I — Trás-os-Montes",
    );
  });
});
