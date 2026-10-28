# MADZINE Website 開發紀錄

## 2026-10-28

### HONKI 頁嵌入 YouTube 介紹影片

- `honki.html` 右欄最上方加 16:9 YouTube iframe（KbNffVZgaTQ，教學影片），樣式與 iframe 參數自 visionmod.html 的 `.video-frame` 複製（本頁行內 CSS）；截圖、App Store 按鈕、手冊、技術資訊位置不變

### Open Call 報名截止延至 11/10

- 使用者裁示報名期間改為 2026/10/20 – 11/10（原 11/1）。改動 9 處：`js/i18n.js` 三語 `opencall.facts.period.value` 與 `opencall.s3.body` 報名期間列、`open-call.html` 的 zh fallback 兩處與 `<meta name="description">`
- 結果公布 11/16 未動；Patreon 原文與 Google 表單上的日期需使用者自行同步

### Modular Fighters v1.2.3：角色登記系統（名冊資料檔、慣用模組、特殊能力、邀請頁、審核頁）

- 使用者要讓日本朋友登記自己的角色（慣用模組、特殊能力、專用模組），也要有一套東西發給現有六位角色本人。設計拍板：登記走自家頁面寫 Firebase、素材另外用 LINE／email 給 MADZINE 人工轉檔；特殊能力與慣用模組**不公開**（10-25 隱藏規則維持）；慣用模組最多三種每種保證出現一個；邀請頁日文優先；六位全部發
- **名冊改成資料**：新檔 `mf-characters.js`（`MF_CHARACTERS` 六筆 + `MF_SPECIALS` 五種能力三語標籤 + `MF_SPECIAL_RULES` 數值）。`index.html` 選角格改為啟動時從名冊生成（格子下方多一行能力＋慣用模組，跟語言切換）；`mf-fight.js` 的 CHARS 從名冊建，`src` 為 .png 時走 `Image`、只去背一次、沿用既有的上下浮動；`CHAR_POWER` 刪除，改讀 `special === 'power'`
- **慣用模組**：`MFAudio.randomModules(n, guarantee)` 先把保證的型別放進隨機位置，VCO／LPF-or-MIXVCA 規則只動剩餘位置；CPU 對手也拿自己角色的慣用模組（`cpu.start(cb, {guarantee})`）
- **特殊能力**：power ×1.3（原 HATAKEN 隱藏規則改為資料欄位；v1.2.3 一度顯示在選角格，**v1.2.4 依使用者裁示全部角色特徵一律不公開**，選角格只有圖和名字，玩家從發牌自己察覺慣用模組；邀請頁對本人說明「特殊能力與慣用模組在遊戲內不顯示」）、fav2 慣用模組各兩個、hp120（`MFFight.setMaxHp` 每側獨立，在 `applySetup` 內 `reset()` 之前設）、auto6（`MFPatchUI.setAutoLockMs`）、deal11（本場第一次 SEND 之後每組 11 個，`sentThisMatch` 旗標）
- **`invite.html`**：`?char=<id>` 是給既有角色本人的邀請（角色動畫＋名字、慣用模組九張卡＋真的遊戲面板可以摸、特殊能力單選、專用模組設計：名稱／基礎模組／接孔旋鈕數／描述／草圖拍照上傳，前端縮到 900px JPEG、超過約 380KB 自動降畫質）；不帶參數是新角色登記（多角色名、署名、面向）。日文預設，可切中英。送出寫 `mf/submissions`（append-only），無 Google 表單
- **`review.html`**：列出提交（預設每角色最新一筆、舊的淡化），草圖預覽，「複製角色設定」產生可直接貼進 `mf-characters.js` 的一行；新角色有「素材已收到」勾選（只存本機）。`firebase.rules.json` 加 `submissions` 節點（只能新增不能改、欄位長度驗證），**需要重新到 Firebase 主控台貼一次規則**
- `INVITE_LINKS.md`：六位的專屬連結、新角色連結、審核頁網址、日文轉發短文、收件後的落地步驟。說明頁加「登記自己的角色」連結
- 驗證：node 單測發牌 300 次（保證型別必在、重複型別數量正確、VCO 規則維持）；無頭：名冊生成 10 格含標題行、TESTO（fav2）每種慣用模組 ≥2、HPGUY 血量 120、AUTOGUY 鎖定剩 5.1 秒、DEALGUY 首組 10 送出後 11、HATAKEN 原始 20 → 26、日文切換標題行變「攻撃力 ×1.3」；邀請頁：日文載入、九個模組面板、第四個慣用模組被拒、草圖 1600×1200 PNG → 12KB JPEG、送出內容欄位正確、新角色模式缺名字被擋、390 寬無橫向溢出；`final.mjs` 橫向五尺寸、`online.mjs` 線上流程皆零錯誤。**實機與真 Firebase 寫入未測**

## 2026-10-27

### Modular Fighters v1.2.2：接線卡住／殘影線治本

- 使用者：遊戲常玩到一半不能接線，或留一條線的殘影。根因在 `mf-patch-ui.js` 拉線的結束監聽掛在**起點接孔元素**上（pointerup / pointercancel 都在 `srcEl`），而 SEND 之後 `freshModules()` → `setModules()` → `rebuild()` 會把整排模組重建；手指還按著線時接孔被移除，瀏覽器不會把 pointerup 送給已不在 DOM 的元素，`drag` 永遠不歸零：之後 `onJackDown` 一律 `return`（不能再接線），虛線 `tempPath` 留在 SVG（殘影），`redraw` 每幀又去查已不存在的接孔。修法：(1) 三個監聽改掛 `window` capture phase、以 pointerId 比對，不依附接孔存活；(2) `rebuild()` 開頭 `abortDrag()`；(3) `updateTemp` 找不到起點接孔就 abort；(4) 同一個 pointerId 再次按下視為上一筆已結束，自我修復；(5) 保險：最後一根手指離開（`touchend` / `touchcancel` 且 `touches` 為 0）、`blur`、分頁隱藏都結束手上的線
- 驗證：`scratchpad/stuckdrag.mjs`（CDP 觸控）：正常拉線 1 條；拉線中呼叫 `setModules` 重建後 temp 0 / dragging 0，放手後可再接新線；`final.mjs` 五種橫向尺寸線端誤差 0、零錯誤
- 同日使用者回報：完整 `firebase.rules.json` 已從電腦貼上發布（`mf/leaderboard.json` 可讀、其他路徑 Permission denied），且排行榜已有 MADZINE 1 勝 / TEST 1 敗兩筆（同一場的雙方回報），代表 v1.2.1 的隨機對戰整條含 PeerJS 連線與 KO 回報**已在兩台手機實測通過**

### Modular Fighters v1.2.1：隨機對戰房間畫面去掉房號、連線階段與逾時

- 使用者 v1.2.0 實機：雙方都跳提示並接受，但畫面停在房間編號不開打。隨機對戰本來就不該讓玩家看到房號（房號是手動房間模式的東西），`startOnlineMatch` 改走 `roomScreenMode(true)`：標題「對手」、大字顯示對手名字、下方一行連線階段（連線中 / 對手已連線 / 對手已就緒），手動建房與加入維持房號顯示
- 停住的真因還不知道（PeerJS 資料通道沒建立、或 hello 沒到）。這一版先讓它不會卡死：房主端若對手早已接上（`MFNet.connected`）直接送 hello；加入端 `joinOnline` 失敗自動重試最多 3 次（房主的房間一直開著，重試有意義），`onNet` 的 error 分支在線上加入中不再搶先回首頁；整個握手 40 秒內沒完成兩邊都回首頁顯示「連不上對手」。階段文字就是下次實機回報用的診斷線索
- 驗證：無頭流程新增房主等待狀態（房號隱藏、顯示 Alpha、CONNECTING）與加入端第一次失敗第二次成功（join 被呼叫兩次、進入對戰、狀態列顯示 Beta），零錯誤。**兩台手機之間的 PeerJS 連線（含原本的手動房號模式）至今沒有實機驗證成功過**，這是下一個要釐清的點

### Modular Fighters v1.2.0：配對握手順序治本、名字每次都問

- 使用者兩台實機第一次測：一方看到「找到對手」並按對戰，另一方完全沒收到提示。根因在 `mf-online.js` 的 `pair()` 順序：最早的玩家先用 transaction 搶第二位的 `match` 欄位，**之後**才寫 `mf/matches/<mid>` 記錄。第二位的自身條目監聽在 `match` 一落地就去讀記錄，讀到空的就當配對已死、把自己的 `match` 清掉回到等待，於是永遠不會跳提示；第一位則卡在「等待對方確認」。修法：記錄先寫、再搶人、搶輸就刪記錄；`openMatch` 讀不到記錄改為每 1.5 秒重試 4 次才放棄；讀到已有 `declined` 的記錄直接回等待不跳提示
- 模擬時順便找到兩個相鄰問題一起修：(1) 搶到第二位後、自己還沒標記前，隊伍監聽會再觸發，第一位會再去搶第三位，第三位先看到提示又立刻被取消，加 `pairing` 旗標一次只允許一筆配對進行中；(2) 拒絕者立刻刪掉記錄，對方若還沒開始讀就只讀到空的，改為 6 秒後才刪
- 驗證：寫了記憶體版 Firebase 伺服器模擬（`scratchpad/fb/sim.mjs`，支援 set / update / transaction / on / once / onDisconnect，每個 client 自己的延遲），跑兩份真的 `mf-online.js`。舊版在對等延遲與第二位較快的情況重現使用者症狀，新版在三組延遲 × 接受／拒絕再排隊／三人同時排隊全部通過。**兩台實機尚未重測**
- 名字：原本輸入過一次就不再問。使用者要每次都確認，改為每次按「隨機對戰」都開名字視窗（預填上次名字）；說明文字加一句「換一個名字就是從零開始的新紀錄」（排行榜以名字為 key，本來就如此）
- 規則現況：手機上貼不了完整 `firebase.rules.json`，使用者先把預設兩個 `false` 改 `true` 發布（整庫全開、無格式檢查），有電腦時再貼完整規則

### Modular Fighters v1.1.9：填入 Firebase 資料庫網址

- 使用者在 Firebase 建好專案 `modular-fighters`、Realtime Database 在 asia-southeast1（RTDB 只有美國中部 / 比利時 / 新加坡三區可選，台灣只有 Firestore 才有）。`mf-firebase-config.js` 填入 `databaseURL` 與 `projectId`；apiKey / appId 留空，這個遊戲沒用 Firebase Auth，Realtime Database 只靠 databaseURL 就能初始化
- 本 session 網路政策擋 `firebasedatabase.app`，無法從這邊確認規則是否已 Publish；使用者開 `…/mf/leaderboard.json` 回 `null` 即為可讀，回 `Permission denied` 表示仍是 locked mode。兩台裝置的隨機對戰與排行榜實測待做

## 2026-10-26

### Modular Fighters v1.1.8：隨機對戰（排隊、自動配對、等候時打電腦）、玩家名稱、排行榜

- 使用者要四件事：與隨機玩家對戰（排隊、自動配對）、等候時可和電腦對戰、配到時詢問要不要跳出、玩家名稱與排行榜。前兩件需要共用的即時資料庫，GitHub 做不到（無即時狀態、網頁無法安全寫 repo），使用者拍板用 **Firebase Realtime Database**
- 新檔 `mf-online.js`（`window.MFOnline`）：Firebase compat SDK 10.14.1 第一次按「隨機對戰」才從 gstatic 載入，遊戲其他部分不依賴它。資料在 `mf/queue`（每個排隊者一筆，含自己 host 的 PeerJS 房號，斷線自動刪）、`mf/matches`（配對，含雙方接受狀態）、`mf/leaderboard`（名字 → 勝敗）。配對規則：所有排隊者都看隊伍，**最早的那一筆負責把自己和第二筆配成一組**（用 transaction 搶第二筆的 `match` 欄位，搶輸就等下一輪），雙方各得到「找到對手」事件，20 秒內接受或拒絕；都接受才開戰（a 當 PeerJS 房主、b 加入）；拒絕或逾時的人重新排到隊尾，另一方留在原位；對方斷線也算取消
- 流程（index.html）：首頁新增「隨機對戰」與「排行榜」一列。隨機對戰第一次會先問玩家名稱（存 localStorage，12 字內，說明頁可改），再走原本選角與背景，START 後**同時**開一場電腦戰並進隊伍（先 `MFNet.create` 開好房、再登記隊伍），狀態列顯示「排隊中」。配到時跳出提示「找到對手：名字，要離開目前這場嗎？」，「對戰」＝接受（提示改成等待對方確認）、「繼續打電腦」＝拒絕。雙方接受後：停掉電腦戰、進房間畫面，房主等對方加入、對方加入房間，之後走原本的 hello 流程；hello 多帶 `name`，HP 條（`MFFight.setNames`）與狀態列顯示對方名字。KO 時各自把勝敗寫進排行榜（只有隨機對戰計分），KO 畫面多一顆「排行榜」。HOME 離開隊伍
- 排行榜畫面：前 50 名，勝場排序、同勝場看勝率，自己那列用強調色框；首頁與 KO 畫面都有入口
- 新檔 `mf-firebase-config.js`（設定值待使用者從 Firebase 主控台貼入，空值時「隨機對戰」顯示「線上功能尚未設定」）與 `firebase.rules.json`（讀寫規則與欄位格式驗證）。沒有登入機制：名字不驗證身分，同名共用戰績
- 三語新增 23 個字串；手機直式首頁高度實測未超出 844；橫向首頁格數改 7 列
- 驗證：以假的 MFOnline／MFNet 跑完整流程（未設定提示、名字輸入、排隊狀態、配對提示、拒絕回隊、接受後等待、開戰、名字上 HP 條、KO 回報、排行榜列表、返回）零錯誤；全畫面五尺寸 sweep 零錯誤。**Firebase 真資料庫與兩台裝置實測尚未做**（本 session 網路擋 gstatic，且設定值未填）

## 2026-10-27

### Open Call 頁接上報名表單

- 使用者提供 Google 表單連結（去掉 `usp` / `pli` / `authuser` 參數後存 `…/viewform`）
- 重點五格下方新增置中「前往報名表單」按鈕（`.launch-btn`，樣式自 honki.html 複製，本頁行內 CSS；三語 `opencall.facts.apply`：前往報名表單 / Apply now / 応募フォームへ）
- 「三、報名方式」的「填寫線上表單，表單將於近期開放」三語改為連結文字 + 「Google 表單，另開新視窗」說明；`open-call.html` 的 zh fallback 同步
- 售票平台仍為「上架中」，待連結

## 2026-10-25

### Modular Fighters v1.1.5：HATAKEN 攻擊力 1.3 倍

- 使用者規則：HATAKEN 的攻擊力是一般的 1.3 倍。`index.html` 加 `CHAR_POWER = { hataken: 1.3 }`，在攻擊產生處套用：自己送出時 `fire()` 以 `charPower(myChar, score)`；CPU 對手走 `cpu.start` 的 callback 以 `charPower(foeChar, power)`（在難度倍率之後）；連線對手由對方端乘好再送來，收端不再乘。顯示的攻擊力、扣血（×0.5）、角色加速全部跟著乘後的值走
- 上限由 100 放寬到 130（`incoming` 的 clamp、`mf-fight.js` 新增 `MAX_POWER`，`attack` 與 `rateFor` 改用；加速仍封頂 3 倍）
- 驗證（無頭）：自己選 HATAKEN，AUTO 配線算分 20 → 狀態列 26、對手扣 13；自己選 OSC、CPU 對手抽到 HATAKEN 時，原始分 26 × 難度 0.6 = 16 → 收到 21；對手非 HATAKEN 時 60 → 36 不乘
- 說明頁**不寫**這件事（v1.1.6 曾加一段三語說明，v1.1.7 依使用者裁示移除：倍率是隱藏設定，不讓玩家知道）

### Open Call 頁加入 HATAKEN / Masayoshi Sakaguchi 藝術家介紹與 YouTube 影片

- 位置：重點五格之後、「一、活動簡介」之前，獨立區塊「出演藝術家」，不佔用原辦法的一～九編號。每位：名字、身分一行、介紹、連結列、16:9 YouTube iframe（`loading="lazy"`，參數同站內 `.video-frame` 慣例）、影片說明
- **資料來源與限制**：本 session 網路政策擋 tfom.info / hataken.info / kfom.info / youtube.com（WebFetch 與 curl 皆 ENOTFOUND / 403），無法讀 Festival of Modular 官網原文。介紹依 WebSearch 回傳的 FoM 官網（tfom.info/hataken、tfom.info/masayoshi-sakaguchi-2025、kfom.info）、hataken.info、RA、MODULARHABIT 2026 頁面摘要改寫，三語為本次撰寫，**非官網逐字稿**。HATAKEN 現職寫「TFoM 共同創辦人」而非「主辦人」：FoM 2024 公告已將 TFoM / KFoM 名稱退役並由 Sakaguchi 總籌 FoM
- **影片為能查到的最近一支，非「最新」**：HATAKEN = `P5J1JC9RhE0`「HATAKEN at Modular Commune 24」（北京 2024-11）；Sakaguchi = `Z17ov9iTGGU`「Masayoshi Sakaguchi Live at NOON Osaka」（約 2020，搜尋查不到更新的公開影片；FoM 2025 SUPER DOMMUNE 直播存檔可能有但未能確認 ID）。影片 ID 來自搜尋結果標題，本機無法連 YouTube 驗證。換片只需改 `open-call.html` 兩個 iframe src 與三語 `opencall.artists.*.video` 說明
- 連結：HATAKEN → hataken.info / YouTube @KenHata / SoundCloud / X；Sakaguchi → tfom.info / RA / X
- 驗證：三語 key 解析、無頭 Chromium 1280 與 390（YouTube 以 route 截斷）無錯誤無溢出

### 軟體介紹頁手機版 hero 裁切治本（16 頁）

- 使用者 iPhone 截圖：modularfighters.html 標題「Modular」上緣被切掉、hero 背景截圖透在「Web」與日文說明文字底下
- 根因：16 個軟體介紹頁共用的 `.bg-hero { height: 50vh; overflow: hidden; align-items: flex-end }`，手機 Safari 可視高約 660px 時 hero 只有 330px，而內容（返回 + 兩行大標 + 標語 + 平台 + 說明）量到 366px，從上緣溢出 36px 被裁；文字區又剛好落在背景圖透出的位置。桌機 1280×800 hero 400px、內容 311–366px 不受影響
- 修法：各頁既有 `@media (max-width: 768px)` 區塊加 `.bg-hero { height: auto; min-height: 50vh; }`，hero 隨內容長高、背景圖與漸層跟著覆蓋整塊。不改字級、不改漸層。16 頁以腳本一次插入（anyani / artist-talk-translator / complexrhythmer / decapyramid / edgy / honki / jazzarchitect / mado / modularfighters / oscbounce / sessionguide / vav / visionmod / visual-feedback-machine / watchnext / work-mu）
- 驗證：無頭 Chromium 390×660、390×844、1280×800 三尺寸 × 16 頁日文深色，內容皆未超出 hero、無橫向溢出；桌機 hero 高度維持 50vh
- 本 session 網路政策擋 madzine.work，線上版本無法直接 curl 驗證，以 GitHub Actions 部署成功為準

### Open Call 頁加入海報與動態海報影片；手機版底部導覽治本

- 使用者提供三張海報（視覺 @xinhsin）與一支 4 秒動態海報影片。海報存 `assets/images/opencall/poster_1..3.jpg`（原尺寸 1144×1430 / 834×1040，JPEG q86 重壓）；影片原檔 720×900、150fps、無音軌，以 ffmpeg 轉 30fps h264 yuv420p faststart 存 `assets/video/opencall_poster.mp4`（615 KB），首幀另存 `poster_video_frame.jpg` 當 `<video poster>`
- `open-call.html` 標題下新增 hero 區：動態海報 `<video autoplay muted loop playsinline>`（最大寬 480px、4:5），下方三張海報縮圖（120×150，手機 96×120），點擊開 lightbox；lightbox 樣式與 `switchImage` / `openLightbox` / `closeLightbox` 沿用 visionmod.html 寫法，`js/main.js` 的 Lightbox 自動掛上前後鈕與方向鍵
- **手機版底部導覽一字一行治本**：各頁 `.bottom-bar` 為行內 CSS、`display:flex` 無 wrap，390px 寬下版權 + 五個導覽連結 + 語言鈕擠在一列，日文連結被壓成每字一行（使用者截圖的 research 頁即此症狀；加了 Open Call 後更糟）。修法為在共用 `css/style.css` 末尾加 `@media (max-width: 640px)`：`.bottom-bar` 與 `.bottom-bar__nav` 改 `flex-wrap: wrap`、連結 `white-space: nowrap`。各頁行內樣式沒設 wrap，共用規則直接生效，不必動 35 個頁面。量測 contact / research / software / works / open-call 五頁 390px 三語，連結高度全回到單行 24px，底部欄不再溢出
- 附帶發現（未修，非本次造成）：works.html 日文模式 390px 有一筆 `.works-v1__row-title` 過長溢出 16px
- 驗證：無頭 Chromium 影片自動播放（currentTime 推進、720×900）、lightbox 開關 / 方向鍵切換 / Esc 關閉、零 console error

### Open Call 頁換上 2026 Taiwan Tour 徵選辦法

- 內容來源：使用者貼上的 Patreon 貼文（post 171658751，10/7；本 session 網路政策擋 patreon.com，無法直接抓）
- `open-call.html` 重寫：標題 + 副標（活動全名）、頂部五格重點（巡演日期 / 名額 / 報名期間 / 報名費 / 結果公布）、九段辦法（簡介、名額對象、報名方式、甄選、權益義務、場次地點、票券、聯絡、注意事項三小節）、底部企劃 / 視覺 IG / Patreon 原文連結。段落內文走 `data-i18n-html`（每段一個 title + 一個 body key），避免幾十個零碎 key
- `js/i18n.js` 三語 `opencall.*` 整塊重寫（facts / s1–s9 / credits），`section.opencall.desc` 改為「2026 Taiwan Tour 藝術家徵選」；英日文為本次翻譯
- **原文矛盾待使用者確認**：高雄場日期在「活動簡介」寫 2/27（六）、在「活動場次與地點」寫 2/26（五），兩者星期各自吻合。網站先統一採場地段的 2/26（五）。**2026-10-28 使用者確認：高雄演出為 2/26（五），網站現況正確；2/27 為高美館講座。**另原文「FoM 主辦人」與「TFoM 主辦人」混用，統一為 TFoM
- 報名表單（「近期開放」）與售票平台（「上架中」）尚無連結，之後補
- 驗證：三語 key 全部解析、無頭 Chromium 桌機 1280 與手機 390 無錯誤、無橫向溢出

### 新增第四個分頁 Open Call

- 新增 `open-call.html`（結構複製 contact.html：標題、目前狀態、洽詢 + 電子郵件）。目前文案為「尚無進行中的徵件」的占位內容，待使用者提供實際徵件主題、資格、截止日期後替換
- `index.html` 下半部由三欄改四欄，第四欄連到 Open Call；640px 以下維持直式堆疊
- 全站 35 個頁面的底部導覽列在「聯絡」後新增 Open Call 連結（research-jazzarchitect 三頁為寫死英文導覽，同步補 `Open Call`）
- `js/i18n.js` 三語新增 `nav.opencall`、`section.opencall.desc`、`opencall.*`（title / desc / status / inquiry）；標籤三語皆用 Open Call

## 2026-10-24

### Modular Fighters：新增角色 HATAKEN、Z_Hyper，官網入口頁

- 遊戲角色由四個增為六個（v1.1.3 → v1.1.4）：新增 HATAKEN、Z_Hyper，影片來源為下載資料夾的「HATAKEN motion.mp4」「z_Hyper motion.mp4」，轉 600×600 12fps h264 放 `modular-fighters/assets/`；兩者原圖皆面左。選角畫面兩欄三排
- 使用者裁示新增官網入口（推翻 2026-10-16「不做入口頁」）：新增 `modularfighters.html`（結構複製 oscbounce.html，無 YouTube 影片區塊，只有一張截圖），`software.html` 在 OSC Bounce 下方加一列，`js/i18n.js` 三語新增 `apps.modularfighters`
- 預覽圖 `assets/images/software/Modular_Fighters_1.jpg`：無頭 Chrome 截遊戲首頁，960×1483 與 OSC_Bounce_1.jpg 同尺寸

## 2026-10-22

### Modular Fighters v1.1.1：橫向版面定案、iPhone Safari 三個實機問題

整天與使用者在 iPhone 13 mini 實機來回，橫向版面改了五次才定案。下面只記最終狀態與決策理由，中途撤回的做法在「過程」一段。

**最終版面（短橫向：landscape 且高度 ≤ 620px）**
- 角色畫布整個螢幕高；面板（240px 模組列 + 捲動桿 = 284px）絕對定位在底部、底板半透明（模組 55%、機箱 25%、凹陷區 40%、接孔中心 85%，黑白主題各一組 alpha token；文字、接孔、旋鈕、線材、SEND 不透明）。HP 條與狀態列留在面板上方沒被蓋住的帶子裡（`MFFight.setBand(px)`，index.html 以 `ResizeObserver` 盯面板上緣餵入），角色站在螢幕底部、從模組後面透出。帶子 91px（812×375）時 compact 模式：HP 條在左右兩側；帶子 < 72px 時只畫 HP 條在中段、名字和數字寫在條內。
- 模組一橫排跨滿版寬（使用者裁示不做左右分區）；AUTO／SEND／OUT 改直欄放在列右端，寬 92px，OUT 的 L 上 R 下。
- 高度不夠時（Safari 工具列佔位約 300px，或頁面被放大）：`MFPatchUI.setScale(s)` 以 `(innerHeight − 32 − 44 − 安全區) / 240` 縮小模組列與右欄（0.5–1），**用 `transform: scale` 加負 margin 補償排版，禁用 CSS `zoom`**（見下）。812×314 為 0.99、812×300 為 0.93、677×262 為 0.78。
- 首頁、角色選擇、KO 覆蓋層為兩欄；其餘畫面置中、放不下從頂端捲動（`.pane` + flex auto margin）。
- iPad 橫向（高 > 620px）與桌機維持原本直式堆疊，直式手機版面只動了 footer（下）。

**直式手機（寬 ≤ 500px）**
- AUTO／SEND／OUT 列 78 → 51px：按鈕 40px、字 18px，OUT 接孔 40px、標籤 L／R 放接孔右側。使用者要求 −40%，再低要砍接孔觸控區，停在 −35%。
- 模組列最小高度 200 → 240px：13 mini 在 Safari 內可視高約 660px，32dvh 只有 211px，VCO 的旋鈕被裁；240 是量過九種模組全部不裁的最小值。390×844 仍為 270px。
- OUT 接孔標籤全站改 L／R（配線圖 PNG 同步）；`.mfp-auto` 加 `min-width:min-content`，AUTO 倒數不再被 flex 擠扁裁字（真因：overflow:hidden 的 flex item 最小寬為 0）。

**iPhone Safari 三個實機問題（都是真因，記下來）**
1. **CSS `zoom` 的點擊座標會歪**：橫向用 `zoom` 縮模組列時，按 AUTO 變成 SEND、拉不出線，且時好時壞。改 `transform` 後消失。全站禁用 `zoom`。
2. **螢幕最上緣約 24px 的點擊 Safari 留給自己**（叫回工具列／捲到頂），直式橫向都一樣。44px 的語言鈕從 8px 起算，上半部按了沒反應。語言／HUE 列、HUE 彈窗、首頁與說明頁上方留白全部下移到 28px 起。
3. **Safari 快取舊 css／js**：部署成功但手機看到舊版。本地 css／js 連結加 `?v=` 版本字串，每次改檔要換。

**其他**
- 從使用者截圖量到 Safari 頁面縮放約 120%（模組寬、狀態列高、接孔直徑皆 1.2 倍），可視區因此只剩約 677×262；已請使用者調回 100%，版面也已能在該尺寸下成立。
- 全螢幕：START 呼叫 Fullscreen API、HOME 離開；狀態列加 FULL SCREEN 鈕（有 API 且非全螢幕時顯示，iPad 往下滑退出後可按回去）；對戰畫面 `touchmove` 攔下不交給瀏覽器。**iPhone Safari 不開放網頁全螢幕**（WebKit bug 212934 WONTFIX），只能加入主畫面（已加 manifest 與 apple-mobile-web-app 標記）或 AA → 隱藏工具列；說明頁三語寫明。
- 首頁標語下顯示版本號 `MF_VERSION`；**使用者規則：每次推送 +0.0.1**，與 `?v=` 一起改。
- 日文「むずかしい」在 375 寬折兩行：ja 的難度鈕字 17px、無字距、不換行。

**過程（已撤回，勿再走）**
- 左右分區（角色左、面板右）：使用者否決。
- 整個模組列縮 60%（直式與橫向）：實機太小，撤回。
- 面板不透明、不重疊：使用者要角色在半透明模組後面，撤回。
- 用 `zoom` 做縮放：觸控歪掉，改 transform。

**驗證**：無頭 Chromium（角色影片轉 VP9 餵入）量測 390×844、375×660、320×560、812×375、812×314、812×300、677×262、1180×820：線端與接孔誤差 0、旋鈕拖曳與拉線正常、AUTO／SEND 點擊各命中自己、footer 不溢出、零錯誤。實機由使用者在 13 mini 驗證：橫向觸控、語言鈕、L／R、版本號皆回報正常。

commit：`31daf78`…`6dfc2c9`（17 筆，見 git log）。

## 2026-10-21

### Modular Fighters：橫向也能顯示 + 全螢幕（當日版本，隔日大改，見上）

- 原本只有直式版面：整頁 `overflow:hidden` 加垂直置中、模組列固定高度。手機橫拿時首頁標題與角色選擇被裁掉，對戰畫面角色區只剩 36px，KO 畫面溢出
- 新增「短橫向」版面 `(orientation: landscape) and (max-height: 620px)`；模組列 240px（量測九種模組不裁的最小值）；AUTO／SEND／OUT 改直欄；使用者看過四張模擬圖選定「面板半透明疊在角色上」；`mf-fight.js` 加 wide／compact 模式；首頁、角色選擇、KO 兩欄；`.pane` 置中或捲動
- 全螢幕 API 接法與 manifest 同上一段

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
open-call.html          Open Call（徵件公告）
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
