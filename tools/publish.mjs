/* Push the current committed tree to the public repo.
 *
 *   npm run publish
 *
 * Two repos exist on purpose. genicfilm/UFCREF is private and holds the real
 * history — which includes fighter photography from the predecessor project,
 * the thing this project's first hard rule exists to keep out. genicfilm/mma-receipts
 * is public, has no history before the first clean snapshot, and is what
 * GitHub Pages serves.
 *
 * This copies the tree at HEAD — never the working directory, so nothing
 * uncommitted or gitignored can leak — and refuses to run if anything that
 * looks like the predecessor's assets has come back.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readdirSync, cpSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REMOTE = "https://github.com/genicfilm/mma-receipts.git";
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

if (run("git", ["status", "--porcelain"], ROOT)) {
  console.error("  working tree is dirty — commit first, this publishes HEAD not your desk");
  process.exit(1);
}

const stage = mkdtempSync(path.join(tmpdir(), "mma-receipts-pub-"));
try {
  // HEAD only. `git archive` cannot see untracked or ignored files by design.
  execFileSync("sh", ["-c", `git archive HEAD | tar -x -C '${stage}'`], { cwd: ROOT });

  // The rule that killed the predecessor, enforced rather than remembered.
  const banned = [];
  const walk = (d, rel = "") => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) walk(path.join(d, e.name), r);
      else if (/\.(jpe?g|webp|gif)$/i.test(e.name) || /cut\.png$/i.test(e.name)) banned.push(r);
    }
  };
  walk(stage);
  if (banned.length) {
    console.error("  refusing to publish — these look like photography, not app output:");
    banned.forEach(b => console.error("    " + b));
    process.exit(1);
  }

  const clone = mkdtempSync(path.join(tmpdir(), "mma-receipts-clone-"));
  run("git", ["clone", "--depth", "1", REMOTE, clone]);
  for (const e of readdirSync(clone)) if (e !== ".git") rmSync(path.join(clone, e), { recursive: true, force: true });
  for (const e of readdirSync(stage)) cpSync(path.join(stage, e), path.join(clone, e), { recursive: true });

  if (!run("git", ["status", "--porcelain"], clone)) {
    console.log("  public repo already matches HEAD — nothing to publish");
  } else {
    const subject = run("git", ["log", "-1", "--pretty=%s"], ROOT);
    run("git", ["add", "-A"], clone);
    run("git", ["commit", "-m", subject], clone);
    run("git", ["push", "origin", "HEAD:main"], clone);
    console.log(`  published: ${subject}`);
    console.log("  https://genicfilm.github.io/mma-receipts/");
  }
  rmSync(clone, { recursive: true, force: true });
} finally {
  rmSync(stage, { recursive: true, force: true });
}
