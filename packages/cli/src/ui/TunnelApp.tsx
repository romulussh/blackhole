import React, { useEffect, useState, useRef } from "react";
import { render, Text, Box, useInput } from "ink";
import Spinner from "ink-spinner";
import { createHttpTunnel, type TunnelRequestInfo } from "../tunnel/http.js";
import { pushTrafficEvent } from "../lib/dashboardTraffic.js";
import { getLatestVersion, shouldSuggestUpdate } from "../lib/version.js";


type TunnelStatus = "connecting" | "registering" | "ready" | "error";

interface TunnelAppProps {
  serverUrl: string;
  endpoint: string;
  localPort: number;
  publicUrl: string;
  tunnelDomain?: string;
  authToken?: string;
  onExit: (code: number) => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function regionDisplay(region: string): string {
  const names: Record<string, string> = {
    ord: "Chicago",
    iad: "Virginia",
    lax: "Los Angeles",
    gru: "São Paulo",
    arn: "Stockholm",
    local: "Local",
  };
  return names[region] ?? region;
}

export function TunnelApp({
  serverUrl,
  endpoint,
  localPort,
  publicUrl,
  tunnelDomain = "localhost",
  authToken,
  onExit,
}: TunnelAppProps) {
  const [status, setStatus] = useState<TunnelStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState(0);
  const [bytesIn, setBytesIn] = useState(0);
  const [bytesOut, setBytesOut] = useState(0);
  const [recentRequests, setRecentRequests] = useState<TunnelRequestInfo[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [serviceInfo, setServiceInfo] = useState<{ region: string; version: string } | null>(null);
  const [latency, setLatency] = useState<{ up: number; down: number } | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const tunnelStarted = useRef(false);
  const retriesUsed = useRef(0);
  const maxRetries = 2;
  const baseDelayMs = 2000;

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      onExit(0);
    }
  });

  useEffect(() => {
    if (tunnelStarted.current) return;
    tunnelStarted.current = true;

    const wsUrl = serverUrl.replace(/^http/, "ws");

    const tryConnect = () => {
      setStatus("connecting");
      setError(null);
      if (retriesUsed.current > 0) {
        setRetryCount(retriesUsed.current);
      }

    createHttpTunnel(
      { serverUrl: wsUrl, endpoint, localPort, authToken },
        {
          onOpen: () => setStatus("registering"),
          onReady: () => setStatus("ready"),
          onRequest: (info) => {
            setRequests((n) => n + 1);
            setBytesIn((b) => b + info.bytesIn);
            setBytesOut((b) => b + info.bytesOut);
            setRecentRequests((prev) => [info, ...prev.slice(0, 4)]);
            pushTrafficEvent({ ...info, endpoint });
          },
          onError: (err) => {
            setError(err.message);
            setStatus("error");
            if (retriesUsed.current < maxRetries) {
              const attempt = retriesUsed.current + 1;
              retriesUsed.current = attempt;
              const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
              setTimeout(() => tryConnect(), delayMs);
            }
          },
        }
      ).catch(() => {
        if (retriesUsed.current < maxRetries) {
          const attempt = retriesUsed.current + 1;
          retriesUsed.current = attempt;
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
          setTimeout(() => tryConnect(), delayMs);
        }
      });
    };

    tryConnect();
  }, [serverUrl, endpoint, localPort]);

  // Fetch account, service info, and measure latency when ready
  useEffect(() => {
    if (status !== "ready") return;

    const host = new URL(serverUrl.replace(/^ws/, "http")).host;
    const apiBase = serverUrl.includes("localhost")
      ? "http://localhost:8080"
      : `https://${host}`;

    const measureLatency = () => {
      const start = performance.now();
      fetch(`${apiBase}/api/health`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          const total = Math.round(performance.now() - start);
          setServiceInfo({ region: data.region ?? "?", version: data.version ?? "?" });
          setLatency({ up: Math.round(total / 2), down: Math.round(total / 2) });
        })
        .catch(() => {});
    };
    measureLatency();
    const latId = setInterval(measureLatency, 10000);

    getLatestVersion()
      .then((latest) => {
        if (shouldSuggestUpdate(latest)) setUpdateAvailable(latest!);
      })
      .catch(() => {});

    return () => clearInterval(latId);
  }, [status, serverUrl, tunnelDomain]);

  if (status === "connecting" || status === "registering") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />{" "}
            {status === "connecting" ? "Connecting" : "Registering tunnel"}...
            {retryCount > 0 ? (
              <Text color="dim"> (retry {retryCount}/{maxRetries})</Text>
            ) : null}
          </Text>
        </Box>
      </Box>
    );
  }

  if (status === "error") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="red">
            ✗ Tunnel error: {error}
          </Text>
        </Box>
        <Box>
          <Text color="dim">Press Ctrl+C to exit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text color="dim">Status: </Text>
        <Text bold color="green">
          Tunnel active
        </Text>
      </Box>
      {serviceInfo && (
        <Box>
          <Text color="dim">Region: </Text>
          <Text color="cyan">{regionDisplay(serviceInfo.region)}</Text>
        </Box>
      )}
      {latency && (
        <Box>
          <Text color="dim">Latency: </Text>
          <Text color="cyan">{latency.up}ms</Text>
          <Text color="dim"> ↑ </Text>
          <Text color="cyan">{latency.down}ms</Text>
          <Text color="dim"> ↓</Text>
        </Box>
      )}
      <Box>
        <Text color="dim">Forwarding: </Text>
        <Text color="cyan">{publicUrl}</Text>
        <Text color="dim"> → </Text>
        <Text color="green">localhost:{localPort}</Text>
      </Box>

      <Box>
        <Text color="dim">Usage: </Text>
        <Text color="cyan">↑{formatBytes(bytesIn)}</Text>
        <Text color="dim"> </Text>
        <Text color="cyan">↓{formatBytes(bytesOut)}</Text>
      </Box>
      {recentRequests.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text color="dim">Requests </Text>
            <Text color="cyan">{requests}</Text>
          </Box>
          {recentRequests.slice(0, 5).map((r, i) => (
            <Box key={i}>
              <Text color="dim">
                [{r.timestamp.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}]
              </Text>
              <Text color="dim"> </Text>
              <Text color="cyan">{r.method}</Text>
              <Text color="dim"> </Text>
              {r.statusCode != null && (
                <>
                  <Text color={r.statusCode >= 400 ? "red" : "green"}>{r.statusCode}</Text>
                  <Text color="dim"> </Text>
                </>
              )}
              <Text color="yellow">{r.path}</Text>
            </Box>
          ))}
        </Box>
      )}
      {updateAvailable && (
        <Box>
          <Text color="yellow">Update available: </Text>
          <Text color="cyan">{updateAvailable}</Text>
          <Text color="dim"> — npm i -g bhole</Text>
        </Box>
      )}
      <Box>
        <Text color="dim">Press Ctrl+C to stop</Text>
      </Box>
    </Box>
  );
}
