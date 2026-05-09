#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

const serverInfo = {
  name: "renewal-workflow-mcp",
  version: "1.0.0"
};

const tools = [
  {
    name: "renewal_workflow",
    description: "Return the standard website renewal workflow learned from the BAR KAGE GitHub Pages project.",
    inputSchema: {
      type: "object",
      properties: {
        projectType: { type: "string", description: "Optional project type, e.g. static-site, wordpress, nextjs." },
        target: { type: "string", description: "Optional target such as GitHub Pages or Vercel." }
      }
    }
  },
  {
    name: "audit_static_site",
    description: "Audit a static site for renewal readiness, Japanese headline line breaks, demo notices, and GitHub Pages path safety.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string", description: "Site root. Defaults to current working directory." },
        baseUrl: { type: "string", description: "Expected public base URL for sitemap/canonical checks." }
      }
    }
  },
  {
    name: "github_pages_checklist",
    description: "Return the publish checklist for GitHub Pages renewal work.",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Optional owner/repo." },
        pagesUrl: { type: "string", description: "Optional GitHub Pages URL." }
      }
    }
  }
];

function respond(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function fail(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

function textResult(text) {
  return { content: [{ type: "text", text }] };
}

async function exists(file) {
  try {
    const entry = await stat(file);
    return entry.isFile();
  } catch {
    return false;
  }
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
}

async function auditStaticSite(args = {}) {
  const root = path.resolve(args.root || process.cwd());
  const baseUrl = args.baseUrl || "";
  const issues = [];
  const htmlFiles = (await readdir(root)).filter((file) => file.endsWith(".html"));

  for (const file of htmlFiles) {
    const fullPath = path.join(root, file);
    const html = await readFile(fullPath, "utf8");
    if (!html.includes("架空")) issues.push(`${file}: missing fictional/demo notice`);
    if (!html.includes("20歳未満")) issues.push(`${file}: missing under-20 alcohol notice`);

    for (const href of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const target = href[1];
      if (target.startsWith("/")) issues.push(`${file}: root-relative path is unsafe for project Pages: ${target}`);
      if (/^(https?:|mailto:|tel:|#)/.test(target)) continue;
      const clean = target.split("#")[0].split("?")[0];
      if (clean && !(await exists(path.join(root, clean)))) {
        issues.push(`${file}: missing referenced file ${target}`);
      }
    }

    for (const match of html.matchAll(/<(h[12])([^>]*)>([\s\S]*?)<\/\1>/g)) {
      const [, tag, attrs, inner] = match;
      const text = stripTags(inner);
      const hasManualLines = attrs.includes("headline-lines") && inner.includes('class="line"');
      if (text.length >= 14 && !hasManualLines) {
        issues.push(`${file}: ${tag} should use headline-lines/span.line for Japanese line breaks: ${text}`);
      }
    }

    if (baseUrl && html.includes('rel="canonical"') && !html.includes(baseUrl)) {
      issues.push(`${file}: canonical URL does not include expected baseUrl ${baseUrl}`);
    }
  }

  for (const required of ["sitemap.xml", "robots.txt", "assets/css/styles.css"]) {
    if (!(await exists(path.join(root, required)))) issues.push(`missing ${required}`);
  }

  const cssPath = path.join(root, "assets/css/styles.css");
  if (await exists(cssPath)) {
    const css = await readFile(cssPath, "utf8");
    for (const rule of ["line-break: strict", "text-wrap: balance", "word-break: auto-phrase"]) {
      if (!css.includes(rule)) issues.push(`CSS missing Japanese headline rule: ${rule}`);
    }
  }

  return {
    root,
    ok: issues.length === 0,
    issues
  };
}

function workflow(args = {}) {
  const projectType = args.projectType || "static-site";
  const target = args.target || "GitHub Pages";
  return [
    `Project type: ${projectType}`,
    `Publish target: ${target}`,
    "",
    "Required workflow:",
    "1. Define completion criteria, verification method, and out-of-scope items before implementation.",
    "2. Review design risks before major structure or publishing decisions.",
    "3. Create page-specific visual assets and keep final assets inside the project.",
    "4. Build pages with relative paths so subpath hosting does not break CSS, JS, or images.",
    "5. Keep sitemap.xml, robots.txt, canonical URL, demo notices, and under-20 alcohol notice current.",
    "6. For Japanese h1/h2 text, avoid browser-only wrapping. Use headline-lines with span.line for intentional breaks.",
    "7. Run npm test and git diff --check. Inspect git diff before committing.",
    "8. Verify desktop and mobile screenshots before publishing.",
    "9. Commit only after checks pass, push, then confirm the live URL and sitemap on the published site.",
    "",
    "BAR KAGE lessons included:",
    "- Canonical URL must be corrected after GitHub Pages returns the actual html_url.",
    "- Demo reservation/access pages must clearly state that no real booking, payment, or address exists.",
    "- Large Japanese display type needs explicit line planning, not just larger content blocks."
  ].join("\n");
}

function pagesChecklist(args = {}) {
  const repo = args.repo || "<owner>/<repo>";
  const pagesUrl = args.pagesUrl || "https://<owner>.github.io/<repo>/";
  return [
    `Repository: ${repo}`,
    `Pages URL: ${pagesUrl}`,
    "",
    "Before push:",
    "- npm test passes",
    "- git diff --check passes",
    "- git diff has been read",
    "- screenshots checked on desktop and mobile",
    "- no root-relative local paths",
    "- long Japanese h1/h2 headings use intentional line spans",
    "",
    "After push:",
    "- GitHub Pages build status is built",
    "- homepage returns 200",
    "- all main pages return 200",
    "- assets/images hero files return 200",
    "- sitemap.xml and robots.txt return 200",
    "- live canonical URL matches the Pages html_url"
  ].join("\n");
}

async function callTool(name, args) {
  if (name === "renewal_workflow") return textResult(workflow(args));
  if (name === "github_pages_checklist") return textResult(pagesChecklist(args));
  if (name === "audit_static_site") {
    const audit = await auditStaticSite(args);
    return textResult(JSON.stringify(audit, null, 2));
  }
  throw new Error(`Unknown tool: ${name}`);
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }

  const { id, method, params = {} } = message;
  try {
    if (method === "initialize") {
      respond(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo
      });
    } else if (method === "tools/list") {
      respond(id, { tools });
    } else if (method === "tools/call") {
      respond(id, await callTool(params.name, params.arguments || {}));
    } else if (method?.startsWith("notifications/")) {
      return;
    } else if (id !== undefined) {
      fail(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    fail(id, -32000, error instanceof Error ? error.message : String(error));
  }
});
