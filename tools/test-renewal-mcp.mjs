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
  },
  {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "homepage_production_agent",
      arguments: {
        clientName: "BAR KAGE",
        businessType: "Japanese luxury bar",
        goal: "reservation conversion for a fictional demo site",
        targetAudience: "adults looking for a quiet premium bar experience",
        tone: "luxury, quiet, Japanese minimalism",
        pages: ["Home", "Menu", "Space", "Reservation", "Access"],
        publishTarget: "GitHub Pages",
        constraints: ["fictional demo site", "no real booking", "no payment", "under-20 alcohol notice required"]
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

if (!list.some((tool) => tool.name === "homepage_production_agent")) {
  console.error("MCP test failed: homepage_production_agent tool missing");
  process.exit(1);
}

if (!audit.ok) {
  console.error(`MCP audit failed:\n${JSON.stringify(audit, null, 2)}`);
  process.exit(1);
}

const homepageAgentText = responses.find((response) => response.id === 4)?.result?.content?.[0]?.text;
const homepageAgent = JSON.parse(homepageAgentText || "{}");
if (homepageAgent.agent?.name !== "homepage-production-agent") {
  console.error("MCP test failed: homepage production agent did not return its agent identity");
  process.exit(1);
}

if (!Array.isArray(homepageAgent.sitemap) || homepageAgent.sitemap.length < 5) {
  console.error("MCP test failed: homepage production agent sitemap is incomplete");
  process.exit(1);
}

if (!homepageAgent.qualityGates?.includes("npm test")) {
  console.error("MCP test failed: homepage production agent quality gates missing npm test");
  process.exit(1);
}

console.log(`Renewal MCP check passed: ${list.length} tools, homepage agent, and static-site audit verified.`);
