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
| v2.3 | 2026-04-19 | 長時間 session 凍結修正、重複翻譯修正 |
| v2.2 | 2026-04-18 | Start Session 按鈕修復、Opus 4.7 model ID 更新 |
| v2.1 | 2026-04-17 | 擴充支援檔案格式與裝置 |
| v2.0 | 2026-04-13 | Web 版首次發布（macOS native app 改 Web） |

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
