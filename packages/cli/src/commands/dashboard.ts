import { Command } from "commander";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { WebSocketServer } from "ws";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { loadConfig, saveConfig, getTunnelDomain, getDomains } from "../config.js";
import open from "open";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = path.join(__dirname, "..", "dashboard");

const PORT = 3847;
const MAX_TRAFFIC_EVENTS = 200;

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

const trafficEvents: TrafficEvent[] = [];
let trafficIdCounter = 0;

function serveDashboard(pathname: string, res: ServerResponse): boolean {
  if (!existsSync(DASHBOARD_DIR)) return false;
  let filePath: string;
  if (pathname === "/" || pathname === "/index.html" || pathname === "") {
    filePath = path.join(DASHBOARD_DIR, "index.html");
  } else if (pathname.startsWith("/assets/")) {
    filePath = path.join(DASHBOARD_DIR, pathname.slice(1));
  } else {
    return false;
  }
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(DASHBOARD_DIR))) return false;
  if (!existsSync(resolved)) return false;
  try {
    const data = readFileSync(resolved);
    const ext = path.extname(resolved);
    const types: Record<string, string> = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".ico": "image/x-icon",
    };
    res.writeHead(200, { "Content-Type": types[ext] ?? "application/octet-stream" });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

const HTML_FALLBACK = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Blackhole</title></head><body style="font-family:system-ui;background:#0a0a0a;color:#e5e5e5;padding:2rem;max-width:640px;margin:0 auto">
  <h1>Blackhole</h1>
  <p>Dashboard not built. Run <code>pnpm run build:dashboard</code> in the CLI package.</p>
</body></html>`;



const trafficClients = new Set<import("ws").WebSocket>();

function broadcastTraffic(event: TrafficEvent): void {
  const msg = JSON.stringify(event);
  for (const ws of trafficClients) {
    if (ws.readyState === 1) {
      try {
        ws.send(msg);
      } catch {
        trafficClients.delete(ws);
      }
    }
  }
}

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export const dashboardCommand = new Command("dashboard")
  .description("Open a local dashboard to view and edit config")
  .action(async () => {
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = req.url ?? "/";
      const method = req.method ?? "GET";

      res.setHeader("Access-Control-Allow-Origin", "*");
      if (method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const pathname = (url ?? "/").split("?")[0] || "/";

      if (pathname.startsWith("/api/")) {
        if (pathname === "/api/config" && method === "GET") {
          const config = loadConfig();
          const domains = getDomains(config);
          const display = {
            domain: getTunnelDomain(config) ?? "",
            domains: domains,
            authToken: config.authToken ?? "",
            endpoints: config.endpoints ?? [],
            fly_app: config.fly_app ?? "",
          };
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(display));
          return;
        }
        if (pathname === "/api/fly/certificates" && method === "GET") {
          const config = loadConfig();
          const app = config.fly_app?.trim();
          if (!app) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ fly_app: "", certs: [], error: "Set Fly app name in Domains to check certificates." }));
            return;
          }
          try {
            const out = execSync(`fly certs list -a ${JSON.stringify(app)} -j`, {
              encoding: "utf8",
              timeout: 15000,
              stdio: ["ignore", "pipe", "pipe"],
            });
            const raw = JSON.parse(out) as unknown;
            const certs = Array.isArray(raw) ? raw : (raw && typeof raw === "object" && Array.isArray((raw as { certs?: unknown }).certs) ? (raw as { certs: unknown[] }).certs : []);
            const list = certs.map((c: Record<string, unknown>) => {
              const hostname = typeof c.hostname === "string" ? c.hostname : "";
              const cert = c.certificate && typeof c.certificate === "object" ? (c.certificate as Record<string, unknown>) : undefined;
              return {
                hostname,
                issuer: cert?.issuer,
                dns_configured: c.dns_configured ?? c.dnsConfigured,
              };
            }).filter((x) => x.hostname);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ fly_app: app, certs: list }));
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to run fly certs list";
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ fly_app: app, certs: [], error: msg }));
          }
          return;
        }
        if (pathname === "/api/traffic" && method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify([...trafficEvents]));
          return;
        }
        if (pathname === "/api/traffic" && method === "POST") {
        parseBody(req)
          .then((body) => {
            const ev = JSON.parse(body) as Record<string, unknown>;
            const e: TrafficEvent = {
              id: String(++trafficIdCounter),
              method: String(ev.method ?? "?"),
              path: String(ev.path ?? "/"),
              bytesIn: Number(ev.bytesIn) || 0,
              bytesOut: Number(ev.bytesOut) || 0,
              statusCode: ev.statusCode != null ? Number(ev.statusCode) : undefined,
              statusText: ev.statusText != null ? String(ev.statusText) : undefined,
              endpoint: String(ev.endpoint ?? "?"),
              timestamp: String(ev.timestamp ?? new Date().toISOString()),
              clientIP: ev.clientIP != null ? String(ev.clientIP) : undefined,
              host: ev.host != null ? String(ev.host) : undefined,
              durationMs: ev.durationMs != null ? Number(ev.durationMs) : undefined,
              requestHeaders: ev.requestHeaders && typeof ev.requestHeaders === "object" ? (ev.requestHeaders as Record<string, string>) : undefined,
              requestBody: ev.requestBody != null ? String(ev.requestBody) : undefined,
              requestBodyTruncated: Boolean(ev.requestBodyTruncated),
              responseHeaders: ev.responseHeaders && typeof ev.responseHeaders === "object" ? (ev.responseHeaders as Record<string, string>) : undefined,
              responseBody: ev.responseBody != null ? String(ev.responseBody) : undefined,
              responseBodyTruncated: Boolean(ev.responseBodyTruncated),
            };
            trafficEvents.unshift(e);
            if (trafficEvents.length > MAX_TRAFFIC_EVENTS) trafficEvents.pop();
            broadcastTraffic(e);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
          })
          .catch(() => {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("Bad request");
          });
          return;
        }
        if (pathname === "/api/config" && method === "PUT") {
          try {
            const body = await parseBody(req);
            const data = JSON.parse(body) as {
              domain?: string;
              domains?: string[];
              authToken?: string;
              fly_app?: string;
              endpoints?: { subdomain: string; port: number }[];
            };
            const config = loadConfig();
            if (typeof data.fly_app === "string") config.fly_app = data.fly_app.trim() || undefined;
            if (Array.isArray(data.domains)) {
              config.domains = data.domains
                .map((d) => (typeof d === "string" ? d : "").trim())
                .filter((d) => d.length > 0 && d.length <= 253);
              config.domain = config.domains[0];
            } else if (data.domain != null) {
              const d = data.domain.trim() || undefined;
              config.domain = d;
              if (d) {
                const existing = getDomains(config);
                if (!existing.includes(d)) config.domains = [d, ...existing.filter((x) => x !== d)];
                else config.domains = existing;
              }
            }
            if ("authToken" in data) config.authToken = data.authToken || undefined;
            if (Array.isArray(data.endpoints)) {
              config.endpoints = data.endpoints
                .map((e) => (typeof e === "string" ? e : (e as { subdomain?: string })?.subdomain))
                .filter((s): s is string => typeof s === "string" && s.trim().length > 0 && s.length <= 63);
            }
            saveConfig(config);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(config));
          } catch (err) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end(err instanceof Error ? err.message : "Bad request");
          }
          return;
        }
      }

      if (method === "GET") {
        if (serveDashboard(pathname, res)) return;
        if (pathname === "/" || pathname === "/index.html" || pathname === "") {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(HTML_FALLBACK);
          return;
        }
      }

      res.writeHead(404);
      res.end("Not found");
    });

    const wss = new WebSocketServer({ noServer: true });
    wss.on("connection", (ws) => {
      trafficClients.add(ws);
      ws.send(JSON.stringify({ type: "init", events: [...trafficEvents] }));
      ws.on("close", () => trafficClients.delete(ws));
    });

    server.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url ?? "", `http://${req.headers.host}`);
      if (url.pathname === "/ws/traffic") {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    server.listen(PORT, "127.0.0.1", () => {
      const url = `http://127.0.0.1:${PORT}`;
      console.log(`Dashboard: ${url}`);
      open(url);
    });
  });

