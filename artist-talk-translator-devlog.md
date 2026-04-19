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
| v2.6 | 2026-04-19 | 連續說話卡住修正（`commit_strategy` 切 manual + 客戶端 RMS VAD + 12s 時間上限） |
| v2.5 | 2026-04-19 | WebSocket 健康狀態機、自動重連、手動重連按鈕、連線狀態燈 |
| v2.4 | 2026-04-19 | 自動捲動至最新片段修正 |
| v2.3 | 2026-04-19 | 長時間 session 凍結修正、重複翻譯修正 |
| v2.2 | 2026-04-18 | Start Session 按鈕修復、Opus 4.7 model ID 更新 |
| v2.1 | 2026-04-17 | 擴充支援檔案格式與裝置 |
| v2.0 | 2026-04-13 | Web 版首次發布（macOS native app 改 Web） |

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
