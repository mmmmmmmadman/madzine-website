# MADZINE Website 開發紀錄

## 2026-08-31

### Artist Talk Translator v3.0

- Language C：可選的第三種語言，勾選後一次翻譯成兩種語言。模型輸出 `[JA] …` / `[ZH-TW] …` 標記，前端 `parseTaggedTranslation()` 解析為多行顯示。關閉時 prompt 與 DOM 結構與 v2.9 完全相同
- 模型升級：`claude-opus-5` / `claude-sonnet-5` / `claude-haiku-4-5`。5 系列加送 `output_config.effort = 'low'`；處理 `stop_reason === 'refusal'`；舊 localStorage model ID 自動遷移
- 三方審查列出 8 項待修缺陷（第 1 項 tag 別名解析為高嚴重度），尚未修
- 詳見 [artist-talk-translator-devlog.md](artist-talk-translator-devlog.md)

## 2026-08-02

### Session Guide：首頁加下載原始碼

- 程式本身就是單一 HTML 檔，下載原始碼即下載該檔本身
- 連結 href 由 `location.pathname` 產生而非寫死：repo 內是 `index.html`、網站上是 `sessionguide-app.html`，寫死任一個都會在另一邊失效；pathname 以 `/` 結尾時補 `index.html`
- 存檔名固定 `SessionGuide.html`
- 放在首頁三顆大按鈕下方，不進主操作畫面，避免演出中誤觸
- 三語：下載原始碼 / Download source / ソースをダウンロード
- 首頁預覽截圖一併重生（首頁正是該截圖的畫面）

### Session Guide：倒數與漸變畫面顯示下一個動作

- 選了槽 4 時，倒數畫面與漸變畫面顯示「然後 X」，讓所有人在事情發生前就知道接下來是什麼
- 新增 i18n key `next_up`（然後 {a} / then {a} / その後 {a}），走整句模板不做片段串接
- 訊息新增 `nextLabel`（純顯示字串），與 host 專用的可執行 `next` 物件分開：follower 存 `nextLabel` 但不存 `next`，槽 4 的執行權仍只在 host
- 收到的 `nextLabel` 截斷 24 字元，與 `sanitizeAct` 的 label 上限一致
- 沒有槽 4 時該行不佔版面（`display:none`），倒數/漸變結束時一併清除

### Session Guide：移除動作格的漸變楔形

- 動作格上的 cresc./decresc. 楔形圖示移除；「逐漸」已是獨立槽，動作格不再自帶漸變語意
- 編輯器方向鈕的楔形一併移除，文字由「漸強 / 漸弱」改為「吵 / 安靜」
- `.wedge` CSS、`#eddir.tempo` 隱藏規則與對應的 classList.toggle 一併刪除，無死碼
- 速度動作格的 `+10% / -10%` 保留（幅度，非漸變）
- `ramp_up / ramp_down`（漸強 / 漸弱）仍用於漸變執行中的畫面顯示

### Session Guide：動作標籤改為狀態

- 「逐漸/馬上」已獨立成槽，動作格不應再帶變化語意：變吵→吵、變安靜→安靜、變快→快、變慢→慢；英文 Louder/Quieter/Faster/Slower → Loud/Quiet/Fast/Slow
- 日文原本就是狀態形（強く / 静かに / 速く / 遅く），不動
- 預設格子存的是文字快照，已存過 localStorage 的舊標籤不會自動更新，故加 v4 遷移，只改寫與 v3 自動標籤完全相同的 label，使用者自訂字串不動

### Session Guide：四槽指令文法與 START 按鈕

- 指令改為四槽組句：經過多久（可省略）+ 馬上或逐漸（可省略）+ 做什麼（必填）+ 然後做什麼（可省略）
- 槽 1 語意由槽 2 決定：配「馬上」為延遲（倒數），配「逐漸」為期間（漸變）
- 槽 4 在第一段結束瞬間執行，自身不帶時間與漸變
- 「逐漸」未選小節數時拒送並提示，句子保留不清空
- 新增「停止」動作格；不帶時間即為急停
- 句子以整句模板 `sent_now / sent_after / sent_grad / sent_then` 組出，三語各自語序，非片段串接
- 加回 START：組好句子才送出，槽 3 未填時為停用（虛線邊 + 灰字），送出後清空
- 移除 4 秒回收窗全套機制（RECENT_MS / revokeRecent / renderPending / pendingbar / flashend），無死碼
- `#main` 拆為可捲的 `#mainscroll` + 不捲的 `#composebar`，START 在 390×600 不被擠掉
- 資料遷移至 v3，v1 與 v2 各自一次性升級

### 修正

- `LEGACY_MOD_TPL` 宣告在 `S` 之後，`loadCells()` 建構期取到 undefined 而拋錯，被大 try/catch 吞掉導致自訂格子靜默重置。模板移入函式體，try/catch 縮到只包 storage 讀取與 JSON.parse

### Session Guide：速度漸變與格子組合模型

- 格子改為兩區：修飾格（立刻 / 逐漸 N 小節 / N 小節後）+ 動作格（變吵 / 變安靜 / 變快 / 變慢 / SOLO / 回主題 / 結尾 / 自由）
- 三條操作路徑：修飾→動作、單點動作（立刻）、動作→修飾（4 秒內可改送，撤回原指令）
- 舊格式 localStorage 一次性遷移，`sg_cells` 由陣列升為 `{v:2, cells:[...]}`，自訂文字保留
- 速度漸變：變快 / 變慢帶百分比（預設 ±10%），可搭配三種修飾
- 時基改為積分解析解：BPM 對時間線性時累積拍數為時間的二次式，反解取數值穩定形式 `τ = 2β/(b+√(b²+4aβ))`
- 節拍器、click 前瞻排程、倒數與漸變小節換算全部改走 `beatAt()` / `timeOfBeat()`，無殘留固定 beatDur
- 速度類指令僅 host 可發，非 host 明確拒絕並提示

### 修正

- `needMigrateSave` 宣告位置在 `S` 之後，hoist 導致遷移結果從未寫回 localStorage
- 倒數對齊小節線時前導不足一拍會讓 4 小節倒數瞬間顯示 5，改為 clamp

### Session Guide：角色權限與漸變指令

- 權限與網路端點分離：`S.role` 維持網路角色，新增 `S.canCue` 權限旗標
- 加入時可選「可下指令 / 只跟隨」並填暱稱，主畫面可中途切換（交棒）
- host 為唯一狀態權威：conductor 送請求，host 套用後廣播，startAt 由 host 蓋章
- BPM 與拍號僅 host 可改，非 host conductor 顯示唯讀狀態列
- 新增第三種格子型別 ramp（漸強 / 漸弱 + N 小節），全螢幕持續進度顯示，與倒數互斥
- 新增訊息型別 `ramp` / `rampcancel`，`sync` 加帶 ramp 供中途加入者接上
- 修正 `update()` 內區域變數 `t` 遮蔽翻譯函式 `t()` 導致的 TypeError
- 介紹頁 features 新增 ramp 與 roles 兩項三語說明

---

## 2026-08-01

### 新增 Session Guide

- 新增 sessionguide.html：作品介紹頁（六張截圖 thumb strip、功能介紹、技術資訊）
- 新增 sessionguide-app.html：樂團即興指揮 Web 應用程式（原 sessionguide.html 改名）
- software.html 新增 Session Guide 列表項目
- i18n.js 新增 sessionguide 三語翻譯（desc / intro / launch / features）
- App 本身內建三語切換（中 / EN / JP），支援 `?lang=` 參數
- 開源程式碼位置：`OpenSource/SessionGuide/index.html`（單檔自包含）

### 技術架構

- 連線：WebRTC 點對點（PeerJS），4 字元房號；leader 廣播 JSON，follower 定期 ping/pong 校時
- 節奏：Tap tempo（近 4 次間隔平均），拍號 4/4、3/4、6/8、7/8、5/4
- 節拍器：純視覺圓點（主畫面與倒數畫面各一組），第一拍 accent 色，AudioContext click 音可選
- 指令：自訂格子存 localStorage，即時閃示型與小節倒數型兩種
- 倒數：依時間戳本地推算，最後一小節紅色警示，歸零閃示指令
- 視窗：`100dvh` 處理 iOS Safari 動態工具列，主欄整體可捲動
- 其他：Wake Lock 螢幕常亮、本地離線模式

---

## 2026-06-19

### 首頁文案調整

- 刪除 hero tagline「對藝術嚴謹，對人生溫柔 / Strict with art, gentle with life / 芸術に厳しく、人生に優しく」
  - 移除 index.html 中 `<span class="v7__description">` 整行
  - i18n.js 三語 `hero.description` 改為空字串（保留 key）
  - index.html `<meta name="description">` 同步移除該句
- Software 區塊描述改為「自製應用程式 / Original applications / オリジナルアプリケーション」（原為「VCV Rack 模組與自製應用程式」）

---

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

## 2026-04-19

### Artist Talk Translator v2.7

- 外接麥克風熱插拔卡黃燈修正：`devicechange` 事件 + 500ms debounce + 重建 `MediaStreamAudioSourceNode`，保留 AudioContext/worklet/ws 不中斷
- 詳見 [artist-talk-translator-devlog.md](artist-talk-translator-devlog.md)

### Artist Talk Translator v2.6

- 連續說話無法開始翻譯修正：`commit_strategy=manual` + 客戶端 RMS VAD（靜音 1.5s）+ 12s 時間上限
- 詳見 [artist-talk-translator-devlog.md](artist-talk-translator-devlog.md)

### Artist Talk Translator v2.5

- Session 靜默停止修復：WebSocket 健康狀態機、自動重連（exponential backoff）、手動重連按鈕、連線狀態燈、統一 `[WS]` log
- 詳見 [artist-talk-translator-devlog.md](artist-talk-translator-devlog.md)

### Artist Talk Translator v2.4

- 自動捲動至最新片段修正（IntersectionObserver async 時機問題 → 改同步判斷 + double rAF）
- 詳見 [artist-talk-translator-devlog.md](artist-talk-translator-devlog.md)

### Artist Talk Translator v2.3

- 長時間 session 凍結修正（增量 DOM、ring buffer、content-visibility、scroll observer、token refresh overlap）
- 重複翻譯修正（`committed_transcript` vs `committed_transcript_with_timestamps`）
- 詳見 [artist-talk-translator-devlog.md](artist-talk-translator-devlog.md)

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

- 新增 artist-talk-translator.html / artist-talk-translator-app.html / audio-processor.js
- software.html 新增列表項目、i18n.js 新增三語翻譯
- 初版為 macOS native（Swift / SpeechAnalyzer）；跨平台需求改 Web 版
- 詳見 [artist-talk-translator-devlog.md](artist-talk-translator-devlog.md)

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
