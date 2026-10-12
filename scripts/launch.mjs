import { spawn } from "node:child_process";
import { openSync, closeSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const directory = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT || 5200);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Choose a port between 1024 and 65535.");
if (!existsSync(new URL("../dist/index.html", import.meta.url)))
  throw new Error("Run npm run build before launching.");
// Never stop or replace an existing service to obtain a port.
await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once("error", () =>
    reject(
      new Error(
        `Port ${port} is already in use. Existing services were left untouched.`,
      ),
    ),
  );
  probe.listen(port, "127.0.0.1", () => probe.close(resolve));
});
// Session-only detached child. No launchd, login items or machine configuration.
const log = openSync(new URL("../.play-server.log", import.meta.url), "a");
const child = spawn(
  process.execPath,
  [fileURLToPath(new URL("./serve.mjs", import.meta.url))],
  {
    cwd: directory,
    env: { ...process.env, PORT: String(port) },
    detached: true,
    stdio: ["ignore", log, log],
  },
);
closeSync(log);
await new Promise((resolve, reject) => {
  child.once("spawn", resolve);
  child.once("error", reject);
});
child.unref();
let ready = false;
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}`, {
      signal: AbortSignal.timeout(1000),
    });
    if (
      response.status === 200 &&
      (await response.text()).includes("Veil of the Salt Crown")
    ) {
      ready = true;
      break;
    }
  } catch {
    /* The child may still be binding its socket. */
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
}
if (!ready)
  throw new Error(
    `The game did not start. Check .play-server.log (child PID ${child.pid}).`,
  );
writeFileSync(
  new URL("../.play-server.pid", import.meta.url),
  String(child.pid),
);
console.log(
  `Launched PID ${child.pid}; http://127.0.0.1:${port} responded HTTP 200`,
);
