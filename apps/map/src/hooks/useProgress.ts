import { useEffect, useRef, useState } from "react";

import { towns } from "../lib/geo";
import {
  deserializeVisits,
  journeyMetrics,
  serializeVisits,
  type Visits,
} from "../lib/progress";
import { loadValue, saveValue } from "../lib/storage";

const STORAGE_KEY = "viagem-a-portugal/journey";

export function useProgress() {
  const [visits, setVisits] = useState<Visits>(new Map());
  const loaded = useRef(false);

  useEffect(() => {
    loadValue(STORAGE_KEY).then((raw) => {
      const stored = raw ? deserializeVisits(raw) : null;
      if (stored) setVisits(stored);
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    saveValue(STORAGE_KEY, serializeVisits(visits));
  }, [visits]);

  /**
   * Mark a town visited (date unknown until the user fills it in), or
   * unmark it if it already is.
   */
  const toggle = (name: string) =>
    setVisits((current) => {
      const next = new Map(current);
      if (next.has(name)) next.delete(name);
      else next.set(name, null);
      return next;
    });

  const setVisitDate = (name: string, date: string | null) =>
    setVisits((current) => {
      if (!current.has(name)) return current;
      const next = new Map(current);
      next.set(name, date);
      return next;
    });

  const visited = new Set(visits.keys());

  return {
    visits,
    visited,
    toggle,
    setVisitDate,
    metrics: journeyMetrics(visited, towns),
  };
}
