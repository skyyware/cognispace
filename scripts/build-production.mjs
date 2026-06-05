import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = resolve(import.meta.dirname, "..");
const frontendDist = resolve(rootDir, "frontend/dist");
const backendStatic = resolve(rootDir, "backend/src/main/resources/static");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

run("npm", ["--prefix", "frontend", "run", "build"]);
rmSync(backendStatic, { force: true, recursive: true });
mkdirSync(backendStatic, { recursive: true });
cpSync(frontendDist, backendStatic, { recursive: true });
run("mvn", ["-pl", "backend", "test", "package"]);
