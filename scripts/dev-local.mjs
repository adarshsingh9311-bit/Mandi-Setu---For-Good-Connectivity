import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const python = resolve(
  root,
  "backend",
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
if (!existsSync(python)) {
  console.error("Backend environment missing. Follow the backend setup steps in README.md first.");
  process.exit(1);
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === "win32") {
      // The Windows virtualenv launcher owns a second Python process.
      // Stop only this launcher's process tree, including that worker.
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else child.kill();
  }
  process.exitCode = code;
}
function start(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: "inherit", windowsHide: true });
  children.push(child);
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
  return child;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
start(
  python,
  ["-B", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
  resolve(root, "backend"),
);
let ready = false;
for (let attempt = 0; attempt < 40 && !stopping; attempt++) {
  try {
    const response = await fetch("http://127.0.0.1:8000/health", {
      signal: AbortSignal.timeout(500),
    });
    ready = response.ok;
    if (ready) break;
  } catch {
    /* Backend is still starting. */
  }
  await new Promise((done) => setTimeout(done, 250));
}
if (!ready && !stopping) {
  console.error("Backend did not start. Check the error above.");
  stop(1);
}
if (ready && !stopping) {
  start(
    process.execPath,
    [
      resolve(root, "node_modules/vite/bin/vite.js"),
      "--host",
      "127.0.0.1",
      "--port",
      "8081",
      "--strictPort",
    ],
    root,
  );
  console.log("\nOpen http://127.0.0.1:8081 — keep this terminal running.\n");
}
