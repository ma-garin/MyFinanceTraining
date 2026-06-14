# verify

Verify that Issue #4 data model and forms work correctly.

## Checklist

Run `npm run dev`, open the browser, and check each item:

- [ ] Dashboard — イベント一覧・テーマ一覧・仮説サマリーが表示される
- [ ] Event Input — フォームからイベントを1件追加できる
- [ ] Event Input — 追加後に登録済みリストに表示される
- [ ] Association Tree — 「仮説を追加」ボタンでフォームが開く
- [ ] Association Tree — 5段階ステップを入力して仮説を登録できる
- [ ] Association Tree — 仮説カードのステータスボタン（採用/様子見/棄却/要検証）が機能する
- [ ] Hypothesis Detail — ドロップダウンで仮説を選択できる
- [ ] Hypothesis Detail — ステータス変更が反映される
- [ ] Reload — ページリロード後もデータが保持される（localStorage確認）
- [ ] Mobile — 幅520px以下でレイアウトが崩れない

## Commands

```bash
npm run build   # TypeScriptコンパイル確認
npm run dev     # 開発サーバー起動
```
