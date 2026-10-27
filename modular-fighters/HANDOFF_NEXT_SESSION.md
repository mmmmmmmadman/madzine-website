# Modular Fighters — 開發紀錄與下一輪引言（2026-10-22）

## 工作目錄與部署
- 專案：`/Users/madzine/MADZINE/Documents/madzine-website/modular-fighters/`
- 純靜態（HTML/CSS/JS，無建置）。push 到 `main` 即 GitHub Pages 自動部署。
- 上線網址：https://madzine.work/modular-fighters/
- 使用者裁示：**不做入口頁面、不加進作品列表**，只靠網址進入。
- 瀏覽器看不到更新時 `Cmd + Shift + R`。

## 必讀文件（絕對路徑）
- `/Users/madzine/MADZINE/Documents/madzine-website/modular-fighters/SPEC.md` — 各檔共用契約（資料模型、全域 API、流程、Round 4 附錄、音色說明）
- `/Users/madzine/MADZINE/Documents/madzine-website/CLAUDE.md` 與 `DEVLOG.md` — 官網規則（token、三語、部署）
- 本檔

## 檔案分工（平行派 agent 時一檔一人）
- `index.html`：外殼、流程、三語 i18n、主題、說明頁、首頁列（語言＋HUE）、錄音與 MP3 下載、KO 畫面與配線圖下載
- `mf-audio.js`：`window.MFAudio` Web Audio 引擎（模組、算分、preview、錄音、MP3 編碼 lamejs 1.2.1 cdnjs SRI）
- `mf-patch-ui.js` + `mf-patch-ui.css`：`window.MFPatchUI` 模組面板（旋鈕、接線、SEQ5、DRAW、示波器、AUTO 鎖定、滑桿、多點、配線圖 PNG）
- `mf-fight.js`：`window.MFFight` 上半場（角色影片、HP、攻擊動畫、CPU 對手與閒置攻擊、KO）
- `mf-net.js`：`window.MFNet` PeerJS 1.5.4 房間碼（前綴 mf-、4 碼、2 人、host 權威）
- `mf-online.js`：`window.MFOnline` Firebase Realtime Database（隨機對戰排隊、自動配對、排行榜；SDK 第一次用才載入）。設定在 `mf-firebase-config.js`（`databaseURL` 空＝線上功能關閉），資料庫規則在 `firebase.rules.json`
- 角色六個（2026-10-24）：osc、tatata5 原圖面右；moddict、mad、hataken、zhyper 原圖面左。**任一角色可站左或右**：自己永遠左、對手永遠右；原圖面向與站位不同時在去背階段水平鏡像（2026-10-21 使用者裁示，取代舊「不鏡像、選角決定左右」）。CPU 對手＝其他五個隨機；連線兩人可選同角色。來源是下載資料夾的「X motion.mp4」2100×2100，轉 600×600 12fps h264

## 目前狀態（全部已 commit 並 push）
- 版本 v1.2.1（2026-10-27 隨機對戰房間畫面不顯示房號、改顯示對手名與連線階段，加入方重試 3 次、整體 40 秒逾時回首頁；v1.2.0 配對握手順序治本：match 記錄先寫再搶對方；名字每次都問；2026-10-27 填入 Firebase databaseURL；2026-10-26 隨機對戰＋玩家名稱＋排行榜；2026-10-25 HATAKEN 攻擊力 1.3 倍，**隱藏設定、說明頁不寫**；2026-10-24 加 HATAKEN、Z_Hyper 兩角色，共六個）。最新 commit 見 git log：2026-10-22 橫向版面定案與 iPhone Safari 三個實機問題（`31daf78`…），2026-10-21 四角色＋鏡像（`768c54d`、`192710f`），更早見 DEVLOG。
- 工作樹乾淨。

## 已落地的使用者需求（全部保留，禁改）
1. 直式畫面；上方兩角色＋HP；下方隨機模組一橫排（270px 高，最小 240px）。**橫向（landscape 且高 ≤ 620px）**：角色畫布整個螢幕高，半透明面板疊在下半（使用者裁示：模組一橫排跨滿版寬、不做左右分區、角色要在半透明模組後面），HP 條與狀態列在面板上方的帶子裡（`MFFight.setBand`），AUTO／SEND／OUT 直欄 92px 在列右端，高度不夠時以 `MFPatchUI.setScale`（transform）縮小；詳 DEVLOG 2026-10-22。
2. 模組：VCO（可切 LFO、可觸發切換、FM 直流耦合指數式）、MIX VCA（四路、音量可 CV）、LPF、FOLD、立體聲 DELAY、ADSR、AR、SEQ5（直向 fader 一指橫掃、內建 clock）、DRAW（內建 clock）。
3. 角色：六個任選，自己永遠左、對手永遠右，需要時鏡像（2026-10-21）；背景可匯入照片／影片。
4. 攻擊力高 → 角色影片加速（1 到 3 倍），直到下一次送出；對手只在送出那一次扣血。
5. 說明頁三語（中／英／日）、WHITE／BLACK 主題（預設 BLACK），署名 OSC兄弟（連結 https://oscbrothers.stores.jp/）＋ Programming: MADZINE。右上角問號已刪，說明從首頁 HOW TO PLAY 進，主題切換在說明頁內。
6. 首頁右上：中／EN／日 ＋ HUE 色圈（含飽和度），角色、HP 條、線條跟著色相。
7. CPU：首頁選 EASY／NORMAL／HARD；永遠在使用者出招後 1.5–3 秒回擊；閒置 40／30／20 秒自動攻擊一次，任何一方出招後重新計時。
8. AUTO：新模組出現後 10 秒不能按，按鈕上有倒數動畫。
9. 配線時即可聽到自己聲音（preview）。
10. 除 SEQ 外參數全是旋鈕；ADSR／AR 有示波器；SEQ5／DRAW 有跑動動畫。
11. 孔徑放大 50%（33px，點擊區 48px）。2026-10-21 曾試整個模組列 `zoom:0.6`，使用者實機嫌太小，2026-10-22 撤回；**不要再縮模組**。直式手機 AUTO／SEND／OUT 列縮到 51px（OUT 接孔 40px、標籤在接孔右側），橫向右端直欄 92px。
12. KO 畫面可下載「我的配線」「對手配線」PNG（雙方最後一次送出的配線）。
13. 模組排下方橫向滑桿；模組上滑手指不捲動；多指可同時拖線、滑桿、轉旋鈕。
14. 音色：VCO 波形與 LPF 以 Soundfreak 實測資料重做（詳 SPEC.md），其他模組未動。
15. **扣血＝攻擊力 × 0.5**（2026-10-16，原本兩回合就結束）。顯示的攻擊力、加速、算分不變。
16. **HATAKEN 攻擊力 1.3 倍**（2026-10-25）：`index.html` 的 `CHAR_POWER` 表，在攻擊產生處乘（自己 `fire()`、CPU callback、連線由發送端乘）；攻擊力上限 130（`MAX_POWER`）。要給別的角色倍率就加進同一張表。**倍率是隱藏設定，說明頁與任何玩家看得到的地方都不寫。**

## 算分規則（使用者已拿到中文與日文版）
接不到 OUT 為 0；否則可達模組 ×6 ＋ 直接進 OUT 的線 ×4 ＋ 進可達模組的調變線 ×8，上限 100。AUTO 約 14–20。

## 下一輪任務（使用者 2026-10-16 裁示）
**把設計更新成 OSC兄弟的圖。**
- 使用者尚未提供圖檔或說明具體範圍（整體視覺？模組面板？角色？UI 元件？）。開工第一步：先請使用者給 OSC兄弟的圖與要套用的範圍，再動手。
- 視覺／佈局決策必派 `software-layout` agent；配色派 `color-design`。
- 不要改動上列 15 項已落地行為；只換外觀。
- 參考既有 token 與主題切換（WHITE／BLACK）與 HUE 色圈，新圖要能在兩個主題下成立，或由使用者裁示是否保留 HUE。

## 未驗證項目（全部只在無頭瀏覽器測過）
- 真實兩台裝置連線對戰；隨機對戰 v1.1.9 實機第一次測到「一方看到提示、另一方沒看到」（握手順序 bug，v1.2.0 治本，以記憶體假 Firebase 伺服器模擬三種延遲 × 接受／拒絕／三人 全過），v1.2.0 實機重測：雙方都收到提示並接受，但停在房間畫面（PeerJS 連線未建立或 hello 未到）；v1.2.1 加了階段顯示與逾時，**兩台實機 PeerJS 連線（含手動房號模式）從未驗證成功過**，下一步看停在哪個階段
- 真實 iPhone／iPad Safari：多點、安全區、加入主畫面後的全螢幕、iPad 往下滑退出全螢幕是否已被擋住。13 mini 上的橫向觸控、語言鈕、直式 footer 已由使用者實機確認
- 真實相機／相簿匯入背景
- 分頁隱藏時 CPU 閒置攻擊的跳過策略
- 新音色的實際聽感、即時播放的 CPU 負載
- reduced-motion 下的視覺

## 測試方法（開機驗證）
- 無頭瀏覽器：`~/Library/Caches/ms-playwright/chromium_headless_shell-1248`，從 Node 以 DevTools 協定操作。
- 網站根目錄起 server：`python3 -m http.server 8781`（在 madzine-website 目錄）。
- 2026-10-22 的版面測試是在雲端 session 用 Playwright 跑（`shoot.mjs` 全畫面五尺寸、`final.mjs` 橫向多尺寸、`zoom.mjs` 直式線端／旋鈕／拉線、`scaletest.mjs` 縮放後線端／旋鈕／拉線／AUTO 與 SEND 命中、`home2.mjs` 語言鈕與版本號；角色 mp4 用 ffmpeg 轉 VP9 以 route 餵入，因無頭 Chromium 沒有 h264），腳本不在 repo，**要重寫就照 SPEC 的 API**
- 更早的引擎測試腳本在 Mac 的 session scratchpad（`/private/tmp/claude-501/-Users-madzine/d4051934-7722-4a2a-87f6-4df4805f8dc3/scratchpad/`，**可能已清空**）：`run.mjs`（引擎 33 項）、`run-preview.mjs`（21 項）、`vca-run.mjs`（15 項）、`mf-mp3-page.mjs`（整頁打到 KO 兩次＋MP3 檢查）、`mf-multitouch-test.mjs`、`mf-cpu-test.mjs`、`mf-hue-test.mjs`。若已清空，依 SPEC.md 的 API 重寫。
- 禁止啟動 GUI app 或截圖使用者螢幕；使用者在桌面瀏覽器自己玩。

## 線上功能的 Firebase 設定（2026-10-26 新增；2026-10-27 已填 `databaseURL`（專案 `modular-fighters`、asia-southeast1），規則已發布但目前是**臨時全開**（`.read`/`.write` 皆 true，手機上貼不了完整規則），有電腦時把 `firebase.rules.json` 貼回去；雲端 session 網路擋 firebasedatabase.app 無法從這邊驗）
1. https://console.firebase.google.com 建專案（Analytics 可關）。
2. 左側「Build → Realtime Database → Create database」，地區選近的（asia-southeast1），安全模式先選 locked mode。
3. 進該資料庫的「Rules」分頁，把 `modular-fighters/firebase.rules.json` 的內容整個貼上、Publish。
4. 「Project settings（齒輪）→ Your apps → 新增 Web app（</>）」，不勾 Hosting，註冊後會顯示 `firebaseConfig`，只需要 `databaseURL`（已填）；apiKey / appId 只有加 Auth 或 Analytics 才用得到，可留空。
   - Realtime Database 只有 us-central1 / europe-west1 / asia-southeast1 三區，沒有台灣（asia-east1 是 Firestore 才有），所以選新加坡。
   - 規則有沒有生效的快速檢查：瀏覽器開 `https://modular-fighters-default-rtdb.asia-southeast1.firebasedatabase.app/mf/leaderboard.json`，回 `null` 代表規則已 Publish 可讀；回 `Permission denied` 代表還是 locked mode，要再貼一次規則。
5. push 後在兩台裝置各按「隨機對戰」實測；排行榜在首頁與 KO 畫面都有入口。
- 沒有登入機制：名字不驗證身分，同名共用一筆戰績；規則只擋格式。這個規模可接受，使用者已知。
- 排行榜只算隨機對戰的真人戰（勝場排序、同勝場看勝率）；房號對戰與電腦戰不計。

## 版本號（使用者規則 2026-10-22）
- 首頁標語下方顯示 `MF_VERSION`（index.html 兩處：`<p id="ver">` 的初始文字與 script 內常數）。**每一次推送都要 +0.0.1**，同時把 css／js 連結的 `?v=` 換新，否則 Safari 會沿用舊檔。
- 語言／HUE 列與其他貼頂元件離螢幕上緣至少 28px：iOS Safari 把最上緣的點擊留給自己。

## 強規則（摘自全域 CLAUDE.md）
- 回覆白話文、短句、不列檔名／函式名、不用表格。
- 使用者下指令就直接做，不再列清單確認；描述問題時才先列清單。
- 一問題一 agent 平行派；agent 回報先複核再交付。
- 沒事實說「不知道」。
- 禁 Unicode 裝飾符號；禁自動開啟產出檔。
- commit 訊息結尾 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`。
