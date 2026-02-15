#!/usr/bin/env node

import { Command } from "commander";
import { configCommand } from "./commands/config.js";
import { dashboardCommand } from "./commands/dashboard.js";
import { httpCommand } from "./commands/http.js";
import { tcpCommand } from "./commands/tcp.js";
import { CLI_VERSION } from "./lib/version.js";

const program = new Command();

program
  .name("bhole")
  .description("Expose local services to the internet - tunnel localhost with one command")
  .version(CLI_VERSION);

program.addCommand(configCommand);
program.addCommand(dashboardCommand);
program.addCommand(httpCommand);
program.addCommand(tcpCommand);

program.parse();
