import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const actualWebDir = path.join(repoRoot, "apps", "web");
const nextBinRelative = path.join("node_modules", "next", "dist", "bin", "next");

function parseArgs(argv) {
  const options = {
    buildOnly: false,
    startOnly: false,
    host: "127.0.0.1",
    port: "3013",
    mode: "auto",
  };

  for (const arg of argv) {
    if (arg === "--build-only") {
      options.buildOnly = true;
    } else if (arg === "--start-only") {
      options.startOnly = true;
    } else if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length);
    } else if (arg.startsWith("--port=")) {
      options.port = arg.slice("--port=".length);
    } else if (arg.startsWith("--mode=")) {
      options.mode = arg.slice("--mode=".length);
    }
  }

  return options;
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with ${signal ?? `code ${code ?? "unknown"}`}`,
        ),
      );
    });

    child.on("error", reject);
  });
}

function runWindowsCommand(commandLine, cwd) {
  return run("cmd.exe", ["/d", "/s", "/c", commandLine], cwd);
}

function isAsciiOnly(value) {
  return /^[\x00-\x7F]*$/.test(value);
}

function listSubstMappings() {
  const result = spawnSync("cmd", ["/d", "/s", "/c", "chcp 65001>nul && subst"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return new Map();
  }

  const mappings = new Map();
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/^([A-Z]:)\\: => (.+)$/i);
    if (!match) {
      continue;
    }
    mappings.set(match[1].toUpperCase(), match[2]);
  }
  return mappings;
}

function resolveWindowsWebDir() {
  const mappings = listSubstMappings();
  const normalizedRepoRoot = path.normalize(repoRoot).toLowerCase();
  const repoBaseName = path.basename(repoRoot).toLowerCase();

  for (const [drive, target] of mappings.entries()) {
    if (path.normalize(target).toLowerCase() === normalizedRepoRoot) {
      return {
        webDir: path.join(`${drive}\\`, "apps", "web"),
        cleanup: null,
      };
    }
  }

  for (const [drive, target] of mappings.entries()) {
    const normalizedTarget = path.normalize(target).toLowerCase();
    if (
      normalizedTarget.endsWith(`\\${repoBaseName}`) &&
      existsSync(path.join(`${drive}\\`, "apps", "web"))
    ) {
      return {
        webDir: path.join(`${drive}\\`, "apps", "web"),
        cleanup: null,
      };
    }
  }

  if (isAsciiOnly(repoRoot)) {
    return {
      webDir: actualWebDir,
      cleanup: null,
    };
  }

  const candidates = ["X:", "Y:", "Z:", "W:", "V:"];
  const freeDrive = candidates.find((drive) => !mappings.has(drive));

  if (!freeDrive) {
    throw new Error("No free drive letter available for a stable Windows web path.");
  }

  const create = spawnSync("cmd", ["/c", "subst", freeDrive, repoRoot], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (create.status !== 0) {
    throw new Error(`Failed to create subst drive ${freeDrive}: ${create.stderr || create.stdout}`);
  }

  const cleanup = () => {
    spawnSync("cmd", ["/c", "subst", freeDrive, "/D"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
  };

  return {
    webDir: path.join(`${freeDrive}\\`, "apps", "web"),
    cleanup,
  };
}

function resolveWebDir() {
  if (process.platform !== "win32") {
    return {
      webDir: actualWebDir,
      cleanup: null,
    };
  }

  return resolveWindowsWebDir();
}

function resolveRuntime(mode) {
  if (mode === "prod" || mode === "dev") {
    return mode;
  }

  return process.platform === "win32" ? "prod" : "dev";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runtimeMode = resolveRuntime(options.mode);
  const { webDir, cleanup } = resolveWebDir();
  const nextBin = path.join(webDir, nextBinRelative);

  if (!existsSync(nextBin)) {
    throw new Error(`Next binary not found: ${nextBin}`);
  }

  let cleaned = false;
  const finalize = () => {
    if (cleaned || !cleanup) {
      return;
    }
    cleaned = true;
    cleanup();
  };

  process.on("SIGINT", () => {
    finalize();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    finalize();
    process.exit(143);
  });
  process.on("exit", finalize);

  if (process.platform === "win32") {
    const nextBinCommand = nextBinRelative.replaceAll("/", "\\");

    if (!options.startOnly) {
      await runWindowsCommand(
        `npx --yes --package=node@22.19.0 node ${nextBinCommand} build --webpack`,
        webDir,
      );
      if (options.buildOnly) {
        return;
      }
    }

    await runWindowsCommand(
      `npx --yes --package=node@22.19.0 node ${nextBinCommand} ${
        runtimeMode === "dev" ? "dev" : "start"
      } --hostname ${options.host} --port ${options.port}`,
      webDir,
    );
    return;
  }

  if (!options.startOnly) {
    await run(process.execPath, [nextBin, "build", "--webpack"], webDir);
    if (options.buildOnly) {
      return;
    }
  }

  await run(
    process.execPath,
    [nextBin, runtimeMode === "dev" ? "dev" : "start", "--hostname", options.host, "--port", options.port],
    webDir,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
