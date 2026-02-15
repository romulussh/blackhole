import React, { useState, useEffect, useRef, useCallback } from "react";

interface TrafficEvent {
  id: string;
  method: string;
  path: string;
  bytesIn: number;
  bytesOut: number;
  statusCode?: number;
  statusText?: string;
  endpoint: string;
  timestamp: string;
  clientIP?: string;
  host?: string;
  durationMs?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  requestBodyTruncated?: boolean;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseBodyTruncated?: boolean;
}

function fmtSize(n: number): string {
  if (n < 1024) return n + "B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + "KB";
  return (n / (1024 * 1024)).toFixed(1) + "MB";
}

function fmtBody(body: string | undefined, ct: string): string {
  if (!body) return "";
  if (ct && ct.includes("json")) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

function HeadersTable({ headers }: { headers?: Record<string, string> }) {
  if (!headers || !Object.keys(headers).length) {
    return <span className="empty">(none)</span>;
  }
  return (
    <table>
      <tbody>
        {Object.entries(headers).map(([k, v]) => (
          <tr key={k}>
            <th>{k}</th>
            <td>{String(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Traffic() {
  const [traffic, setTraffic] = useState<TrafficEvent[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<"req" | "res">("req");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    fetch("/api/traffic")
      .then((r) => r.json())
      .then((evs: TrafficEvent[]) => setTraffic(evs))
      .catch(() => {});

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/ws/traffic`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "init") {
        setTraffic(msg.events || []);
        return;
      }
      setTraffic((prev) => {
        const next = [msg, ...prev];
        if (next.length > 200) next.pop();
        return next;
      });
    };

    ws.onerror = ws.onclose = () => {
      reconnectRef.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  const selected = traffic.find((e) => e.id === openId);
  const reqCt = selected?.requestHeaders?.["content-type"] || "";
  const resCt = selected?.responseHeaders?.["content-type"] || "";

  return (
    <div className="traffic-page-wrap">
      <h2>Traffic Inspector</h2>
      <p className="hint" style={{ marginBottom: "1rem" }}>
        Live requests through your tunnels. Click a request to inspect.
      </p>
      {traffic.length === 0 ? (
        <p className="traffic-empty">No traffic yet.</p>
      ) : (
        <div className="traffic-split">
          <div className="traffic-list">
            <div className="traffic-table-wrapper">
            <table className="traffic-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>IP</th>
                  <th>Endpoint</th>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Host</th>
                </tr>
              </thead>
              <tbody>
                {traffic.slice(0, 100).map((e) => {
                  const isSelected = openId === e.id;
                  const sc = e.statusCode ?? "-";
                  const scClass =
                    sc === "-"
                      ? ""
                      : Number(sc) >= 500
                        ? "traffic-status-5"
                        : Number(sc) >= 400
                          ? "traffic-status-4"
                          : Number(sc) >= 300
                            ? "traffic-status-3"
                            : "traffic-status-2";
                  const time = new Date(e.timestamp).toLocaleString("en-US", {
                    hour12: false,
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const duration = e.durationMs != null ? `${e.durationMs}ms` : "-";

                  return (
                    <tr
                      key={e.id}
                      className={`traffic-row ${isSelected ? "selected" : ""}`}
                      onClick={() => setOpenId(isSelected ? null : e.id)}
                    >
                      <td>{time}</td>
                      <td>{e.clientIP ?? "-"}</td>
                      <td>{e.endpoint ?? "-"}</td>
                      <td className="traffic-method">{e.method}</td>
                      <td className="traffic-path" title={e.path}>{e.path}</td>
                      <td className={scClass}>
                        {sc}
                        {e.statusText ? ` ${e.statusText}` : ""}
                      </td>
                      <td>{duration}</td>
                      <td>{e.host ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
          <div className="traffic-detail-panel">
            {selected ? (
              <div className="traffic-detail" onClick={(ev) => ev.stopPropagation()}>
                <div className="traffic-detail-meta" style={{ marginBottom: "1rem", fontSize: "0.8rem", color: "#a3a3a3" }}>
                  Endpoint: <strong style={{ color: "#e5e5e5" }}>{selected.endpoint}</strong>
                </div>
                <div className="traffic-detail-tabs">
                  <button
                    className={`traffic-detail-tab ${tab === "req" ? "active" : ""}`}
                    onClick={() => setTab("req")}
                  >
                    Request
                  </button>
                  <button
                    className={`traffic-detail-tab ${tab === "res" ? "active" : ""}`}
                    onClick={() => setTab("res")}
                  >
                    Response
                  </button>
                </div>
                {tab === "req" && (
                  <div>
                    <h4>Request Headers</h4>
                    <div className="traffic-detail-headers">
                      <HeadersTable headers={selected.requestHeaders} />
                    </div>
                    <h4>Request Body</h4>
                    <pre
                      className={`traffic-detail-body ${!selected.requestBody ? "empty" : ""}`}
                    >
                      {fmtBody(selected.requestBody, reqCt) || "(empty)"}
                    </pre>
                    {selected.requestBodyTruncated && (
                      <div className="traffic-detail-truncated">Truncated (32KB max)</div>
                    )}
                  </div>
                )}
                {tab === "res" && (
                  <div>
                    <h4>Response Headers</h4>
                    <div className="traffic-detail-headers">
                      <HeadersTable headers={selected.responseHeaders} />
                    </div>
                    <h4>Response Body</h4>
                    <pre
                      className={`traffic-detail-body ${!selected.responseBody ? "empty" : ""}`}
                    >
                      {fmtBody(selected.responseBody, resCt) || "(empty)"}
                    </pre>
                    {selected.responseBodyTruncated && (
                      <div className="traffic-detail-truncated">Truncated (32KB max)</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="traffic-detail-empty">
                Select a request to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
