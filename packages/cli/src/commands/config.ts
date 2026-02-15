import { Command } from "commander";
import { loadConfig, saveConfig, getConfigDir, getTunnelDomain } from "../config.js";

function extractDomain(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  let host = trimmed;
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    host = new URL(trimmed).hostname;
  } else {
    host = (trimmed.replace(/^https?:\/\//, "").split("/")[0] ?? "").toLowerCase();
  }
  if (!host) throw new Error("Invalid domain");
  return host;
}

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
        console.log("Domain:", getTunnelDomain(config) ?? "(not set)");
        console.log("Auth token:", config.authToken ? "••••" : "(not set)");
      })
  )
  .addCommand(
    new Command("set-server")
      .description("Set your tunnel server domain (e.g. me.bhole.sh)")
      .argument("<domain>", "Domain of your Blackhole server")
      .action((input: string) => {
        const domain = extractDomain(input);
        const config = loadConfig();
        config.domain = domain;
        saveConfig(config);
        console.log(`Domain set to ${domain}. Use 'bhole http <port>' to tunnel.`);
      })
  )
  .addCommand(
    new Command("set-tunnel-domain")
      .description("Alias for set-server. Set your tunnel server domain.")
      .argument("<domain>", "Domain (e.g. me.bhole.sh)")
      .action((input: string) => {
        const domain = extractDomain(input);
        const config = loadConfig();
        config.domain = domain;
        saveConfig(config);
        console.log(`Domain set to ${domain}. Use 'bhole http <port>' to tunnel.`);
      })
  );
