"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Load `fetcher` now and every `ms` after. Works the same against the mock or a
 * real REST backend. Returns [data, refresh, setData] (undefined = loading).
 */
export function usePoll<T>(fetcher: () => Promise<T>, ms = 1500, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const refresh = useCallback(async () => {
    const v = await fetchRef.current();
    setData(v);
    return v;
  }, []);

  useEffect(() => {
    let live = true;
    const tick = async () => {
      const v = await fetchRef.current();
      if (live) setData(v);
    };
    void tick();
    const i = setInterval(tick, ms);
    return () => {
      live = false;
      clearInterval(i);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);

  return [data, refresh, setData] as const;
}
