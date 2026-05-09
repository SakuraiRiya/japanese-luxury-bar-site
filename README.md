# BAR KAGE

Fictional Japanese luxury bar demo site for GitHub Pages.

## Pages

- Home: `index.html`
- Menu: `menu.html`
- Space: `space.html`
- Reservation: `reservation.html`
- Access: `access.html`

## Verification

```powershell
npm test
```

`npm test` checks the static site and the local renewal workflow MCP.

## Renewal MCP

This repository includes a local MCP server at `mcp/renewal-mcp/server.mjs`.
It captures the renewal workflow used for this site: define completion criteria, keep demo/legal notices, plan Japanese headline line breaks, validate sitemap/canonical URLs, inspect diffs before commits, and verify GitHub Pages after publishing.

The local MCP config is in `.mcp.json`.

The reservation and access content is intentionally fictional. No real booking, payment, or CMS integration is included.
