import fs from "fs";
import path from "path";
import { homedir } from "os";

const CONFIG_DIR = path.join(homedir(), ".blackhole");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export interface Config {
  /** Primary server domain (e.g. me.bhole.sh). Used for WebSocket URL and tunnel URLs. */
  domain?: string;
  /** All domains that point at this server (add DNS + Fly certs for each). Primary = first. */
  domains?: string[];
  /** @deprecated Use domain. Kept for migration. */
  tunnelDomain?: string;
  /** @deprecated Use domain. Kept for migration. */
  serverUrl?: string;
  /** Optional shared secret for server auth (if BHOLE_AUTH_TOKEN not set) */
  authToken?: string;
  /** Saved static subdomains. Use: bhole http <port> --domain <subdomain> */
  endpoints?: string[];
  /** Fly.io app name (e.g. my-tunnel) for cert status and DNS target <app>.fly.dev */
  fly_app?: string;
}

export function getDomains(config: Config): string[] {
  const fromList = config.domains?.filter((d) => d?.trim()).map((d) => d.trim()) ?? [];
  if (fromList.length > 0) return fromList;
  const single = config.domain ?? config.tunnelDomain ?? config.serverUrl?.replace(/^wss?:\/\//, "").split("/")[0];
  return single?.trim() ? [single.trim()] : [];
}

export function getServerUrl(config: Config): string | undefined {
  const d = getDomains(config)[0];
  return d ? (d.startsWith("ws") ? d : `wss://${d}`) : undefined;
}

export function getTunnelDomain(config: Config): string | undefined {
  return getDomains(config)[0];
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function loadConfig(): Config {
  try {
    const data = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(data) as Config;
  } catch {
    return {};
  }
}

export function saveConfig(config: Config): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    try {
      fs.chmodSync(CONFIG_DIR, 0o700);
      fs.chmodSync(CONFIG_FILE, 0o600);
    } catch {
      // chmod may no-op on some platforms (e.g. Windows); ignore
    }
  } catch (err) {
    throw new Error(`Failed to save config: ${err}`);
  }
}
