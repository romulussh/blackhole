import { createHttpTunnel } from "../tunnel/http.js";
import { pushTrafficEvent } from "./dashboardTraffic.js";

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 2000;

export async function runTunnelPlain(
  serverUrl: string,
  endpoint: string,
  localPort: number,
  publicUrl: string,
  authToken?: string
): Promise<void> {
  const wsUrl = serverUrl.replace(/^http/, "ws");

  console.log(`Connecting to ${wsUrl}...`);
  console.log(`Exposing localhost:${localPort} at ${publicUrl}`);

  const tryConnect = (attempt: number): Promise<void> =>
    new Promise((resolve, reject) => {
      createHttpTunnel(
        { serverUrl: wsUrl, endpoint, localPort, authToken },
        {
          onReady: () => {
            console.log("Tunnel established. Forwarding traffic to localhost:" + localPort);
            console.log(`URL: ${publicUrl}`);
            console.log(`(or use X-Blackhole-Endpoint: ${endpoint})`);
            resolve();
          },
          onRequest: (info) => {
            pushTrafficEvent({ ...info, endpoint });
          },
          onError: (err) => {
            console.error("Tunnel error:", err.message);
          },
        }
      ).catch((err) => {
        if (attempt < MAX_RETRIES) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
          console.error(`Connection failed. Retrying in ${delayMs / 1000}s...`);
          setTimeout(() => tryConnect(attempt + 1).then(resolve, reject), delayMs);
        } else {
          reject(err);
        }
      });
    });

  tryConnect(0).catch(() => process.exit(1));
}
