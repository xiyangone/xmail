"use client";

import { useCallback, useEffect, useState } from "react";

export async function readJsonError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

interface UseAdminResourceOptions<TData> {
  load: () => Promise<Response>;
  failureMessage: string;
  enabled?: boolean;
  parse?: (response: Response) => Promise<TData>;
}

export function useAdminResource<TData>({
  load,
  failureMessage,
  enabled = true,
  parse = (response) => response.json() as Promise<TData>,
}: UseAdminResourceOptions<TData>) {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    try {
      const response = await load();
      if (!response.ok) throw new Error(await readJsonError(response));
      setData(await parse(response));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : failureMessage);
    } finally {
      setLoading(false);
    }
  }, [enabled, failureMessage, load, parse]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
