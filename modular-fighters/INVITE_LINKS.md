# Modular Fighters — 角色登記連結（2026-10-28）

部署後（GitHub Pages）以下連結即可用。每位角色本人一條專屬連結，打開就是他的角色；頁面預設日文，右上可切中文／英文。
新朋友用最後一條（不帶參數）。送出的內容在審核頁看。

| 角色 | 連結 |
|------|------|
| OSC | https://madzine.work/modular-fighters/invite.html?char=osc |
| MODDICT | https://madzine.work/modular-fighters/invite.html?char=moddict |
| TATATA5 | https://madzine.work/modular-fighters/invite.html?char=tatata5 |
| MAD | https://madzine.work/modular-fighters/invite.html?char=mad |
| HATAKEN | https://madzine.work/modular-fighters/invite.html?char=hataken |
| Z_Hyper | https://madzine.work/modular-fighters/invite.html?char=zhyper |
| 新角色登記 | https://madzine.work/modular-fighters/invite.html |

審核頁（只有你用，資料庫本身是公開可讀的，網址不要外流）：
https://madzine.work/modular-fighters/review.html

## 轉發用日文短文

```
Modular Fighters にあなたのキャラクターが出ています！
得意なモジュールと特殊能力を選んでください（専用モジュールの設計も歓迎）。
スマホで 2〜3 分で終わります：
<上の専用リンク>
```

## 收到提交後的流程

1. review.html 看最新一筆，按「複製角色設定」。
2. 貼進 `modular-fighters/mf-characters.js` 對應角色那一行（既有角色是覆蓋，新角色是新增一行）。
3. 新角色：把對方傳來的圖轉成 `assets/<id>.mp4`（600×600、12fps、h264）或 `assets/<id>.png`，`src` 對應。
4. 專用模組：看描述與草圖，依三級處理（改參數變體 / 既有模組組合 / 全新 DSP）另外開工，做好後填 `module` 欄位。
5. 版本號 +0.0.1、`?v=` 換日期，推送。
