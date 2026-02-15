import net from "net";
import { Command } from "commander";
import { loadConfig, getServerUrl, getTunnelDomain } from "../config.js";
import { runTunnelPlain } from "../lib/tunnelPlain.js";
import { randomMnemonicId } from "../lib/words.js";


function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 500);
    socket.on("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

async function runTunnel(
  serverUrl: string,
  endpoint: string,
  localPort: number,
  publicUrl: string,
  tunnelDomain?: string,
  authToken?: string
) {
  if (process.stdin.isTTY) {
    const { render } = await import("ink");
    const { TunnelApp } = await import("../ui/TunnelApp.js");

    const { waitUntilExit } = render(
      <TunnelApp
        serverUrl={serverUrl}
        endpoint={endpoint}
        localPort={localPort}
        publicUrl={publicUrl}
        tunnelDomain={tunnelDomain}
        authToken={authToken}
        onExit={(code) => process.exit(code)}
      />
    );

    await waitUntilExit();
  } else {
    await runTunnelPlain(serverUrl, endpoint, localPort, publicUrl, authToken);
  }
}

export const httpCommand = new Command("http")
  .description("Expose a local HTTP server to the internet")
  .argument("<port>", "Local port to expose")
  .option("-s, --server <url>", "Tunnel server URL (overrides config set-server)")
  .option("-d, --domain <domain>", "Static subdomain (e.g. --domain=myapp)")
  .option("--subdomain <name>", "Custom subdomain (alias for --domain)")
  .action(async (portStr: string, options: { server?: string; domain?: string; subdomain?: string }) => {
    const port = parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error("Error: port must be a valid number between 1 and 65535");
      process.exit(1);
    }

    const config = loadConfig();
    const domain = getTunnelDomain(config) ?? process.env.BHOLE_TUNNEL_DOMAIN;
    let serverUrl =
      options.server ||
      process.env.BHOLE_SERVER_URL ||
      getServerUrl(config) ||
      "ws://localhost:8080";
    serverUrl = serverUrl.replace(/^http/, "ws");
    if (!serverUrl.startsWith("ws")) serverUrl = "ws://" + serverUrl;

    if (!domain && !serverUrl.includes("localhost")) {
      console.error("Error: Run 'bhole config set-server <domain>' (e.g. me.bhole.sh)");
      process.exit(1);
    }
    const effectiveDomain = domain ?? "localhost";

    const domainOrSub = options.domain ?? options.subdomain;
    let endpoint: string;
    let publicUrl: string;
    if (domainOrSub) {
      let hostname = domainOrSub.trim();
      if (hostname.startsWith("http://") || hostname.startsWith("https://")) {
        try {
          hostname = new URL(hostname).hostname;
        } catch {
          hostname = domainOrSub;
        }
      }
      if (hostname.includes(".")) {
        endpoint = hostname.split(".")[0] ?? hostname;
        publicUrl = domainOrSub.startsWith("http") ? domainOrSub : `https://${hostname}`;
      } else {
        endpoint = hostname;
        publicUrl = `https://${endpoint}.${effectiveDomain}`;
      }
      if (!endpoint || endpoint.length > 63) {
        console.error("Error: endpoint must be 1–63 characters");
        process.exit(1);
      }
    } else {
      endpoint = randomMnemonicId();
      publicUrl = `https://${endpoint}.${effectiveDomain}`;
    }

    const portOk = await isPortListening(port);
    if (!portOk) {
      console.warn(`Note: Nothing appears to be listening on localhost:${port}. Requests will return 502 until your server is running.`);
    }

    const authToken = config.authToken ?? process.env.BHOLE_AUTH_TOKEN;
    await runTunnel(serverUrl, endpoint, port, publicUrl, effectiveDomain, authToken);
  });
