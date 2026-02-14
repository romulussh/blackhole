import { Command } from "commander";
import { loadConfig, saveConfig, getConfigDir } from "../config.js";

export const configCommand = new Command("config")
  .description("Manage CLI configuration")
  .addCommand(
    new Command("path")
      .description("Show config file path")
      .action(() => {
        console.log(getConfigDir());
      })
  )
  .addCommand(
    new Command("list")
      .description("Show current config (key hidden)")
      .action(() => {
        const config = loadConfig();
        console.log("Config location:", getConfigDir());
        console.log("Tunnel domain:", config.tunnelDomain ?? "(not set — use config set-tunnel-domain)");
      })
  )
  .addCommand(
    new Command("set-tunnel-domain")
      .description("Set the public domain for tunnel URLs (e.g. tunnel.yourdomain.com)")
      .argument("<domain>", "Domain for tunnels (e.g. bhole.link)")
      .action((domain: string) => {
        const trimmed = domain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
        if (!trimmed) {
          console.error("Invalid domain");
          process.exit(1);
        }
        const config = loadConfig();
        config.tunnelDomain = trimmed;
        saveConfig(config);
        console.log(`Tunnel domain set to ${trimmed}. Tunnels will be at https://{endpoint}.${trimmed}`);
      })
  );
