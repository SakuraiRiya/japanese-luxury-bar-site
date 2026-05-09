# BAR KAGE Renewal Workflow

このリポジトリでサイト更新を行うときは、ユーザーが明示しなくても以下を実施する。

## 完了条件

- 主要ページの表示内容が更新されていること
- 日本語見出しの改行が語の途中で不自然に割れていないこと
- `sitemap.xml`、canonical URL、画像参照、デモ表記、20歳未満飲酒不可表記が維持されていること
- `npm test` と `git diff --check` が通ること
- 変更前に `git diff` を確認し、公開後に GitHub Pages の実URLで反映を確認すること

## 日本語改行ルール

- 長い `h1` / `h2` はブラウザ任せにせず、`headline-lines` と `span.line` で意図した行分けを入れる。
- CSS側では `line-break: strict`、`text-wrap: balance`、`word-break: auto-phrase` を維持する。
- PCとモバイルのスクリーンショットを確認し、助詞や単語の途中で見出しが孤立していないか見る。

## リニューアルMCP

この流れは `mcp/renewal-mcp/server.mjs` にもMCPツールとして保存している。今後のサイトリニューアル作業では、同MCPの `renewal_workflow` と `audit_static_site` を使って、作業前の契約定義と公開前チェックを行う。
