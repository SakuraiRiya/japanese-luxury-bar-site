import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const server = spawn(process.execPath, [path.join(root, "mcp/renewal-mcp/server.mjs")], {
  cwd: root,
  stdio: ["pipe", "pipe", "pipe"]
});

const messages = [
  { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
  { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "audit_static_site",
      arguments: {
        root,
        baseUrl: "https://sakurairiya.github.io/japanese-luxury-bar-site"
      }
    }
  }
];

let stdout = "";
let stderr = "";

server.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});

server.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

for (const message of messages) {
  server.stdin.write(`${JSON.stringify(message)}\n`);
}
server.stdin.end();

const exitCode = await new Promise((resolve) => {
  server.on("close", resolve);
});

if (exitCode !== 0) {
  console.error(stderr || `MCP server exited with code ${exitCode}`);
  process.exit(1);
}

const responses = stdout.trim().split(/\n+/).map((line) => JSON.parse(line));
const list = responses.find((response) => response.id === 2)?.result?.tools || [];
const auditText = responses.find((response) => response.id === 3)?.result?.content?.[0]?.text;
const audit = JSON.parse(auditText || "{}");

if (!list.some((tool) => tool.name === "renewal_workflow")) {
  console.error("MCP test failed: renewal_workflow tool missing");
  process.exit(1);
}

if (!audit.ok) {
  console.error(`MCP audit failed:\n${JSON.stringify(audit, null, 2)}`);
  process.exit(1);
}

console.log(`Renewal MCP check passed: ${list.length} tools and static-site audit verified.`);
