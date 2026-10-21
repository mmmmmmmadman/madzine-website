# Modular Fighters — 開發紀錄與下一輪引言（2026-10-16）

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
- 角色四個（2026-10-21）：osc、tatata5 原圖面右；moddict、mad 原圖面左。**任一角色可站左或右**：自己永遠左、對手永遠右；原圖面向與站位不同時在去背階段水平鏡像（2026-10-21 使用者裁示，取代舊「不鏡像、選角決定左右」）。CPU 對手＝其他三個隨機；連線兩人可選同角色。來源是下載資料夾的「X motion.mp4」2100×2100，轉 600×600 12fps h264

## 目前狀態（全部已 commit 並 push）
- 最新 commit：見 git log（2026-10-21 四角色＋鏡像）、`768c54d`（加 TATATA5／MAD 角色，2026-10-21）、`4038a2d`（扣血減半）、`25de9f4`（Soundfreak 音色 + SPEC 附錄合併）、`b6ab791`、`774792b`、`cbc183d`、`1aaf0ae`、`3d40f0c`、`c21f909`
- 工作樹乾淨。

## 已落地的使用者需求（全部保留，禁改）
1. 直式畫面；上方兩角色＋HP；下方隨機模組一橫排（270px 高）；**橫向也能顯示（2026-10-21）**：landscape 且高度 ≤ 620px 時對戰仍上下堆疊、模組一橫排跨滿版寬（使用者裁示：**不做左右分區**），模組列 240px、AUTO／SEND／OUT 直欄在列右端；面板**不透明、在角色帶下方**（半透明重疊版 2026-10-22 撤回：使用者說背景干擾操作），角色帶拿剩餘高度、HP 條在兩側，狀態列疊在帶的上緣；OUT 標籤 L／R；首頁／選角／KO 改兩欄，其餘畫面可捲動；iPad 橫向與桌機維持直式堆疊；START 進全螢幕、HOME 離開，另有 manifest 與加入主畫面；patch 線；聲音複雜度＝攻擊力；接到 OUT 才有聲音並成為循環音樂；SEND 後模組溶解換新；AUTO 只配線不送出；房間碼連線；無對手時 CPU；己方＋敵方聲音同時播放；自己新聲音取代舊的；整場自動錄音，下載直接是 MP3（48 kHz 128 kbps）。
2. 模組：VCO（可切 LFO、可觸發切換、FM 直流耦合指數式）、MIX VCA（四路、音量可 CV）、LPF、FOLD、立體聲 DELAY、ADSR、AR、SEQ5（直向 fader 一指橫掃、內建 clock）、DRAW（內建 clock）。
3. 角色：四個任選，自己永遠左、對手永遠右，需要時鏡像（2026-10-21）；背景可匯入照片／影片。
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

## 算分規則（使用者已拿到中文與日文版）
接不到 OUT 為 0；否則可達模組 ×6 ＋ 直接進 OUT 的線 ×4 ＋ 進可達模組的調變線 ×8，上限 100。AUTO 約 14–20。

## 下一輪任務（使用者 2026-10-16 裁示）
**把設計更新成 OSC兄弟的圖。**
- 使用者尚未提供圖檔或說明具體範圍（整體視覺？模組面板？角色？UI 元件？）。開工第一步：先請使用者給 OSC兄弟的圖與要套用的範圍，再動手。
- 視覺／佈局決策必派 `software-layout` agent；配色派 `color-design`。
- 不要改動上列 15 項已落地行為；只換外觀。
- 參考既有 token 與主題切換（WHITE／BLACK）與 HUE 色圈，新圖要能在兩個主題下成立，或由使用者裁示是否保留 HUE。

## 未驗證項目（全部只在無頭瀏覽器測過）
- 真實兩台裝置連線對戰
- 真實 iPhone／iPad Safari 的觸控、多點、安全區（含 2026-10-21 橫向版面在瀏海機的左右安全區）
- 真實相機／相簿匯入背景
- 分頁隱藏時 CPU 閒置攻擊的跳過策略
- 新音色的實際聽感、即時播放的 CPU 負載
- reduced-motion 下的視覺

## 測試方法（開機驗證）
- 無頭瀏覽器：`~/Library/Caches/ms-playwright/chromium_headless_shell-1248`，從 Node 以 DevTools 協定操作。
- 網站根目錄起 server：`python3 -m http.server 8781`（在 madzine-website 目錄）。
- 測試腳本在 session scratchpad（`/private/tmp/claude-501/-Users-madzine/d4051934-7722-4a2a-87f6-4df4805f8dc3/scratchpad/`，**新 session 可能已清空**）：`run.mjs`（引擎 33 項）、`run-preview.mjs`（21 項）、`vca-run.mjs`（15 項）、`mf-mp3-page.mjs`（整頁打到 KO 兩次＋MP3 檢查）、`mf-multitouch-test.mjs`、`mf-cpu-test.mjs`、`mf-hue-test.mjs`。若已清空，依 SPEC.md 的 API 重寫。
- 禁止啟動 GUI app 或截圖使用者螢幕；使用者在桌面瀏覽器自己玩。

## 強規則（摘自全域 CLAUDE.md）
- 回覆白話文、短句、不列檔名／函式名、不用表格。
- 使用者下指令就直接做，不再列清單確認；描述問題時才先列清單。
- 一問題一 agent 平行派；agent 回報先複核再交付。
- 沒事實說「不知道」。
- 禁 Unicode 裝飾符號；禁自動開啟產出檔。
- commit 訊息結尾 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`。
