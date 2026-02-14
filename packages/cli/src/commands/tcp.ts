import { Command } from "commander";

export const tcpCommand = new Command("tcp")
  .description("Expose a local TCP port to the internet (coming soon)")
  .argument("<port>", "Local port to expose")
  .option("-s, --server <url>", "Blackhole server URL", "ws://localhost:8081")
  .option("--subdomain <name>", "Custom subdomain for the tunnel")
  .action((_portStr: string) => {
    console.log("TCP tunneling is not yet implemented. Use 'bhole http <port>' for HTTP.");
    process.exit(1);
  });
