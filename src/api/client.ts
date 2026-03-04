import {
  AVALANCHE_API_BASE_URL,
  DEFAULT_FETCH_TIMEOUT_MS,
} from "../constants.js";

type BuildUrlOptions = {
  path: string;
  day?: string;
};

export function buildUrl({ path, day }: BuildUrlOptions): URL {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, AVALANCHE_API_BASE_URL);

  if (day) {
    url.searchParams.set("day", day);
  }

  return url;
}

export async function fetchJson<T>(
  url: URL | string,
  options?: { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  timeout.unref?.();

  const requestUrl = String(url);

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const bodyText = await response.text();

    if (!response.ok) {
      const snippet = bodyText.slice(0, 300);
      throw new Error(
        `Avalanche.org request failed (${response.status}) for ${requestUrl}: ${snippet}`,
      );
    }

    try {
      return JSON.parse(bodyText) as T;
    } catch (error) {
      throw new Error(
        `Avalanche.org returned invalid JSON for ${requestUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Avalanche.org request timed out after ${timeoutMs}ms: ${requestUrl}`);
    }

    if (error instanceof Error) throw error;
    throw new Error(`Avalanche.org request failed for ${requestUrl}: ${String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}
