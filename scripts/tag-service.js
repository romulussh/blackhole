#!/usr/bin/env node
/**
 * Create and push the next patch version tag (e.g. v0.1.4 -> v0.1.5).
 * Run from repo root after committing. Requires: git.
 *
 *   node scripts/tag-service.js
 *   pnpm run tag:service
 */
const { execSync } = require("child_process");

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", ...opts }).trim();
}

try {
  const tags = run("git tag -l 'v*'")
    .split("\n")
    .filter(Boolean)
    .sort((a, b) => {
      const pa = a.replace(/^v/, "").split(".").map(Number);
      const pb = b.replace(/^v/, "").split(".").map(Number);
      for (let i = 0; i < 3; i++) {
        const x = pa[i] ?? 0,
          y = pb[i] ?? 0;
        if (x !== y) return x - y;
      }
      return 0;
    });
  const last = tags[tags.length - 1] || "v0.0.0";
  const parts = last.replace(/^v/, "").split(".");
  const patch = (parseInt(parts[2], 10) || 0) + 1;
  const next = `v${parts[0]}.${parts[1]}.${patch}`;

  console.log(`Last tag: ${last} -> next: ${next}`);
  run(`git tag ${next}`);
  run(`git push origin ${next}`);
  console.log(`Tag ${next} pushed. GitHub Action will build and publish the release.`);
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
