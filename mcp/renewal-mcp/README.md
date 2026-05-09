# Renewal Workflow MCP

サイトリニューアル時の標準フローを返し、静的サイトの公開前チェックを行うローカルMCPサーバーです。

## 起動

```powershell
node mcp/renewal-mcp/server.mjs
```

Codex / Claude から使う場合は、リポジトリ直下の `.mcp.json` を参照します。

## Tools

- `renewal_workflow`: 今回の制作フローを含む標準チェックリストを返す
- `audit_static_site`: HTML/CSS/sitemap/robots/日本語見出し改行を検査する
- `github_pages_checklist`: GitHub Pages 公開前後の確認項目を返す

## このMCPに含めた今回の流れ

1. 完了条件を先に決める
2. 重要な設計リスクを確認する
3. 主要ページごとの画像とページ構成を作る
4. デモ表記、年齢注意、予約/決済なしの明示を維持する
5. 日本語見出しは手動改行とCSSで整える
6. `npm test`、`git diff --check`、スクリーンショット確認を行う
7. `git diff` 確認後にコミット、push、GitHub Pages 実URL確認を行う
