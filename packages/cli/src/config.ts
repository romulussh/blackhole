import fs from "fs";
import path from "path";
import { homedir } from "os";

const CONFIG_DIR = path.join(homedir(), ".blackhole");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export interface Config {
  /** Public domain for tunnel URLs. Tunnels are reachable at https://{endpoint}.{tunnelDomain} */
  tunnelDomain?: string;
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
