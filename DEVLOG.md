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
