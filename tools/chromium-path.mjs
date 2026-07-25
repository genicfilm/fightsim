import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function existing(paths) {
  return paths.find((candidate) => candidate && existsSync(candidate)) || null;
}

function playwrightCaches() {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), ".cache", "ms-playwright"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "ms-playwright"),
    process.platform === "darwin" &&
      path.join(os.homedir(), "Library", "Caches", "ms-playwright"),
  ].filter(Boolean);

  for (const root of roots) {
    if (!existsSync(root)) continue;
    const dirs = readdirSync(root)
      .filter((entry) => entry.startsWith("chromium-"))
      .sort()
      .reverse();

    for (const dir of dirs) {
      const base = path.join(root, dir);
      const found = existing([
        path.join(base, "chrome-win64", "chrome.exe"),
        path.join(base, "chrome-win", "chrome.exe"),
        path.join(base, "chrome-linux64", "chrome"),
        path.join(base, "chrome-linux", "chrome"),
        path.join(
          base,
          "chrome-mac",
          "Chromium.app",
          "Contents",
          "MacOS",
          "Chromium",
        ),
        path.join(
          base,
          "chrome-mac-arm64",
          "Chromium.app",
          "Contents",
          "MacOS",
          "Chromium",
        ),
      ]);
      if (found) return found;
    }
  }

  return null;
}

function systemBrowsers() {
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env["ProgramFiles(x86)"];
  const localAppData = process.env.LOCALAPPDATA;

  return existing([
    programFiles && path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    programFilesX86 &&
      path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    localAppData &&
      path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    programFilesX86 &&
      path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    programFiles &&
      path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ]);
}

export function findChromium() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  return playwrightCaches() || systemBrowsers();
}
