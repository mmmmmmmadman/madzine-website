# MADZINE Website 開發紀錄

## 2026-10-21

### Modular Fighters：手機模組縮到 60%（試用）+ 首頁標題被語言列蓋住修正

- 狀態列加 FULL SCREEN 鈕（三語，`#fsbtn`）：只在瀏覽器有 Fullscreen API 且目前不是全螢幕時顯示，按下重新進全螢幕；`fullscreenchange` 事件更新顯示。起因：iPad Safari 全螢幕中往下滑會退出全螢幕，原本只有 START 會進去。另在對戰畫面對 `touchmove` 做 `preventDefault`（KO 覆蓋層與說明卡例外），讓垂直滑動不被當成頁面手勢；是否真能擋住 iPad 的退出手勢未實機驗證
- 本地 css / js 連結加 `?v=日期` 快取破壞參數（`index.html` 頂端有註解）：使用者 iPhone 13 mini 上看到的是舊版，GitHub Actions 部署全部成功，判斷為 Safari 快取舊 css / js；之後每次改這些檔要一起改版本字串
- 橫向（短橫向版面）也縮 60%：`.mfp-rail{zoom:0.6}` 加進橫向媒體查詢，240px 列在螢幕上 144px，面板（列 + 捲動桿）從 284 降到 188px；右端 AUTO／SEND／OUT 直欄按鈕 48 → 42px、間距 6 → 4 以塞進 188px（量測無溢出）；角色場景改為螢幕高 − 100px（844×390 為 290px），下半身透出面板的部分約 50px。線端與接孔誤差 0px
- 直式且寬 ≤ 500px 時 `.mfp-rail{zoom:0.6}`（`mf-patch-ui.css` 末段）：模組盒、接孔、旋鈕、文字一起縮成 60%，390 寬一次看到約 3.5 個模組（原本 2 個），模組列高 270 → 162px，角色區相對變高（390×844 為 528px）。只 zoom 模組列、不 zoom 線材 SVG（SVG 是列的兄弟或面板層的子元素），JS 用 getBoundingClientRect 讀到的 viewport 座標直接對應線材座標，無頭瀏覽器量測線端與接孔中心誤差 0px；旋鈕拖曳、接孔拉線、捲動桿都正常。**代價**：接孔觸控區 48 → 29px、字 16 → 9.6px，低於先前「接孔放大 50% 給 iPhone」與「字 ≥ 14pt」兩條規則，使用者指示先試，不合再退
- 首頁標題在短螢幕（iPhone SE、Safari 工具列佔掉高度、加入主畫面後狀態列）被右上語言／HUE 列蓋住：原因是 `.center` 用 `justify-content:center`，內容高於視窗時 flex 的 auto margin 歸零、置中造成上緣溢出到看不見。改 `flex-start`（`.pane` 的 auto margin 仍負責放得下時置中），`#home` 上方留 60px + 安全區給語言列，`.center` 上方 padding 加 `env(safe-area-inset-top)`

### Modular Fighters：橫向也能顯示 + 全螢幕

- 原本只有直式版面：整頁 `overflow:hidden` 加垂直置中、模組列固定高度。手機橫拿時（844×390、667×375）首頁標題與角色選擇被裁掉，對戰畫面角色區只剩 36 px，KO 畫面溢出
- 新增「短橫向」版面：`(orientation: landscape) and (max-height: 620px)` 時生效，iPad 橫向（820 高）與桌機一般視窗維持原本直式堆疊
  - 對戰維持上下堆疊、模組一橫排跨滿版寬（使用者裁示：不做左右分區）。模組列 240 px（逐一量測九種模組，240 是全部旋鈕標籤都不被裁的最小值），捲動桿在列下方；AUTO / SEND / OUT 改成直欄放在模組列右端（寬 132 px，`.mfp` 改 grid），所以 footer 不再吃高度
  - **面板疊在角色場景上**（使用者看過四張模擬圖後選第四張）：角色場景高度＝螢幕高 − 130 px（844×390 為 260 px），面板（284 px）絕對定位在底部蓋住場景下半，面板底板半透明（模組 55%、機箱 25%、凹陷區 40%，使用者看過 72% 版後要求再透明一點；`mf-patch-ui.css` 新增 `--mfp-case-a` / `--mfp-elev-a` / `--mfp-sunk-a` / `--mfp-bg-a` 四個 alpha token，黑白主題各一組；文字、接孔、旋鈕、線材、SEND 維持不透明）。角色頭部、HP 條、攻擊力數字在面板上方清楚可見，下半身透出
  - `mf-fight.js` 新增 wide 模式（畫布高 < 320 且寬 > 2 倍高）：HP 條維持在上方但縮窄到左右兩側（寬 26%），角色可高過 HP 條、用到地板減 30 px 的高度（844×390 約 194 px，原本被 HP 條壓到 144 px）；另保留 compact 模式（高 < 220）給更矮的畫布。狀態列（模式、雙方攻擊力）疊在場景上緣的透明一行，不佔高度
  - 首頁：標題與標語左，按鈕欄右；上方留 56 px 給語言／HUE 列。角色選擇：四格 2×2（預覽縮為 100 px）左，背景、START、BACK 右。KO：結果左，下載／再戰／首頁右
  - 其餘畫面（房號）維持置中；每個置中畫面內容包進 `.pane`，放得下就置中、放不下從頂端開始捲動
  - 說明頁：上方 60 px（原留給已刪除的問號鈕）改 16 px，開啟時暫時隱藏語言／HUE 列避免重疊
- 全螢幕：按 START（使用者手勢）時呼叫 Fullscreen API（`requestFullscreen` / `webkitRequestFullscreen`），HOME 時離開；不支援或被拒就維持原狀。另加 `apple-mobile-web-app-capable` 等 meta 與 `manifest.webmanifest`（display fullscreen），從主畫面開啟即全螢幕；說明頁三語加一段說明（含 Safari「AA → 隱藏工具列」的手動做法）。**iPhone Safari 不開放非影片元素的 Fullscreen API**（WebKit bug 212934 標 WONTFIX，2026-01 仍維持），iPhone 上只能靠加入主畫面或手動隱藏工具列；iPad 與桌機 Safari 可用
- 直式版面未動（390×844 量測與改前相同）
- 以無頭瀏覽器驗證 844×390、667×375、932×430、1180×820、390×844 全部畫面，含對戰中旋轉（線材保留、畫布重算）、白底主題；真實 iPhone Safari 的安全區、觸控與全螢幕未實機驗證

### Modular Fighters：新增角色 TATATA5 與 MAD，任一角色可站左右

- 角色由兩個增為四個：OSC、MODDICT、TATATA5、MAD。選角畫面改為兩排各兩格
- 新影片來源為 OSC兄弟提供的「MAD motion.mp4」「tatata5 motion.mp4」（2100×2100，0.67 s），轉成與原角色相同的 600×600、12fps、h264，放在 `modular-fighters/assets/`
- 站位規則改為：自己永遠在左、對手永遠在右（取代原本「選角決定左右、不鏡像」）
- 角色原圖面向與站位不同時，在去背階段水平鏡像，雙方永遠面對面；原圖面向記在 `mf-fight.js` 的角色表
- CPU 對手從其他三個角色隨機選；連線對戰兩人可選同一角色，各自看到自己在左，先前「同角色時 guest 自動換角」的提示機制移除
- 以無頭瀏覽器驗證四格顯示、左右站位、鏡像與影片載入；真實連線對戰未實機驗證
- commit `768c54d`、`192710f`

## 2026-10-16

### Visual Feedback Machine：新增第三種 Chaos 來源 Movement

- Chaos 來源切換由 Lorenz / Camera 兩段改為 Lorenz / Camera / Movement 三段（radio value `motion`）
- Movement 模式與 Camera 模式共用同一個相機串流與 `ContourChaosGenerator` 實例，只切換分析方式（`setMode('contour' | 'motion')`）；Camera ↔ Movement 互切不重新要相機權限
- 演算法：216×90 灰階後幀減前幀，像素差 > 24 視為移動。A = 移動像素加權重心的 X（左 -1 / 右 +1）、B = 重心 Y（上 -1 / 下 +1）、C = 移動像素占比 / 0.08 映射到 -1..+1（靜止 = -1）
- 平滑：位置僅在有移動時追（時間常數 0.08 s），靜止時保留上一個位置；移動量上升 0.05 s、衰減 0.25 s，與幀率無關
- 預覽：移動像素塗強調色、中央十字線、重心圓環（半徑隨移動量）、底部移動量橫條
- 三語說明（app 內 hover 說明、`js/i18n.js` 的 vfm desc / intro / features、visual-feedback-machine.html 的 zh fallback 與 meta description）同步更新
- 未實機測試瀏覽器與相機；演算法以 node 合成灰階幀驗證（左上/右下閃爍方塊、全幅閃爍、靜止衰減）結果正確


## 2026-10-09

### 新增 OSC Bounce

- software.html 在 MADO 下方新增 OSC Bounce 一列（平台 Web，`data-preview="oscbounce"`），預覽圖 `assets/images/software/OSC_Bounce_1.jpg`
- 新增 oscbounce.html 介紹頁：結構複製 mado.html，下載鈕改為 VFM 式「開啟應用程式」連到遊戲本體 `osc-bounce.html`（target _blank；遊戲網址未改，先前已分享）
- 影片：先放使用者提供的 iPhone 錄影轉成的本地 mp4，之後使用者上傳 YouTube Shorts（b0BiUNcxVzw），改回站內慣例的 YouTube iframe，mp4 已刪除；`.video-frame` 比例改為 960/1480 直式、最大寬 420px 置中
- 截圖四張 `OSC_Bounce_1..4.jpg`（JPEG，與其他作品的 PNG 不同格式）；hero 背景用第 4 張（場地內有角色與球），第 1 張空場地在 10% 透明度下幾乎看不到
- `js/i18n.js` 三語新增 `apps.oscbounce`（name / desc / platform / launch / intro / copyright / features 十條）。desc 依使用者指示縮為一句；intro 維持四段完整版
- 內容事實來源：OSC_Bounce 專案 DEVLOG 與遊戲內三語說明文字；角色插圖、手繪字、logo 為 OSC兄弟，程式為 MADZINE

### OSC兄弟網站連結

- oscbounce.html 技術資訊表新增一列「OSC兄弟 website」連到 https://oscbrothers.stores.jp/（target _blank，連結樣式同 artist-talk-translator 原始碼連結）
- 遊戲本體 osc-bounce.html 重建：玩法說明底部署名區新增「OSC兄弟網站：」一行（三語標籤在 ui.js，連結底線、顏色 fg-primary），來源為 Commercial/OSC_Bounce 以 build_single.py 重新產出的 dist/OSC_Bounce.html

## 2026-10-06

### VisionMod 頁：0.9.4 更新與 App Store 購買按鈕

- 新增「前往 App Store」按鈕（連到 `https://apps.apple.com/app/id6815474193`），放在縮圖列下方，位置與 HONKI 頁相同
- 按鈕初次推上去顯示為一般文字連結：`.launch-btn` 的 CSS 在每頁都是行內定義，VisionMod 頁沒有這段。修法為從 honki.html 複製同一段樣式；之後各頁若再加此按鈕，要記得連樣式一起帶
- `js/i18n.js` `apps.visionmod` 三語敘述改為 0.9.4（新增 Chromascope 八層、12 個內建 WGSL 外掛、8 軌音訊、大視窗格線）；新增 `appstore` 鍵
- 移除所有「Microsoft Store」字樣（Windows 版尚未上架，不寫無事實的內容）；crossplatform 改為「Mac App Store 上架，macOS 與 Windows 共用同一份程式碼」
- 縮圖換 0.9.4 新截圖，新增 chromascope 與 plugin 兩張；signal / modulation 仍為舊圖，待補
- 手冊換 `assets/manuals/visionmod/VisionMOD_Manual_0.9.4_{en,zh-Hant,ja}.html`，舊 0.9.2 檔刪除
- 線上 `madzine.work` 已驗證更新；使用者端看不到時為瀏覽器快取，強制重新整理即可

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
