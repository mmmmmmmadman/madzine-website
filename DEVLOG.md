# MADZINE Website 開發紀錄

## 網站更新指南

### 架構概覽

- 純靜態網站（HTML + CSS + JS），無框架、無建置步驟
- 部署：push 到 `main` → GitHub Actions 自動部署至 GitHub Pages
- 域名：`madzine.work`（CNAME 設定在 repo 根目錄）
- 部署後瀏覽器若未更新，按 `Cmd + Shift + R` 強制重新整理

### 檔案結構

```
index.html              首頁
works.html              作品總覽（分類連結 + Utsurobune 獨立項目）
works-music.html        音樂作品
works-performance.html  現場演出（依時間倒序）
works-audiovisual.html  影像作品
works-interactive.html  互動裝置
works-tutorial.html     教學
software.html           軟體總覽
visual-feedback-machine.html      VFM 介紹頁
visual-feedback-machine-app.html  VFM Web 應用程式
artist-talk-translator.html       ATT 介紹頁
artist-talk-translator-app.html   ATT Web 應用程式
contact.html            聯絡
js/i18n.js              三語翻譯（zh-TW / en / ja）
js/main.js              共用功能（深色模式、語言切換）
css/tokens.css          設計 token（顏色、字體、間距）
css/style.css           共用樣式
assets/                 圖片、Logo
```

### 新增作品的步驟

1. **決定分類**：放在哪個頁面（works-music / performance / audiovisual / interactive）或 works.html 獨立項目
2. **HTML**：在對應頁面的 `.works-v1__list` 中新增一筆 `<a class="works-v1__row">`
   - `data-preview="KEY"` 對應 hover 預覽圖的 key
   - 年份放在右側：`<span class="works-v1__row-year">2025</span>`
   - YouTube 連結格式：`https://youtube.com/watch?v=VIDEO_ID`
3. **預覽圖**：在同頁的 `#works-preview` 中新增 `<img data-key="KEY" src="https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg">`
4. **翻譯**（如需要）：在 `js/i18n.js` 的三個語言區塊中各新增對應的翻譯 key
5. **推送**：commit → push，等 GitHub Actions 部署完成（約 20 秒）

### 現場演出排序規則

- 依時間倒序（最新在前）
- 有明確日期的以日期為準，有 Day 編號的以 Day 大小為準
- 無日期的依位置推估年份

### 注意事項

- 每頁的 CSS 是內嵌在 `<style>` 中，非共用檔案（除 tokens.css 和 style.css）
- 手機版（640px 以下）隱藏年份標籤和分隔符號 `/`
- i18n.js 有三個獨立的語言物件，新增翻譯時三個都要更新

---

## 2026-04-14

### 新增 Visual Feedback Machine

- 新增 visual-feedback-machine.html：作品介紹頁（截圖、功能介紹、技術資訊、Liora 協作連結）
- 新增 visual-feedback-machine-app.html：即時混沌音訊處理 Web 應用程式
- software.html 新增 Visual Feedback Machine 列表項目
- i18n.js 新增 vfm 三語翻譯（介紹、功能列表）
- Launch App 按鈕改為 target="_blank" 開新頁面（同時修正 Artist Talk Translator）

### 技術架構

- 音訊：Web Audio API（ScriptProcessorNode），mic → delay (feedback) → granular engine → BPF → output
- 雙 Chaos 來源：Lorenz attractor（σ=10, ρ=28, β=8/3）/ 相機輪廓偵測（Sobel + Moore neighbor tracing）
- 三通道獨立 Chaos 映射：A（BPF 頻率 + grain position）、B（delay time）、C（grain size + density）
- 影像處理：Canvas 2D，160×120 解析度，轉角角度作為 chaos 訊號
- 視覺化：Lorenz x-z 相空間蝴蝶圖 / 輪廓掃描動態預覽
- UI：深灰主題、兩欄佈局、HUE 色輪強調色、三語介面（繁中/EN/JP）、hover 三語說明書
- 協作：Liora（https://www.instagram.com/mono_vnvn/）

---

## 2026-04-13

### 新增 Artist Talk Translator

- 新增 artist-talk-translator.html：作品介紹頁（截圖、功能介紹、技術資訊、三語使用說明）
- 新增 artist-talk-translator-app.html：即時語音翻譯 Web 應用程式
- 新增 audio-processor.js：AudioWorklet PCM 處理（48kHz→16kHz resampling）
- software.html 新增 Artist Talk Translator 列表項目
- i18n.js 新增 artisttalktranslator 三語翻譯（介紹、功能、使用說明五步驟）

### 技術架構

- 語音辨識：ElevenLabs Scribe v2 Realtime（WER 2.3%，WebSocket 串流）
- 翻譯：Claude API（Anthropic），支援預載文本脈絡翻譯
- Token Proxy：Cloudflare Worker（elevenlabs-token-proxy.mmmmmmmadman.workers.dev）
- 自動語言偵測：ElevenLabs code-switching，16 種語言
- 預載文本：支援多檔案累加載入，前 4000 字元注入 Claude system prompt
- 三語 UI：中文、英文、日文（含完整使用說明書）
- 部署方式：純靜態 HTML + Cloudflare Worker（token proxy）

### 開發過程

- 初版為 macOS native app（Swift/SwiftUI + SpeechAnalyzer + Apple Translation）
- 因跨平台需求改為 Web app
- ASR 從 Web Speech API（WER ~10-15%）升級為 ElevenLabs Scribe v2（WER 2.3%）
- 翻譯從 Apple Translation（無脈絡）改為 Claude API（支援預載文本脈絡）
- 曾嘗試本地 LLM（MLX + Qwen3-8B-4bit），因品質不如 Claude 而放棄

---

## 2026-04-11

### 新增 Dance Sound Design 頁面與區塊

- 新增 works-dance.html：14 件舞蹈聲音設計作品（2017-2026），含雲門 2、施旻雯、Cristina Negucioiu、AKIYO、工藤丈輝合作
- works.html 新增 Dance Sound Design 獨立區塊（與 Residency 同格式），11 件作品
- 高美館演出拆分為三場具體紀錄：造音（2021 獨演）、虎來跳舞（2022 舞蹈音樂設計）、無聲to有聲（2023 與雲門舞者邱怡文＋施旻雯）
- i18n.js 新增 dance 三語翻譯

### 新增 Research 區塊與三篇論文 HTML 頁面

- works.html 新增 Research 獨立區塊，列出三篇研究論文
- research-worldrhythm.html：WorldRhythm 跨文化節奏生成論文（英文）
- research-worldrhythm-ja.html：日文版
- research-worldrhythm-zh.html：中文版
- research-jazzarchitect.html：JazzArchitect 爵士和聲生成論文（英文）
- research-jazzarchitect-ja.html：日文版
- research-jazzarchitect-zh.html：中文版
- research-microtuning.html：世界微分音系統研究（中文原文）
- research-microtuning-ja.html：日文翻譯版
- i18n.js 新增 research 三語翻譯
- 論文頁面使用 paper__ 系列 CSS class，content-narrow 寬度，適合長文閱讀

### 論文頁面語言切換

- 底部語言按鈕（中 EN JP）點擊後跳轉到對應語言版本的論文頁面
- 頁面載入時自動偵測 localStorage 中的語言設定，若與當前頁面語言不符則自動跳轉
- 解決「在日文模式下點進英文版論文需手動切換兩次」的問題

### 修正

- research-jazzarchitect 三個語言版本缺少 bottom-bar CSS，導致底部欄位靠左
- works.html Dance 區塊時間排序修正（2023 年兩筆排在一起）
- works.html Dance 區塊 data-i18n 屬性位置修正（從 `<a>` 移到 `<h2>`）
- research-microtuning.html title 從英文改為中文

---

## 2026-04-03

### modules.html 配色更新與模組新增

- 配色從狐色 Kitsune `oklch(0.64 0.09 70)` 改為藤色 Fuji `oklch(0.65 0.06 295)`，與 Edo Twilight 設計語言更協調
- 分類 header 漸層終點更新為 `oklch(0.72 0.07 295)`
- card hover shadow 從粉紅色 `rgba(255,107,157,0.25)` 改為藤色半透明 `oklch(0.65 0.06 295 / 0.20)`
- 新增 UniRhythm（32HP 寬卡）和 Portal（8HP）模組卡片至 Signature 分類
- i18n.js 新增 UniRhythm 和 Portal 三語翻譯（zh-TW / en / ja）
- modules.html 新增返回連結（← 返回），與其他軟體分頁一致

---

## 2026-03-25

### 網站上線

- 建立 MADZINE 官方網站，部署至 GitHub Pages
- 自訂域名 `madzine.work`
- 新增 GitHub Actions 自動部署 workflow

### 修正

- 修正手機版首頁無法捲動的問題
- 修正 VCV Rack 教學播放清單連結錯誤

### 課程講義下載

- contact.html 與 works-tutorial.html 新增課程講義下載連結（Dropbox）
- 新增三語翻譯 key：`contact.course.handout`、`tutorial.handout`、`tutorial.handoutDesc`
- 修正 course i18n 結構，改用巢狀物件以符合翻譯系統格式

### i18n 翻譯問題排查

- 新增的翻譯 key 在線上顯示為原始 key 字串
- 調查發現：部署實際已成功，問題出在瀏覽器快取與 CDN 延遲
- GitHub Pages 的 `https_enforced` 為 `false`，HTTP/HTTPS 版本可能不一致

### 移除 Dropbox 標示

- 三語翻譯移除「(Dropbox)」/「（Dropbox）」文字
- HTML fallback 文字同步更新
- 連結維持指向 Dropbox

### 啟用 HTTPS

- 透過 GitHub Settings → Pages 重新設定自訂域名，觸發 SSL 憑證簽發
- 啟用 Enforce HTTPS，http 自動導向 https

### 新增作品：Utsurobune

- works.html 新增 Utsurobune（2025）作為獨立作品項目，連結至 YouTube
- 新增三語翻譯（zh-TW / en / ja）至 i18n.js
- hover 預覽圖使用 YouTube 縮圖

### 右側年份標籤

- works.html、works-music.html、works-performance.html 新增右對齊年份標籤
- 音樂作品頁：年份從標題內 `<small>` 移至右側獨立 span
- 現場演出頁：全部 35 筆演出加上年份標籤
- 作品總覽頁：各分類加上年份範圍，Utsurobune 年份移至右側
- 手機版（640px 以下）隱藏年份標籤

### 現場演出排序

- works-performance.html 依時間倒序重新排列（最新在前）
