/** Push a traffic event to the local dashboard (if running). Fire-and-forget. */
export function pushTrafficEvent(event: {
  method: string;
  path: string;
  bytesIn: number;
  bytesOut: number;
  statusCode?: number;
  statusText?: string;
  endpoint: string;
  timestamp: Date;
  clientIP?: string;
  host?: string;
  durationMs?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  requestBodyTruncated?: boolean;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseBodyTruncated?: boolean;
}): void {
  const payload = JSON.stringify({
    ...event,
    timestamp: event.timestamp.toISOString(),
  });
  fetch("http://127.0.0.1:3847/api/traffic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  }).catch(() => {
    // Dashboard not running – ignore
  });
}
