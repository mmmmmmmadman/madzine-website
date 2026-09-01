# Artist Talk Translator 開發紀錄

即時語音翻譯 Web 應用程式。ElevenLabs Scribe v2 Realtime（ASR）+ Claude API（翻譯）+ Cloudflare Worker（token proxy），純靜態 HTML + JS。

- 應用程式：[artist-talk-translator-app.html](artist-talk-translator-app.html)
- 介紹頁：[artist-talk-translator.html](artist-talk-translator.html)
- 原始碼：https://github.com/mmmmmmmadman/ArtistTalkTranslator（stub repo）
- 站點總紀錄：[DEVLOG.md](DEVLOG.md)

---

## 版本對照

| 版本 | 日期 | 主要變動 |
|------|------|---------|
| v3.0 | 2026-08-31 | Language C（一次翻譯成兩種語言）；模型升級到 Claude Opus 5 / Sonnet 5 |
| v2.9 | 2026-05-16 | 識別 server 端帳號層級 hard-fail（額度/帳單/認證），不再無限重連並出明確錯誤；reconnectAttempt reset 點從 onopen 改到首次 transcript |
| v2.8 | 2026-05-16 | 應用內 debug log 下載按鈕（非技術使用者一鍵取得診斷 log） |
| v2.7 | 2026-04-19 | 外接麥克風熱插拔修正（devicechange 監聽 + 重建 MediaStreamSource） |
| v2.6 | 2026-04-19 | 連續說話卡住修正（`commit_strategy` 切 manual + 客戶端 RMS VAD + 12s 時間上限） |
| v2.5 | 2026-04-19 | WebSocket 健康狀態機、自動重連、手動重連按鈕、連線狀態燈 |
| v2.4 | 2026-04-19 | 自動捲動至最新片段修正 |
| v2.3 | 2026-04-19 | 長時間 session 凍結修正、重複翻譯修正 |
| v2.2 | 2026-04-18 | Start Session 按鈕修復、Opus 4.7 model ID 更新 |
| v2.1 | 2026-04-17 | 擴充支援檔案格式與裝置 |
| v2.0 | 2026-04-13 | Web 版首次發布（macOS native app 改 Web） |

---

## 2026-08-31 — v3.0

### Language C：一次翻譯成兩種語言

原本是 Language A ↔ B 雙向：自動偵測講的是 A 或 B，翻成另一種。新增可選的 Language C，勾選後偵測輸入屬於三種語言中的哪一種，翻成其餘兩種。

| 面向 | 做法 |
|------|------|
| UI | Language B 下方一列 checkbox `langCEnable`，預設關閉；勾選才顯示 `langC` select（預設 zh-TW）。topbar 新增 `langCBtn` 指示器（綠 `#15803d`） |
| 資料層 | `getLang()` 支援 `'a'/'b'/'c'`；新增 `isLangCEnabled()` / `activeSides()` / `onLangCToggle()`；`mapElevenLangToSide()` 改為迴圈掃 `activeSides()` |
| 翻譯 | `translateWithClaude()` 分兩條 prompt 路徑。多語版列出三語與 `[EN]/[JA]/[ZH-TW]` tag 對照，要求「一行一語言」；單語版 prompt 與 v2.9 逐字相同 |
| 解析 | 新增 `parseTaggedTranslation()`，把 `[JA] …` 解析成 `[{label, text}]`。無任何已知 tag 時整段當單一無標籤區塊回傳 |
| 顯示 | `updateSegmentTranslation()` 接受陣列或字串。單一無標籤區塊走原本 `textContent` 路徑，其餘才建 `.tr-line` DOM（`.tr-lang` chip 沿用 `.badge` 視覺） |
| 驗證 | C 開啟時檢查三者 `code` 不重複（`errDupLang`），關閉時維持原本 A≠B（`errSameLang`） |
| i18n | 新增 `langCLabel` / `enableLangC` / `errDupLang`，en / zh-TW / ja 三區塊皆補；三語 help 內文同步更新 |

**C 關閉時保證零行為變化**：`activeSides()` 回 `['a','b']`、prompt 字串與原版逐字相同、回傳包成 `[{label:null, text:raw}]` 走單行 `textContent` 路徑不建任何 `.tr-line` 節點、驗證分支不變。

**未持久化**：`langA` / `langB` 從來就沒存進 localStorage，`langC` 與開關依同一原則也不存。每次載入固定回到 EN / JA / ZH-TW。

### 模型升級

| 舊 | 新 |
|----|----|
| `claude-opus-4-7` | `claude-opus-5` |
| `claude-sonnet-4-6` | `claude-sonnet-5` |
| `claude-haiku-4-5-20251001` | `claude-haiku-4-5`（移除多餘日期後綴） |

- 請求 body 抽成 `buildRequestBody()`。`EFFORT_MODELS = ['claude-opus-5', 'claude-sonnet-5']` 加送 `output_config: { effort: 'low' }` 降低即時翻譯延遲；Haiku 4.5 不在官方 effort 支援清單內，故不送。
- 回應改先檢查 `stop_reason === 'refusal'`（帶出 `stop_details.category`），再用 `content.find(b => b.type === 'text')` 取值，不再假設 `content[0]`——thinking block 會排在 text 前面。
- `MODEL_MIGRATION` 把舊 localStorage model ID 對應到新 ID，且只在該 option 存在時才套用，避免下拉變空值。
- 下拉預設仍是 Haiku（延遲最低）。

Commit：`fa56519`（Language C）、`048500b`（模型升級）。

### 待處理：三方審查發現的缺陷（尚未修）

三個範圍互斥的 agent 平行審查。以下即完整結論（原彙整檔在 session 暫存目錄，關機後不存在）。

主審原本提的五項，裁定結果：`max_tokens` 一項**部分成立**（機制成立、嚴重度誇大）、`stop_reason` 一項**成立**、標籤表一項**方向錯**、`swapLanguages` 一項**推翻**、`seg.translated` 一項**確認不是 bug**。

尚未修的實際缺陷：

| # | 嚴重度 | 問題 |
|---|--------|------|
| 1 | 高 | `parseTaggedTranslation` 的 `known` 表只收 `LANGUAGES[].short`。模型輸出別名 `[ZH]`/`[TW]`/`[CN]` 時 regex 有 match 但查表落空 → 落入 continuation 分支被黏進上一語言。實測 `[JA] こんにちは\n[ZH] 你好` → 兩語言擠同一行（`.translated` 無 `white-space: pre-wrap`） |
| 2 | 中 | 模型漏第二個 tag → 譯文掛在錯誤的語言標籤下，顯示**錯誤歸屬**而非缺漏 |
| 3 | 中 | 第一個 tag 同行前有說明文字（`Translations: [JA] …`）→ regex 錨在行首不 match 且 `cur` 為 null → 該語言譯文靜默消失 |
| 4 | 中 | `startSession()` 在切到 live 畫面**之後**才失敗（`audio-processor.js` 404、iOS autoplay 擋 `audioContext.resume()`）→ `showError` 寫進已隱藏的 `#setup`、`isRunning` 仍 true、ws 與 heartbeat 洩漏、`endedPanel` 已隱藏所以 Back to Setup 點不到 |
| 5 | 中低 | 模型加 markdown 粗體 `**[JA]**` → 走 fallback 單行路徑，兩語言同一行且標記全露出。程式註解宣稱「never leaves raw markers on screen」與實測相反 |
| 6 | 低〜中 | `zh-TW` 與 `zh-CN` 的 `elevenCode` 都是 `'zh'`，`mapElevenLangToSide` 取第一個命中 → 「英文＋繁中＋簡中」配置下 C 槽指示器永遠不亮。啟動驗證只比對 `code` 不比對 `elevenCode`。兩位審查者嚴重度判定不一致（低 vs 中），但都同意不影響譯文 |
| 7 | 低 | `.tr-text` 無 `overflow-wrap`，長網址撐爆 `.tr-line` 並把 `.tr-lang` chip 推出可視區 |
| 8 | 待實測 | `max_tokens: 1024` 未隨模型調整。官方文件確認 Opus 5 / Sonnet 5 預設開啟 thinking 且 thinking token 計入 `max_tokens`（hard cap），吃光時 `content` 可能完全沒有 text block（現行程式會丟 `empty response`，錯誤訊息誤導）。但官方未公佈任何 effort 等級的 thinking token 數字，實際會不會吃光需實測 `usage.output_tokens_details.thinking_tokens`。Language C 讓輸出加倍，headroom 再砍半。另 `stop_reason === 'max_tokens'` 完全未處理 |

第 1 項是唯一「模型只要偏離一點就必然發生、且畫面完全錯誤」的路徑。

確認乾淨（已查證，不必重驗）：XSS（翻譯路徑全走 `textContent`，`innerHTML` 只用於靜態 i18n 說明面板）、`known` 表 prototype 污染（regex 字元類不含底線）、`blocks.filter` 誤刪、`.pending`／紅字殘留、`.tr-lang` 字級被繼承覆蓋、`setLang()` 覆寫 topbar 短碼、`returnToSetup()` 的 `detectedLang` 殘留、`getLang()` 回 undefined、`MODEL_MIGRATION` 落回預設、`onLangCToggle()` 全域可及性、`output_config.effort` 語法位置。

**下一輪未執行**：三位審查者範圍互斥、彼此沒看過對方報告（除第 6 項外每項只有一人審過），且沒有任何一項打過真實 API 驗證。原訂由兩位資深程式設計師 + 一位「AI 寫程式常見錯誤」判斷專家讀 `ROUND1_FINDINGS.md` 互相交叉質詢，尚未執行。

---

## 2026-05-16 — v2.9

### Server hard-fail 識別 + healthy reset 時機修正

**Tenjinyama log 解讀**（v2.8 取得的 `att-debug-2026-05-15T23-44-32.txt`，83 秒共約 80 次循環）：

```
onopen (primary) → state → open → session_started → onclose code=1000
reason=insufficient_funds_initial_check clean=true → state → reconnecting
```

ElevenLabs server 接受 WebSocket 握手、回 `session_started`，**~300ms 後立刻關連線**，reason 永遠是 `insufficient_funds_initial_check` —— 帳號餘額不足。Client 端 token 拿得到、wss 握手沒問題、code=1000 clean=true 不是網路斷。**問題不在 software，在 ElevenLabs 帳號的 credit balance**。

**為什麼藝術家看到「黃燈閃不停」而不是紅燈**：v2.5 的 `scheduleReconnect` 邏輯在 `sock.onopen` 內 `reconnectAttempt = 0`（行 1179）。本 case 每次 onopen 後立刻 close，reset 已執行 → reconnectAttempt 永遠 0 → 永遠不會到 MAX_RECONNECT=6 → 永遠不出紅燈、永遠不出「Connection lost」訊息。藝術家以為 software 壞了，無法判斷是帳號問題。

**修正**：

| 面向 | 做法 |
|------|------|
| Hard-fail 識別 | `HARD_FAIL_REASON = /insufficient_funds\|quota_exceeded\|billing\|payment\|subscription\|account_disabled\|invalid_api_key\|unauthorized/i` |
| 觸發點 | `sock.onclose` 解析 `event.reason`，命中 pattern 即視為不可恢復 |
| 行為 | 立刻 `stopHeartbeat` + `clearTokenRefresh` + 清 reconnect timer + `setWsState('failed')` 紅燈 + `showLiveError(t('errHardFail'))` + **return，不再 scheduleReconnect** |
| 手動覆寫 | 使用者按「Reconnect」按鈕仍可 fresh retry（升級 plan 後可用），不擋死 |
| Reset 時機修正 | `reconnectAttempt = 0` 從 `sock.onopen` 移除 → 改到 `onmessage` 收到 `partial_transcript` / `committed_transcript_with_timestamps` 時 reset。理由：onopen 不代表 session 真的工作；只有實際收到 transcript 才是「真資料流動」的健康訊號 |
| i18n | 三語 `errHardFail` 訊息，明確說「ElevenLabs 帳號問題 — 可能餘額用完或未付款。請登入 elevenlabs.io → Usage / Subscription」 |

**為何不擋死 manual reconnect**：使用者升級 plan 後需要不重新 reload 也能立刻測試；強制鎖死會逼他刷新頁面、重新貼 API key、重新選語言。`triggerManualReconnect` 已 `reconnectAttempt = 0` + `reconnectInFlight = false`，是合適的 fresh-retry 入口。

**為何不光靠 reset 改點就好（也要加 hard-fail 識別）**：只改 reset，藝術家最多看到紅燈 + 「Connection lost. Press the Reconnect button...」，仍不知道是錢的問題。Hard-fail 訊息點明根因，省去客服往返。

**Tenjinyama 後續動作**：請藝術家登入 elevenlabs.io 確認 Usage，建議升級 Starter（$5/月）— Free 12 分鐘額度對 open studio / artist talk 顯然不夠。

**相關 commit**：即將推送

---

## 2026-05-16 — v2.8

### 應用內 debug log 下載（給非技術使用者）

**觸發**：天神山アートスタジオ 2026-05-15 報告 — open studio 之後翻譯軟體不再正常運作，連線燈一直閃黃燈，雖然麥克風有輸入但文字沒產出。

**為何不沿用「請打開 DevTools Console」**：使用此軟體的對象是藝術家、駐村工作室、座談主持人；要求他們在 Chrome/Safari 用 F12 / Cmd+Option+I 開 DevTools、切到 Console tab、過濾 `[WS]`、截圖回傳，門檻過高。實際結果是 MAD 永遠拿不到 log，只能憑遠端症狀猜根因。

**設計選擇**：把診斷工具內建到應用本身。藝術家點一個按鈕 → 自動下載 .txt → email 寄回。零技術門檻。

**實作**：

| 面向 | 做法 |
|------|------|
| Buffer | `debugLog[]` array，cap 500 筆，超過丟最舊 |
| 來源 1 | `wsLog()` 內加 `appendDebugLog('WS', args)` — 涵蓋全部 ws 狀態變化、token fetch、open-guard、onclose、heartbeat、reconnect |
| 來源 2 | `showLiveError()` 內加 `appendDebugLog('ERR', [msg])` — 涵蓋 server error msg、token refresh fail、mic switch fail |
| 序列化 | `Error` 抽 name+message、object JSON.stringify、其餘 String()；try/catch 包住避免循環引用炸掉 |
| 下載格式 | 純 `.txt`，檔名 `att-debug-YYYY-MM-DDTHH-MM-SS.txt`（冒號和點換成 dash 避免 Windows 檔名問題） |
| 檔頭 metadata | URL、navigator.userAgent、當前 wsState、reconnectAttempt、isRunning — 不靠藝術家口述環境 |
| UI 位置 | 標題列 reconnectBtn 旁的「Download Log / 下載 Log / Logダウンロード」常駐按鈕 |
| 樣式 | 中性灰 `#888`（與黃色 reconnect 區分），hover 變淡背景；mobile 同步縮小字級 |
| i18n | 三語完整（含 title hover 提示「Email it to MAD when reporting a problem」） |
| 觸發時機 | 不限 session 狀態，任何時候可下載 |

**為何不在 session 結束時自動下載**：使用者報告問題時可能正在 session 中；強制等到 stop 才能下載會讓「重現症狀 → 立刻取證」流程斷掉。

**為何 cap 500 筆**：典型 session 1-2 分鐘黃燈循環，wsLog 約每 1-3 秒一筆，500 筆覆蓋 8-25 分鐘觀察窗口，足夠涵蓋從 session 啟動到問題重現。

**Tenjinyama 案的待辦**：拿到藝術家寄回的 .txt 後依以下 log 樣式判定根因：

| log 樣式 | 根因 |
|----------|------|
| `Token fetch failed (4xx)` 反覆 | API key 認證 |
| `onclose code=1008/4xxx` 緊接 onopen | server 主動關（額度／plan／rate-limit） |
| `open-guard FIRED` 反覆 | 工作室防火牆擋 wss 握手 |
| `server error msg ... quota_exceeded/auth_error` | server 明確拒絕，msg 內含原因 |

**相關 commit**：832a8fc

---

## 2026-04-19 — v2.7

### 外接麥克風熱插拔導致連線燈卡黃燈修正

**症狀**：使用者啟動 session 後插入外接麥克風或藍牙耳機，連線狀態燈變成黃色一直不恢復，翻譯停止。

**根因**：
- 原 `mediaStream` 從 `getUserMedia({audio:true})` 取得時綁定當時的預設 input。
- macOS 切換預設 input（插外接麥、USB 耳機、藍牙）時，**舊 MediaStreamTrack `readyState` 多數情況仍為 `live`，`onended` 不觸發**；但實際上音訊已不再從新裝置進來，level meter 歸零。
- ElevenLabs 收不到 audio → server 最終關閉 ws → 觸發自動重連 → 新 ws 連上但仍用舊（無聲）stream → 又關 → 再重連 → 連線燈卡 `reconnecting`（黃）長達 61 秒後才耗盡變紅。

**修正**：透過 `navigator.mediaDevices.ondevicechange` 主動偵測裝置列表變化並即時替換 MediaStream。

| 面向 | 做法 |
|------|------|
| 偵測 | `navigator.mediaDevices.addEventListener('devicechange', onDeviceChange)`（session 啟動時掛載） |
| 防抖 | 500ms debounce（藍牙連線常連發 2-3 次事件） |
| 併發保護 | `deviceChangeInFlight` flag 避免重入 |
| 執行 | 重新 `getUserMedia({audio:true})` → 停舊 stream 所有 track → disconnect 舊 `MediaStreamAudioSourceNode` → 建新 source 並 connect 到現有 analyser + worklet |
| 保留 | AudioContext、AudioWorkletNode、WebSocket、token refresh、heartbeat 全部不動；翻譯不中斷 |
| 錯誤處理 | 失敗時顯示紅色 segment「Microphone switch failed: ...」 |
| 清理 | `stopSession` 移除 listener + 清 source reference + 清 debounce timer |
| 診斷 log | `[WS] devicechange: swapping mic stream / mic stream swapped OK / devicechange swap FAILED` |

**為何不用 `track.onended`**：macOS 切換預設 input 時 track 不會 `ended`；單做 A 在此情境抓不到。

**相關 commit**：即將推送

---

## 2026-04-19 — v2.6

### 連續說話無法開始翻譯修正

**症狀**：講者連續說話 20 秒以上不停，程式不會產出任何翻譯；必須停頓才會觸發一次 commit。

**根因**：ElevenLabs Realtime 只有兩種 `commit_strategy` — `vad` 和 `manual`。原本使用 `vad` 模式 + `vad_silence_threshold_secs=1.5`，必須偵測到 1.5 秒靜音才 commit。**沒有時間上限參數**（`max_chunk_duration_secs` 不存在）。連續說話無靜音 → VAD 永遠不觸發 → 永遠不 commit → 永遠不翻譯。

**修正**：仿 Pipecat 的做法，全權移交客戶端 VAD：

| 面向 | 做法 |
|------|------|
| `commit_strategy` | `vad` → `manual` |
| 靜音偵測 | 複用 `updateLevel()` 每幀算的 RMS，閾值 `0.015` |
| 自然切段 | RMS < 閾值持續 `SILENCE_COMMIT_MS=1500ms` → 送 `{message_type:"input_audio_chunk", audio_base_64:"", commit:true}` |
| 硬性上限 | 最大累積音訊 `MAX_CHUNK_MS=12000ms` → 強制 commit（保證連續說話也翻譯） |
| 最小門檻 | `MIN_AUDIO_BEFORE_COMMIT_MS=400ms` — 避免啟動瞬間送空 commit |
| Commit 保護 | `onFinalResult` 收到 commit 回應後立即 `resetCommitTracking()`，避免雙送 |
| 診斷 log | `[WS] commit sent, cause=silence|max-duration` |

**為何不用 slider**：先固定常數觀察效果，必要時再加可調 UI。符合 minimal UI 原則。

**參考**：Pipecat 也用 `commit_strategy=manual` + 自己跑 VAD，與本方案一致。

**相關 commit**：即將推送

---

## 2026-04-19 — v2.5

### Session 靜默停止修復（WebSocket 健康狀態機）

**症狀**：長時間 session 隨機停止翻譯。audio level 仍跳動、語言指示器有變化，但不再出現新翻譯；必須手動按 Stop 退回主畫面重開。時機長短不一（數分鐘至數十分鐘）。

**根因盤點**（全部屬於「WebSocket 靜默死亡」類別）：

| 代號 | 情境 |
|------|------|
| A | Token refresh：新 ws 連不上（network flaky / proxy 503），`onOpen` 永不觸發，全域 `ws` 永不切換 |
| B | Token refresh：新 ws `onerror` 在 `onOpen` 前觸發，無人處理 |
| C | 舊 ws 被 server 主動關（token 過期、idle timeout、server restart），`onclose` 只 `console.log` |
| D | `getElevenLabsToken` fetch 失敗，原本只 reschedule 下次 refresh（14 分鐘後），中間都死 |
| E | ElevenLabs 硬性 session 時間上限（error `session_time_limit_exceeded`，具體秒數未公開） |
| F | ElevenLabs 伺服器 `error` 訊息，顯示但沒觸發重連 |
| G | 行動裝置背景/螢幕鎖導致 ws 被 OS 關 |

**修正**：加入完整 WebSocket 健康狀態機 + 自動重連 + 手動重連按鈕。

| 面向 | 做法 |
|------|------|
| 狀態機 | `wsState`: `idle / connecting / open / reconnecting / failed` |
| 偵測 | `onclose` + `onerror` + `open-timeout guard`（15s handshake 上限）+ 10s heartbeat 輪詢 `readyState` |
| 自動重連 | exponential backoff `1→2→4→8→16→30s`，max 6 次；每次重新 fetch token；重用 AudioContext/worklet/mediaStream |
| 手動重連 | Topbar 新增 Reconnect 按鈕（三語：Reconnect / 重連 / 再接続），按下立即重連並重置 retry 計數 |
| 連線狀態燈 | Topbar 加 10px 圓點：灰(idle) / 黃閃爍(connecting/reconnecting) / 綠(open) / 紅(failed) |
| Token refresh 強化 | 新 ws 15s 未 `onOpen` → 走重連路徑；fetch token 失敗立即重連（不等 14 分鐘） |
| Server error 自動重連 | `error` 訊息包含 `session_time_limit` / `session_expired` / `token_expired` 字樣時直接重連 |
| 診斷 log | 所有 WS 事件統一 `[WS HH:MM:SS.sss]` 前綴（state 變化、連線、斷線 code/reason、重連次數、heartbeat） |
| 重連上限 | 6 次失敗後停止重連，UI 顯示錯誤 segment「Connection lost. Press the Reconnect button to try again, or Stop to restart.」 |

**參考**：
- Pipecat ElevenLabs STT 使用 5s keepalive 模式
- LiveKit [#4609](https://github.com/livekit/agents/issues/4609) 確認官方客戶端不自動重連
- ElevenLabs DeepWiki 揭露 `session_time_limit_exceeded` error type

**相關 commit**：即將推送

---

## 2026-04-19 — v2.4

### 自動捲動至最新片段修正

**症狀**：內容超出視窗後，新片段出現但畫面沒自動捲到最底，使用者必須手動捲動才能看到最新翻譯。

**根因**：v2.3 用 IntersectionObserver 監聽 `#scrollAnchor` 是否在視口內，把結果寫到全域 `isAtBottom`。`appendSegment` 同步執行時立刻讀 `isAtBottom`，但 observer 的回呼是 async，新片段把哨兵推出視口的瞬間 `isAtBottom` 還沒更新 → `maybeScrollToBottom` 讀到舊值誤判成 false → 不捲動。

**修正**：

| 面向 | 做法 |
|------|------|
| 判斷方式 | 改同步計算 `scrollHeight − scrollTop − clientHeight ≤ 80px` |
| 快照時機 | append/update DOM **之前** 先抓 `shouldFollow` |
| 捲動時序 | double `requestAnimationFrame`，第一次等 DOM 繪製、第二次等 `content-visibility` 實際高度確定 |
| 簡化 | 移除 `IntersectionObserver / isAtBottom / bottomObserver / maybeScrollToBottom / setupScrollObserver / disposeScrollObserver` |
| 使用者保護 | 離底 >80px 時不自動跟隨（手動上捲看歷史不會被打斷） |

**相關 commit**：`702c690`（捲動修復）

---

## 2026-04-19 — v2.3

### Artist Talk Translator v2.3：長時間 session 凍結修正

**症狀**：使用 10–30 分鐘後瀏覽器凍結，必須 reload 才能繼續。同時觀察到每段輸入被翻譯兩次。

**根因**：
- `segments` 陣列只增不減，`renderSegments()` 每次用 `container.innerHTML = segments.map(...).join('')` 整段重建 DOM，累積 100–500 條後 DOM 重建成本爆炸
- `segments.find()` O(n) 掃描、`Date.now()` 當 id 會碰撞
- Token refresh 直接關舊 ws、沒等新 ws open 造成 audio gap
- ElevenLabs Realtime 在 `include_timestamps=true` 時對同一 commit 同時發送 `committed_transcript` 與 `committed_transcript_with_timestamps`，兩個 case 都呼叫 `onFinalResult` → 重複翻譯

**修正**：

| 面向 | 做法 |
|------|------|
| 資料結構 | `Map<id, {original, translated, isError, rootEl, translatedEl}>` + 單調 `segmentSeq` |
| DOM 更新 | 純 `createElement + textContent` 增量渲染（`appendSegment / updateSegmentTranslation`） |
| 延遲渲染 | `content-visibility: auto; contain-intrinsic-size: 0 60px` |
| 上限 | ring buffer 500 條（`trimSegments`） |
| 捲動 | 尾端哨兵 `#scrollAnchor` + IntersectionObserver，只在底部時 `scrollIntoView` |
| Token refresh | 雙 ws overlap：新 ws `onopen` 才切換全域 ws，500ms 後關舊 ws |
| 清理 | `stopSession` 清除 worklet/ws 所有 handler 切斷 closure |
| Dedupe | switch case `committed_transcript` 改為 no-op，翻譯只由 `committed_transcript_with_timestamps` 觸發 |

**技術參考**：
- web.dev — [content-visibility](https://web.dev/articles/content-visibility)
- ElevenLabs — [Realtime API](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime)
- ElevenLabs — [Transcripts and commit strategies](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-to-text/realtime/transcripts-and-commit-strategies)

**相關 commit**：`905a221`（凍結修復）、`0677443`（重複翻譯修復）、`73a6807`（版本號 v2.3）

---

## 2026-04-18 — v2.2

### Start Session 按鈕無反應修復、Opus 4.7 model ID 更新

- 修 Start Session 按鈕在特定情境下無法觸發 session
- Anthropic model ID 由 `claude-opus-4-6` 更新為 `claude-opus-4-7`
- 介紹頁新增 GitHub 原始碼連結按鈕

**相關 commit**：`6797e5e`（按鈕修復 + Opus model ID）、`d7b5726`（GitHub 連結）

---

## 2026-04-17 — v2.1

### 擴充支援檔案格式與裝置

- 新增支援檔案格式：PDF、DOCX、RTF、HTML、CSV/TSV、JSON/XML/YAML、SRT/VTT、LOG/RST、原始碼副檔名（.py .js .swift 等）
- 整理裝置相容性清單：macOS / Windows / Linux / iOS 14.5+ / iPadOS 14.5+ / Android 8+
- PDF 解析採用 pdf.js；DOCX 解析採用 mammoth.js

**相關 commit**：`f0e9e2c`

---

## 2026-04-14

### Launch App 按鈕於新分頁開啟

- Launch App 連結加上 `target="_blank"`，避免覆蓋介紹頁
- 介紹頁 i18n key 調整

**相關 commit**：`8be892f`、`9cdd2e3`（後者 2026-04-13）、`6e050a3`（i18n 修正）

---

## 2026-04-13 — v2.0（Web 版首次發布）

### 新增 Artist Talk Translator Web 版

- 新增 `artist-talk-translator.html`：介紹頁
- 新增 `artist-talk-translator-app.html`：即時語音翻譯 Web 應用程式
- 新增 `audio-processor.js`：AudioWorklet PCM 處理（48kHz → 16kHz resampling）
- `software.html` 新增列表項目
- `js/i18n.js` 新增 artisttalktranslator 三語翻譯（介紹、功能、使用說明五步驟）

### 技術架構

| 層 | 技術 |
|---|------|
| 語音辨識 | ElevenLabs Scribe v2 Realtime（WER 2.3%，WebSocket 串流） |
| 翻譯 | Anthropic Claude API（支援預載文本脈絡） |
| Token Proxy | Cloudflare Worker（`elevenlabs-token-proxy.mmmmmmmadman.workers.dev`） |
| 語言偵測 | ElevenLabs code-switching auto-detect，16 種語言 |
| 預載文本 | 多檔案累加載入，前 4000 字元注入 Claude system prompt |
| UI | 三語（繁中 / EN / JP），含三語使用說明書 |

### 開發過程（macOS native → Web）

- 初版為 macOS native app：Swift / SwiftUI + SpeechAnalyzer + Apple Translation
- 跨平台需求改為 Web app
- ASR 由 Web Speech API（WER ~10-15%）升級 ElevenLabs Scribe v2（WER 2.3%）
- 翻譯由 Apple Translation（無脈絡）改 Claude API（支援預載脈絡）
- 曾實驗本地 LLM（MLX + Qwen3-8B-4bit），品質不如 Claude 而放棄

**相關 commit**：`841c100`、`c5b9afc`（devlog 初始化）
