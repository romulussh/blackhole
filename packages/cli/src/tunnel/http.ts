import http from "http";
import WebSocket from "ws";

export interface HttpTunnelOptions {
  serverUrl: string;
  endpoint: string;
  localPort: number;
  /** Shared secret for auth (from BHOLE_AUTH_TOKEN) */
  authToken?: string;
}

export interface TunnelRequestInfo {
  method: string;
  path: string;
  bytesIn: number;
  bytesOut: number;
  statusCode?: number;
  timestamp: Date;
}

export interface HttpTunnelCallbacks {
  onOpen?: () => void;
  onReady?: () => void;
  onRequest?: (info: TunnelRequestInfo) => void;
  onError?: (err: Error) => void;
}

const REGISTER_TIMEOUT_MS = 15000;
const LOCAL_FORWARD_TIMEOUT_MS = 30000;
const CONNECT_TIMEOUT_MS = 10000;
const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_RESPONSE_BODY_BYTES = 10 * 1024 * 1024; // 10MB

export function createHttpTunnel(
  options: HttpTunnelOptions,
  callbacks?: HttpTunnelCallbacks
): Promise<void> {
  return new Promise((resolve, reject) => {
    let rejected = false;
    const doReject = (err: Error) => {
      if (rejected) return;
      rejected = true;
      callbacks?.onError?.(err);
      reject(err);
    };

    const ws = new WebSocket(options.serverUrl + "/tunnel");
    let registerTimeout: ReturnType<typeof setTimeout> | null = null;
    let connectTimeout: ReturnType<typeof setTimeout> | null = null;
    let ready = false;

    const clearRegisterTimeout = () => {
      if (registerTimeout) {
        clearTimeout(registerTimeout);
        registerTimeout = null;
      }
    };

    const safeSend = (data: Buffer | string, opts?: { binary?: boolean }) => {
      if (ws.readyState === 1) {
        try {
          if (opts) ws.send(data, opts);
          else ws.send(data);
        } catch (err) {
          if (!rejected) doReject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    connectTimeout = setTimeout(() => {
      if (ready || rejected) return;
      connectTimeout = null;
      ws.terminate();
      doReject(new Error("Connection timed out – server unreachable."));
    }, CONNECT_TIMEOUT_MS);

    ws.on("open", () => {
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      callbacks?.onOpen?.();
      const msg: Record<string, string> = { type: "register", endpoint: options.endpoint };
      if (options.authToken) msg.authToken = options.authToken;
      safeSend(JSON.stringify(msg));
      registerTimeout = setTimeout(() => {
        if (!ready) {
          clearRegisterTimeout();
          const err = new Error("Registration timed out – server may be busy. Try again.");
          doReject(err);
          ws.close();
        }
      }, REGISTER_TIMEOUT_MS);
    });

    ws.on("message", (data: Buffer | string) => {
      const str = data.toString();
      if (str.startsWith("{")) {
        try {
          const msg = JSON.parse(str);
          if (msg.error) {
            ready = true;
            clearRegisterTimeout();
            const err = new Error(msg.error || "Server error");
            doReject(err);
            ws.close();
            return;
          }
          if (msg.ok) {
            ready = true;
            clearRegisterTimeout();
            callbacks?.onReady?.();
          }
          return;
        } catch {
          // Not JSON, treat as binary (request from server)
        }
      }

      if (Buffer.isBuffer(data) || typeof data !== "string") {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        if (buf.length > MAX_REQUEST_BODY_BYTES) {
          const errResp = `HTTP/1.1 413 Payload Too Large\r\nContent-Type: text/plain\r\n\r\nRequest body exceeds ${MAX_REQUEST_BODY_BYTES / (1024 * 1024)}MB limit`;
          safeSend(Buffer.from(errResp));
          return;
        }
        const req = parseHttpRequest(buf);
        if (!req) {
          const errResp = "HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\n\r\nFailed to parse request";
          safeSend(Buffer.from(errResp));
          return;
        }
        forwardToLocal(buf, options.localPort)
          .then((response) => {
            const info = parseResponseStatus(response);
            callbacks?.onRequest?.({
              method: req.method,
              path: req.path,
              bytesIn: buf.length,
              bytesOut: response.length,
              statusCode: info?.statusCode,
              timestamp: new Date(),
            });
            safeSend(response, { binary: true });
          })
          .catch((err: Error) => {
            callbacks?.onRequest?.({
              method: req.method,
              path: req.path,
              bytesIn: buf.length,
              bytesOut: 0,
              timestamp: new Date(),
            });
            const errResp = `HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\n\r\n${err.message}`;
            safeSend(Buffer.from(errResp));
          });
      }
    });

    ws.on("error", (err) => {
      clearRegisterTimeout();
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      const msg = err.message || String(err) || "Connection failed";
      doReject(new Error(msg));
    });

    ws.on("close", () => {
      clearRegisterTimeout();
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      if (ready && !rejected) {
        doReject(new Error("Connection closed"));
      }
    });
  });
}

async function forwardToLocal(
  rawRequest: Buffer,
  localPort: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = parseHttpRequest(rawRequest);
    if (!req) {
      reject(new Error("Failed to parse request"));
      return;
    }

    const opts = {
      hostname: "localhost",
      port: localPort,
      path: req.path,
      method: req.method,
      headers: req.headers,
    };

    const timeout = setTimeout(() => {
      proxyReq.destroy(new Error("Local server did not respond in time"));
    }, LOCAL_FORWARD_TIMEOUT_MS);

    const proxyReq = http.request(opts, (res: http.IncomingMessage) => {
      clearTimeout(timeout);
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      let responseExceeded = false;
      const exceededResponse = () =>
        Buffer.from(
          `HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\n\r\nResponse body exceeds ${MAX_RESPONSE_BODY_BYTES / (1024 * 1024)}MB limit`
        );
      const finish = (buf: Buffer) => {
        clearTimeout(timeout);
        resolve(buf);
      };
      res.on("data", (chunk: Buffer) => {
        if (responseExceeded) return;
        if (totalBytes + chunk.length <= MAX_RESPONSE_BODY_BYTES) {
          chunks.push(chunk);
          totalBytes += chunk.length;
        } else {
          responseExceeded = true;
          res.destroy();
          finish(exceededResponse());
        }
      });
      res.on("end", () => {
        if (responseExceeded) return;
        const statusLine = `HTTP/1.1 ${res.statusCode} ${res.statusMessage}\r\n`;
        const headers = Object.entries(res.headers)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}\r\n`)
          .join("");
        const body = Buffer.concat(chunks);
        finish(Buffer.concat([Buffer.from(statusLine + headers + "\r\n"), body]));
      });
      res.on("error", (err) => {
        if (!responseExceeded) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });

    proxyReq.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    proxyReq.end(req.body);
  });
}

interface ParsedRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Buffer;
}

function parseRequestMethod(buf: Buffer): string {
  const firstLine = buf.subarray(0, buf.indexOf("\n")).toString();
  return firstLine.split(" ")[0] ?? "?";
}

function parseRequestPath(buf: Buffer): string {
  const firstLine = buf.subarray(0, buf.indexOf("\n")).toString();
  const path = firstLine.split(" ")[1];
  return path ?? "/";
}

function parseResponseStatus(buf: Buffer): { statusCode: number } | null {
  const firstLine = buf.subarray(0, buf.indexOf("\n")).toString();
  const parts = firstLine.split(" ");
  const code = parseInt(parts[1] ?? "0", 10);
  return isNaN(code) ? null : { statusCode: code };
}

function parseHttpRequest(buf: Buffer): ParsedRequest | null {
  const idx = buf.indexOf("\r\n\r\n");
  const idxLf = buf.indexOf("\n\n");
  const sepIdx = idx >= 0 ? idx : idxLf >= 0 ? idxLf : -1;
  const sepLen = idx >= 0 ? 4 : idxLf >= 0 ? 2 : 0;
  if (sepIdx === -1) return null;

  const headerSection = buf.subarray(0, sepIdx).toString();
  const body = buf.subarray(sepIdx + sepLen);
  const lineSep = idx >= 0 ? "\r\n" : "\n";
  const lines = headerSection.split(lineSep);
  const firstLine = lines[0];
  if (!firstLine) return null;
  const parts = firstLine.split(" ");
  const method = parts[0] ?? "GET";
  const path = parts[1] ?? "/";
  const headers: Record<string, string> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    headers[key] = value;
  }

  return {
    method,
    path,
    headers,
    body,
  };
}
