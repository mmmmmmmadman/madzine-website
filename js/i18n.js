/**
 * MADZINE i18n - 三語切換系統
 * 支援：繁體中文 (zh-TW)、英文 (en)、日文 (ja)
 */
const I18N = {
  currentLang: 'zh-TW',

  translations: {
    'zh-TW': {
      nav: {
        home: '首頁',
        works: '作品',
        software: '軟體',
        contact: '聯絡'
      },
      hero: {
        title: 'MADZINE',
        subtitle: '媒體藝術・軟體開發',
        description: '對藝術嚴謹，對人生溫柔'
      },
      section: {
        works: {
          title: '精選作品',
          desc: '音樂、聲音裝置與現場演出',
          more: '查看全部作品'
        },
        software: {
          title: '軟體作品',
          desc: 'VCV Rack 模組與自製應用程式',
          more: '查看全部軟體'
        },
        contact: {
          desc: '合作洽談與社群連結'
        }
      },
      software: {
        vcv: {
          title: 'VCV Rack 模組',
          desc: 'MADZINE 系列模組，為模組化合成器帶來獨特的聲音處理工具',
          browse: '瀏覽完整模組說明書',
          count: '38 個模組，6 大分類'
        },
        apps: {
          title: '應用程式',
          desc: '自製音訊工具與創作軟體'
        }
      },
      apps: {
        decapyramid: {
          name: 'DECAPyramid',
          desc: '8 軌 3D VBAP 空間混音器',
          platform: 'macOS, iOS',
          intro: 'DECAPyramid 是一款 8 軌 3D VBAP 空間混音器，從 MADZINE VCV Rack 模組獨立發展為商業版本。程式使用 8 喇叭立方體配置的 Vector Base Amplitude Panning（VBAP）演算法，在三維空間中對每軌的聲源進行即時定位。使用者透過等距投影的 3D 視圖拖曳聲源位置，介面同時提供全域總覽與單軌操作兩種模式。<br><br>每軌內建 4 種模式的 3D LFO：手動模式允許直接操控位置、序列器模式依預設路徑點循環移動、隨機模式產生不可預測的空間軌跡、旋轉模式沿指定軸進行週期性旋轉。LFO 支援速度、振幅與平滑度參數調整，並可錄製自定義移動路徑。每軌另配備 7 種 Biquad 濾波器（低通、高通、帶通、陷波、峰值、低架、高架）、Peak/RMS 雙模式 VU 表，以及獨立的 Send A/B 控制。<br><br>音訊路由透過 macOS CoreAudio IOProc 實現多裝置同時輸出，最多支援 22 聲道的輸出配置，每個輸出聲道可獨立指定對應的物理裝置與聲道位置。C++17 DSP 核心處理所有即時音訊運算，Swift/SwiftUI 前端負責介面呈現，支援 macOS 與 iOS 雙平台。預設檔系統使用 JSON 格式儲存完整的混音器狀態。',
          features: {
            vbap: '8 喇叭立方體 VBAP 定位',
            lfo: '4 模式 3D LFO',
            filter: '7 種 Biquad 濾波器',
            vu: 'Peak / RMS VU 表',
            routing: '多設備音訊路由（22 聲道）',
            preset: '預設檔案管理'
          }
        },
        jazzarchitect: {
          name: 'JazzArchitect',
          desc: '爵士和弦分析與音樂生成 AU 插件',
          platform: 'macOS, iOS',
          intro: 'JazzArchitect 是一款基於規則的爵士和聲生成器，採用 Rohrmeier (2020) 提出的遞迴文法框架。程式以機率上下文無關文法（PCFG）為核心，透過 Tonic、Dominant、Subdominant 等非終端符號的遞迴展開與機率選擇，生成符合爵士和聲理論的和弦進行。系統內建三全音替代、二五進行、次屬和弦等爵士代理規則，生成結果在理論上具有正確的功能和聲結構。<br><br>程式支援 9 種爵士風格的參數化設定，涵蓋 Bebop、Hard Bop、Modal Jazz、Cool Jazz 等不同年代與流派。StyleVector 機制控制每種風格中各規則的生成機率權重，使用者可調整向量參數以混合不同風格的特徵。和弦進行生成後，系統自動執行聲部導引最佳化演算法，計算相鄰和弦之間最小聲部移動距離，確保聲部連接的流暢性。內建和弦合成引擎提供即時試聽功能。<br><br>程式同時提供 Standalone 應用程式與 Audio Unit v3 插件兩種形式。作為 AU 插件時，可在 Logic Pro、GarageBand 等 DAW 中作為 MIDI 生成器使用，輸出和弦的 MIDI 訊號至其他軌道。支援將生成的和弦進行匯出為 PDF 樂譜。C++ DSP 核心搭配 Swift UI 前端，支援 macOS 與 iOS。',
          features: {
            pcfg: '基於 PCFG 的爵士和弦進行生成',
            styles: '支援 9 種爵士風格',
            voicing: '聲部導引最佳化',
            synth: '和弦合成引擎',
            vector: '風格向量控制',
            pdf: 'PDF 樂譜匯出'
          }
        },
        complexrhythmer: {
          name: 'ComplexRhythmer',
          desc: '8 軌多拍號複合節奏機',
          platform: 'macOS, iOS',
          intro: 'ComplexRhythmer 是一款 8 軌多拍號複合節奏機，從 HTML 版 TriRhythm 移植為原生 macOS/iOS 應用程式。程式的核心是基於最小公倍數（LCM）的多時鐘排程演算法，每軌可設定任意的節拍分割數。當多軌同時運行不同的分割設定（如 3:4:5 的組合）時，系統自動計算所有軌道的最小公倍數，以此作為完整週期的長度，在週期內精確排程每軌的觸發時間點，產生複合節奏 Pattern。<br><br>介面提供 Timeline 截面管理功能，使用者可將不同的節奏配置儲存為獨立的段落（Section），並將多個段落依序排列，組成完整的演奏結構。每個段落可設定不同的軌道分割、音色與音量參數。視覺化播放指標以動畫方式即時顯示各軌的當前節拍位置與觸發狀態，提供直觀的節奏視覺回饋。內建鼓音合成引擎產生音訊輸出，每軌可調整音高、衰減與音量。<br><br>程式同時提供 Standalone 應用程式與 Audio Unit v3 插件兩種形式，作為 AU 插件可載入 Logic Pro 等 DAW 中使用。支援 Ableton Link 協定，可與同一網路內的其他 Link 相容裝置進行節拍與速度同步。C++ DSP 核心搭配 Swift/SwiftUI 前端，支援 macOS 與 iOS 雙平台。',
          features: {
            tracks: '8 軌獨立分割設定（任意拍號，如 3:4:5）',
            lcm: '基於最小公倍數的同步網格',
            section: '時間軸段落管理',
            playhead: '視覺化播放指標',
            au: 'Audio Unit v3 插件支援',
            link: 'Ableton Link 同步'
          }
        },
        edgy: {
          name: 'Edgy',
          desc: '手勢偵測影像處理，MIDI/OSC 輸出',
          platform: 'macOS, iOS',
          intro: 'Edgy 是一款 MIDI/OSC 控制器應用程式，支援 macOS 與 iOS。程式的主要功能是將實體設備的照片轉換為可操作的控制面板。使用者透過相機拍攝合成器、混音器或其他音訊設備，將照片設為背景後，在影像上方自由放置滑桿、旋鈕、按鈕等觸控控制元件，每個元件可獨立設定對應的 MIDI CC 編號或 OSC 位址。<br><br>程式整合 MediaPipe 手勢偵測引擎，支援即時的手部地標追蹤與手勢辨識，可將偵測到的手勢動作映射為 MIDI 訊號輸出。多點觸控功能允許同時操作多個控制元件。Grid 模式提供最多 200 個訊號的網格控制介面，每格可獨立設定為 Continuous（連續值）、Trigger（單次觸發）或 Gate（持續觸發）模式。Grid 的 X 軸與 Y 軸可分別設定不同的控制行為，實現二維控制映射。<br><br>所有控制訊號透過 MIDI 或 OSC 協定輸出至外部軟體與硬體裝置。預設檔管理系統支援儲存與載入不同的控制配置，透過 iCloud Drive 在裝置間同步預設檔。程式提供 10 種色彩主題供切換。支援 macOS 與 iOS 雙平台，使用 Swift/SwiftUI 開發。',
          features: {
            gesture: '即時手勢分析',
            canvas: '多點觸控畫布',
            grid: '可自訂格狀控制器（滑桿、圓形填充）',
            midi: 'MIDI / OSC 輸出映射',
            preset: '預設管理',
            gridxy: '格狀 X/Y 獨立模式',
            icloud: 'iCloud Drive 預設同步',
            themes: '10 種色彩主題'
          }
        },
        watchnext: {
          name: 'WatchNext',
          desc: '跨串流平台影視搜尋工具',
          platform: 'macOS, iOS',
          intro: 'WatchNext 是一款跨串流平台的電影與電視節目搜尋工具，支援 macOS 與 iOS。程式整合 TMDB API 的 Watch Providers 介面，可同時查詢 Apple TV、Netflix、Prime Video、Disney+ 等主要串流平台的內容目錄。使用者選擇特定平台與地區後，系統自動列出該平台在該地區可供觀看的所有電影與節目，支援依熱門度、評分、上映日期等多種維度排序。<br><br>搜尋結果同時顯示 TMDB 評分資訊，並透過 OMDb API 整合 IMDb 評分與 Rotten Tomatoes 新鮮度指數，提供三個評分來源的並列比較。Genre 分類篩選功能可將結果限定至特定類型。區域選擇支援全球 120 個地區，系統依據所選地區自動過濾各平台的可用內容，並將最近使用的地區置頂以加速切換。支援以電影名稱、演員或導演進行關鍵字搜尋。<br><br>收藏功能允許使用者標記有興趣的電影與節目，收藏資料透過 iCloud 在裝置間同步。介面支援英文、日文與繁體中文三種語言。程式使用 Swift/SwiftUI 開發，資料層採用 SwiftData。開源專案，以 MIT 授權於 GitHub 釋出。',
          features: {
            search: '多平台搜尋（Apple TV、Netflix、Prime Video、Disney+）',
            rating: 'IMDb / Rotten Tomatoes 評分比較',
            genre: '類型篩選',
            region: '地區選擇（120 個地區）',
            favorites: '收藏清單（iCloud 同步）',
            multilang: '多語言介面（EN / JA / ZH）'
          }
        },
        anyani: {
          name: 'AnyAni',
          desc: '定格動畫製作工具，AI 超解析與補幀',
          platform: 'macOS, Windows',
          intro: 'AnyAni 是一款定格動畫製作工具，將圖片序列轉換為影片。支援逐幀縮放、位移、旋轉與色鍵去背，內建 Fade/Dissolve 轉場效果。<br><br>AI 超解析功能使用 Real-ESRGAN 模型，macOS 版透過 CoreML 驅動 Apple Neural Engine 加速（比傳統 Vulkan 快 2-6 倍），採用 512x512 分塊處理搭配重疊混合，保持原始畫面比例不變形。Windows 版使用 ncnn-vulkan，支援 NVIDIA、AMD、Intel 顯示卡。<br><br>RIFE AI 補幀可將影格數提升 2-16 倍，與轉場效果可同時運作。硬體影片編碼優先使用 VideoToolbox（macOS）或 NVENC/AMF/QSV（Windows），軟體回退使用 OpenH264（BSD 授權，無 GPL 依賴）。<br><br>介面使用 Rust + egui 開發，GPU 合成透過 wgpu compute shader 加速。支援英文、日文、繁體中文三語介面。',
          features: {
            upscale: 'AI 超解析（Real-ESRGAN，2x/4x，Photo/Anime 模型）',
            rife: 'AI 補幀（RIFE，2x/4x/8x/16x）',
            transition: '轉場效果（Fade / Dissolve）',
            chromakey: '色鍵去背（點擊選色 + 容差調整）',
            transform: '逐幀變形（縮放 / 位移 / 旋轉）',
            batch: '多選批次操作',
            multilang: '三語介面（EN / JP / TW）'
          }
        }
      },
      works: {
        title: '作品集',
        desc: '音樂創作、聲音裝置與現場演出的完整紀錄',
        residency: {
          title: '駐村經驗'
        },
        filter: {
          all: '全部',
          music: '音樂',
          installation: '裝置',
          performance: '演出'
        },
        music: {
          title: '音樂作品',
          desc: '原創音樂專輯與 EP',
          albums: {
            dissolvingSounds: {
              desc: '在古典音樂底蘊下結合電子聲響，完美平衡電子樂器與真實樂器。合成器與鋼琴互為主角，帶來有別於以往的聆聽經驗。'
            },
            fragranceLiang: {
              desc: '虛構角色梁香，從過去記憶中顯現，依據每個人內心的渴望以不同形態現身。由 MAD 與歌手 Alfa 共同打造，以水為媒介，試圖淨化並溶解人與非人之間的羈絆。'
            },
            helsinkiSapporo: {
              desc: '札幌的 3D 列印機與合成器的對話記錄，以及延續《STARMAN RETURNs》概念的赫爾辛基科技音樂現場演奏。這兩首曲目代表了在數位與物理領域學習後，對模組合成器世界兩種不同的探索方式。'
            },
            ovOct: {
              desc: '結合機器人鼓手（Polyend Perc）、Buchla、環境取樣拼貼，從音樂人轉型到新媒體藝術家的分水嶺，也是開啟不從音符創作的起點。'
            },
            starmanReturns: {
              desc: '有機呼吸的科技音樂，揭示個人對宇宙的回饋。'
            },
            matsu: {
              desc: '受柏林 techno 與 Synth Wave 影響，凝視松樹時所創作，將無機的科技音樂與有機的生命感受及情感融合。'
            },
            monologueInAnalogue: {
              desc: '不依賴節拍所創造的新境地。表達對內在世界與不確定性的觀察，一場穿越多重宇宙的精神之旅。'
            }
          }
        },
        performance: {
          title: '現場演出',
          desc: '模組化合成器現場演出選輯',
          works: {
            utsurobune: {
              desc: '與舞踏畫家AKIYO合作的舞踏作品，負責影像、聲音、舞台設計。'
            }
          }
        },
        audiovisual: {
          title: 'Motion and Pictures and Motion Pictures',
          desc: '2024 年 4 月於札幌天神山藝術工作室駐村期間創作的一系列影像作品。'
        },
        tutorial: {
          title: '教學',
          desc: '模組合成器教學資源',
          vcvrack: {
            title: '從零開始 VCV Rack',
            desc: 'VCV Rack 從零開始入門教學，共 8 集'
          }
        },
        interactive: {
          title: 'Physical Interaction',
          desc: '使用從人類行為中採集到的聲音驅動物體振動，進一步影響對應行為的一系列聲音/影像/裝置/表演作品。',
          works: {
            kopiLuwak: {
              title: '衝突的經驗：麝香貓',
              source: '麝香貓咖啡：釀造下一場大流行'
            },
            egg: {
              title: '衝突的經驗：蛋',
              source: '英國雞蛋短缺的背後原因？- BBC Newsnight'
            },
            egg2: {
              title: '衝突的經驗：蛋 #2'
            },
            salmon: {
              title: '衝突的經驗：鮭魚',
              source: '阿拉斯加育空河的鮭魚短缺正在改變原住民的生活方式'
            },
            standSteady: {
              desc: '演出者進行將頭浸泡在水桶中的三點倒立，使用演出者的呼吸訊號敲打水桶。'
            },
            observingTofu: {
              desc: '在將豆腐多餘的水分擠壓出來的過程中進行的一系列觀察。'
            },
            nose: {
              title: '鼻',
              desc: '使用睡眠中的打呼訊號敲打鍋蓋。'
            },
            painting: {
              desc: '使用小刀從粉彩筆削出色粉，小刀的聲音作為振動紙張的訊號、讓色粉自然落下成為畫作。'
            }
          }
        },
        dance: {
          title: '舞蹈聲音設計',
          desc: '現代舞與舞踏的聲音與音樂設計'
        },
        research: {
          title: '研究'
        },
        bandcamp: '在 Bandcamp 收聽',
        youtube: '在 YouTube 觀看'
      },
      contact: {
        title: '聯絡與合作',
        desc: '歡迎合作提案、演出邀約或任何交流',
        course: {
          title: '課程',
          modular: '模組合成器聲音設計線上課程報名',
          handout: '課程講義下載'
        },
        email: '電子郵件',
        social: '社群連結',
        bandcamp: 'Bandcamp',
        youtube: 'YouTube',
        instagram: 'Instagram',
        github: 'GitHub',
        about: {
          title: 'About',
          bio: 'MADZINE 是一位旅居歐洲與日本、來自台灣高雄的多媒體藝術家。他透過自然、電子、聲學和數位元素的即興和平衡進行創作。藝術生涯始於東京和柏林，延伸到歐洲和日本的多個展覽和駐地計劃。聲音設計的教育經驗超過十年，並成為Soundfreak 模組合成器品牌的推薦人。此外，他於 2025 年開始進行程式開發，目前已開發了十數種個人專用的音像程式與三十幾種數位模組合成器。'
        }
      },
      brand: {
        tagline: '台灣聲音設計師，現居東京'
      },
      footer: {
        copyright: '\u00A9 2025 MADZINE. 保留所有權利。'
      },
      tutorial: {
        handout: '模組合成器聲音設計',
        handoutDesc: '課程講義下載'
      },
      mod: {
        uni_rhythm: {
          desc: '精簡 4 軌節奏生成器，具備 10 種世界音樂風格、8 聲 Drum Synthesis、Primary-Priority 合併輸出、Master Isolator + Drive，以及 16 聲道 Poly Output 供 Portal 使用',
          feat0: '10 種世界音樂節奏風格，各角色可獨立選擇',
          feat1: '4 種節奏角色：Timeline、Foundation、Groove、Lead',
          feat2: '8 聲 ExtendedDrumSynth（每角色 2 聲）',
          feat3: '各角色 FREQ/DECAY/VEL 控制，帶 CV 輸入',
          feat4: '各角色 EXT IN 外部音源輸入',
          feat5: 'Master 3 頻段 Isolator（LOW/MID/HIGH）與 Tube Drive',
          feat6: 'Stereo MIX L/R 輸出，帶 SPREAD 控制',
          feat7: '16 聲道 POLY 輸出，供 Portal Crossfading 使用',
          manual: '<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">概述</h3>\n<p style="margin-bottom: 1rem;">精簡的 4 軌跨文化節奏生成器，具備 10 種世界音樂風格與 8 聲整合 Drum Synthesis。4 個角色（Timeline、Foundation、Groove、Lead）各自擁有獨立的 Pattern 序列器與 2 個合成聲部，支援各角色獨立風格選擇、Density 與 Length 控制、外部 Audio 輸入混合及 Fill Pattern。Master 區段提供 3 頻段 Isolator、Tube Drive、Stereo Spread，以及專為 Portal 模組設計的 16 聲道 Polyphonic 輸出。</p>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">4 角色系統</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Timeline</b>（Voice 0-1）: 計時層。鈴鐺、Hi-hat、Ride 鈸，頻率範圍 3-12kHz。</li>\n<li><b>Foundation</b>（Voice 2-3）: Bass 層，40-150Hz。Kick 鼓與低頻 Bass 鼓。</li>\n<li><b>Groove</b>（Voice 4-5）: 中頻 250-700Hz。Snare、Clap、Congas。</li>\n<li><b>Lead</b>（Voice 6-7）: 高頻裝飾與重音。Ghost Note 與 Fill。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">各角色控制</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>STYLE</b>: 節奏風格（0-9，整數對齊）。各角色可選不同風格。CV: ±5V 選擇風格。</li>\n<li><b>DENSITY</b>: Pattern 密度（0-100%）。Foundation 預設 20%、Timeline 40%、其他 50%。CV: ±5V 調變。</li>\n<li><b>LENGTH</b>: Pattern 長度（4-32 步，整數對齊）。</li>\n<li><b>FREQ</b>: 頻率修正（-1 至 +1 八度）。CV: ±1V = ±0.2 八度。</li>\n<li><b>DECAY</b>: Decay 倍數（0.2x 至 2.0x）。CV: ±1V = ±0.18x（±5V = ±0.9x）。</li>\n<li><b>MIX</b>: 內部合成（0%）與外部 Audio（100%）之間的混合。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">外部 Audio 輸入</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>EXT IN 1/2</b>: 各角色兩個外部 Audio 輸入，分別對應 Voice 1 與 Voice 2。</li>\n<li><b>VCA Envelope</b>: 外部 Audio 音量隨 Hit Velocity 變化。較大力度 Decay 較快。</li>\n<li><b>MIX Knob</b>: 在內部 Drum Synthesis 與外部 Audio 之間做 Crossfade。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">全域參數</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Variation</b>: Pattern 變化量（預設 30%）。控制 Pattern 隨時間演化的程度。</li>\n<li><b>Humanize</b>: 時序與 Velocity Humanize（預設 50%）。為節奏添加有機感。</li>\n<li><b>Swing</b>: Swing 量（預設 50%）。調整 Off-beat 音符的時序。</li>\n<li><b>Rest</b>: 休止機率，帶 CV 輸入。以機率方式移除 Pattern 中的 Hit。</li>\n<li><b>Fill</b>: 結合 Fill 機率與強度（預設 30%）。在小節開始時預先決定。</li>\n<li><b>Articulation</b>: Articulation 量。啟用 Ghost、Accent、Rim、Flam、Drag、Buzz、Ruff 演奏技法。</li>\n<li><b>Ghost Notes</b>: Ghost Note 機率。</li>\n<li><b>Accent</b>: Accent 機率。</li>\n<li><b>Spread</b>: Mix 輸出的 Stereo Spread（預設 50%）。</li>\n<li><b>Regenerate</b>: 依據目前設定生成新 Pattern。</li>\n<li><b>Reset</b>: 將所有步數計數器歸零。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Master 區段</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Isolator Low</b>: 3 頻段 Isolator 低頻（250Hz 分頻點）。雙極: -1 = Kill、0 = Unity、+1 = +12dB Boost。</li>\n<li><b>Isolator Mid</b>: 3 頻段 Isolator 中頻（250Hz-4kHz）。相同雙極控制。</li>\n<li><b>Isolator High</b>: 3 頻段 Isolator 高頻（4kHz 分頻點）。相同雙極控制。</li>\n<li><b>Master Drive</b>: 非對稱 Tube Saturation（0-100%）。產生溫暖的偶次諧波，帶 DC Blocker。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Primary-Priority 合併輸出</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Audio</b>: 各角色兩個 Voice 的音訊總和（Primary + Secondary）。</li>\n<li><b>Gate</b>: 合併的 Gate 輸出。兩個 Voice 同時觸發時，Primary Voice 優先。</li>\n<li><b>Pitch CV</b>: 來自最後觸發 Voice 的 1V/Oct Pitch 輸出（Primary 優先）。C4 = 0V。</li>\n<li><b>Vel/Env</b>: 來自優先 Voice 的 Velocity Envelope CV（0-10V）。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Clock 與時序</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>CLK</b>: 外部 Clock 輸入。Pattern 播放所必需。</li>\n<li><b>RST</b>: Reset 輸入。將所有步數計數器歸零。</li>\n<li><b>REGEN</b>: Regenerate 觸發輸入。依據目前設定生成新 Pattern。</li>\n<li><b>PPQN</b>: 1（四分音符）、2（八分音符）或 4（十六分音符）每四分音符脈衝數。透過右鍵選單設定。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">輸出</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Per-Role Audio</b>: 個別角色 Audio 輸出（2 Voice 總和）。</li>\n<li><b>Per-Role Gate</b>: 各角色合併的 Trigger 輸出。</li>\n<li><b>Per-Role Pitch</b>: 各角色 1V/Oct CV 輸出。</li>\n<li><b>Per-Role Vel/Env</b>: 各角色 Velocity Envelope CV 輸出。</li>\n<li><b>MIX L/R</b>: Stereo Master Mix，含 Isolator、Drive 與 Spread。</li>\n<li><b>POLY</b>: 16 聲道 Polyphonic 輸出。4 角色 x 4 聲道（Audio、Gate、Pitch、VelEnv）。專為 Portal 設計。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Per-Role Parameter Reference</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Timeline Style</b>: Timeline 角色節奏風格（0-9，整數對齊）。</li>\n<li><b>Timeline Density</b>: Timeline 角色 Pattern 密度（0-100%，預設 40%）。</li>\n<li><b>Timeline Length</b>: Timeline 角色 Pattern 長度（4-32 步，整數對齊）。</li>\n<li><b>Timeline Freq</b>: Timeline 角色頻率修正（-1 至 +1 八度）。</li>\n<li><b>Timeline Decay</b>: Timeline 角色 Decay 倍數（0.2x 至 2.0x）。</li>\n<li><b>Timeline Mix (Int/Ext)</b>: Timeline 角色內部合成（0%）至外部 Audio（100%）。</li>\n<li><b>Foundation Style</b>: Foundation 角色節奏風格（0-9，整數對齊）。</li>\n<li><b>Foundation Density</b>: Foundation 角色 Pattern 密度（0-100%，預設 20%）。</li>\n<li><b>Foundation Length</b>: Foundation 角色 Pattern 長度（4-32 步，整數對齊）。</li>\n<li><b>Foundation Freq</b>: Foundation 角色頻率修正（-1 至 +1 八度）。</li>\n<li><b>Foundation Decay</b>: Foundation 角色 Decay 倍數（0.2x 至 2.0x）。</li>\n<li><b>Foundation Mix (Int/Ext)</b>: Foundation 角色內部合成（0%）至外部 Audio（100%）。</li>\n<li><b>Groove Style</b>: Groove 角色節奏風格（0-9，整數對齊）。</li>\n<li><b>Groove Density</b>: Groove 角色 Pattern 密度（0-100%，預設 50%）。</li>\n<li><b>Groove Length</b>: Groove 角色 Pattern 長度（4-32 步，整數對齊）。</li>\n<li><b>Groove Freq</b>: Groove 角色頻率修正（-1 至 +1 八度）。</li>\n<li><b>Groove Decay</b>: Groove 角色 Decay 倍數（0.2x 至 2.0x）。</li>\n<li><b>Groove Mix (Int/Ext)</b>: Groove 角色內部合成（0%）至外部 Audio（100%）。</li>\n<li><b>Lead Style</b>: Lead 角色節奏風格（0-9，整數對齊）。</li>\n<li><b>Lead Density</b>: Lead 角色 Pattern 密度（0-100%，預設 50%）。</li>\n<li><b>Lead Length</b>: Lead 角色 Pattern 長度（4-32 步，整數對齊）。</li>\n<li><b>Lead Freq</b>: Lead 角色頻率修正（-1 至 +1 八度）。</li>\n<li><b>Lead Decay</b>: Lead 角色 Decay 倍數（0.2x 至 2.0x）。</li>\n<li><b>Lead Mix (Int/Ext)</b>: Lead 角色內部合成（0%）至外部 Audio（100%）。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Input Reference</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Clock</b>: Pattern 播放用 Clock 輸入。</li>\n<li><b>Reset</b>: Reset 輸入。將所有步數計數器歸零。</li>\n<li><b>Regenerate</b>: 生成新 Pattern 的 Trigger 輸入。</li>\n<li><b>Rest CV</b>: 休止機率調變 CV 輸入。</li>\n<li><b>Fill Trigger</b>: Fill 啟動 Trigger 輸入。</li>\n<li><b>Timeline Style CV</b>: Timeline 風格調變 CV 輸入。</li>\n<li><b>Timeline Density CV</b>: Timeline 密度調變 CV 輸入。</li>\n<li><b>Timeline Freq CV</b>: Timeline 頻率調變 CV 輸入。</li>\n<li><b>Timeline Decay CV</b>: Timeline Decay 調變 CV 輸入。</li>\n<li><b>Foundation Style CV</b>: Foundation 風格調變 CV 輸入。</li>\n<li><b>Foundation Density CV</b>: Foundation 密度調變 CV 輸入。</li>\n<li><b>Foundation Freq CV</b>: Foundation 頻率調變 CV 輸入。</li>\n<li><b>Foundation Decay CV</b>: Foundation Decay 調變 CV 輸入。</li>\n<li><b>Groove Style CV</b>: Groove 風格調變 CV 輸入。</li>\n<li><b>Groove Density CV</b>: Groove 密度調變 CV 輸入。</li>\n<li><b>Groove Freq CV</b>: Groove 頻率調變 CV 輸入。</li>\n<li><b>Groove Decay CV</b>: Groove Decay 調變 CV 輸入。</li>\n<li><b>Lead Style CV</b>: Lead 風格調變 CV 輸入。</li>\n<li><b>Lead Density CV</b>: Lead 密度調變 CV 輸入。</li>\n<li><b>Lead Freq CV</b>: Lead 頻率調變 CV 輸入。</li>\n<li><b>Lead Decay CV</b>: Lead Decay 調變 CV 輸入。</li>\n<li><b>Timeline Audio Input 1</b>: Timeline 角色外部 Audio 輸入 1。</li>\n<li><b>Timeline Audio Input 2</b>: Timeline 角色外部 Audio 輸入 2。</li>\n<li><b>Foundation Audio Input 1</b>: Foundation 角色外部 Audio 輸入 1。</li>\n<li><b>Foundation Audio Input 2</b>: Foundation 角色外部 Audio 輸入 2。</li>\n<li><b>Groove Audio Input 1</b>: Groove 角色外部 Audio 輸入 1。</li>\n<li><b>Groove Audio Input 2</b>: Groove 角色外部 Audio 輸入 2。</li>\n<li><b>Lead Audio Input 1</b>: Lead 角色外部 Audio 輸入 1。</li>\n<li><b>Lead Audio Input 2</b>: Lead 角色外部 Audio 輸入 2。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Output Reference</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Timeline Audio</b>: Timeline 角色合併 Audio 輸出（2 Voice 總和）。</li>\n<li><b>Timeline Gate</b>: Timeline 角色合併 Gate/Trigger 輸出（Primary 優先）。</li>\n<li><b>Timeline Pitch CV (1V/Oct, C4=0V)</b>: Timeline 角色 Pitch CV 輸出。</li>\n<li><b>Timeline Velocity Envelope</b>: Timeline 角色 Velocity Envelope CV 輸出。</li>\n<li><b>Foundation Audio</b>: Foundation 角色合併 Audio 輸出（2 Voice 總和）。</li>\n<li><b>Foundation Gate</b>: Foundation 角色合併 Gate/Trigger 輸出（Primary 優先）。</li>\n<li><b>Foundation Pitch CV (1V/Oct, C4=0V)</b>: Foundation 角色 Pitch CV 輸出。</li>\n<li><b>Foundation Velocity Envelope</b>: Foundation 角色 Velocity Envelope CV 輸出。</li>\n<li><b>Groove Audio</b>: Groove 角色合併 Audio 輸出（2 Voice 總和）。</li>\n<li><b>Groove Gate</b>: Groove 角色合併 Gate/Trigger 輸出（Primary 優先）。</li>\n<li><b>Groove Pitch CV (1V/Oct, C4=0V)</b>: Groove 角色 Pitch CV 輸出。</li>\n<li><b>Groove Velocity Envelope</b>: Groove 角色 Velocity Envelope CV 輸出。</li>\n<li><b>Lead Audio</b>: Lead 角色合併 Audio 輸出（2 Voice 總和）。</li>\n<li><b>Lead Gate</b>: Lead 角色合併 Gate/Trigger 輸出（Primary 優先）。</li>\n<li><b>Lead Pitch CV (1V/Oct, C4=0V)</b>: Lead 角色 Pitch CV 輸出。</li>\n<li><b>Lead Velocity Envelope</b>: Lead 角色 Velocity Envelope CV 輸出。</li>\n<li><b>Mix L</b>: 左聲道 Stereo Master Mix 輸出（含 Isolator、Drive、Spread）。</li>\n<li><b>Mix R</b>: 右聲道 Stereo Master Mix 輸出（含 Isolator、Drive、Spread）。</li>\n<li><b>Poly Out (16ch for Portal)</b>: 16 聲道 Polyphonic 輸出（4 角色 x 4 聲道）。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">技術規格</h3>\n<ul style="padding-left: 1.5rem;">\n<li>模組寬度: 32HP</li>\n<li>Voice 數量: 8（每角色 2）</li>\n<li>合成模式: SINE（音高）、NOISE（無音高）</li>\n<li>Pattern 長度: 各角色 4-32 步</li>\n<li>Isolator 分頻點: 250Hz / 4kHz（Linkwitz-Riley 4 階）</li>\n<li>Drive: 非對稱 Tube Saturation，含 DC Blocker</li>\n<li>Poly 輸出: 16 聲道（4 角色 x 4 資料類型）</li>\n<li>處理: 32 位元浮點</li>\n</ul>'
        },
        portal: {
          desc: 'UniRhythm 專用 Poly Crossfader，具備 3 頻段 Isolator、Tube Drive、DJ 風格 Cue 監聽與可選 Crossfader 曲線',
          feat0: '2 組 16 聲道 Poly 輸入（來自 UniRhythm 的 A/B Deck）',
          feat1: 'Crossfader 支援 3 種曲線：Linear、Equal Power、Cut',
          feat2: '3 頻段 Isolator（LOW/MID/HIGH），帶 Kill 功能',
          feat3: 'Tube Drive 非對稱飽和',
          feat4: 'DJ 風格 CUE A/B 監聽，帶獨立 Stereo 輸出',
          feat5: '各角色 CV 輸出：Gate、Pitch、Vel/Env（Crossfaded）',
          manual: '<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">概述</h3>\n<p style="margin-bottom: 1rem;">專為 DJ 風格工作流設計的 Poly Crossfader，用於混合兩台 UniRhythm 模組。接收來自 UniRhythm POLY Output 的兩組 16 聲道 Polyphonic 輸入（Deck A 與 Deck B），提供 3 頻段 Isolator、Tube Drive 與獨立 Cue 監聽輸出的平滑 Crossfading。Crossfader 曲線可透過右鍵選單從三種類型中選擇。各角色 CV 輸出（Gate、Pitch、Vel/Env）同樣經過 Crossfade 處理，供外部合成器控制使用。</p>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Poly 聲道配置</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Channels 0-3</b>: Timeline（Audio、Gate、Pitch、VelEnv）</li>\n<li><b>Channels 4-7</b>: Foundation（Audio、Gate、Pitch、VelEnv）</li>\n<li><b>Channels 8-11</b>: Groove（Audio、Gate、Pitch、VelEnv）</li>\n<li><b>Channels 12-15</b>: Lead（Audio、Gate、Pitch、VelEnv）</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Crossfader</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>XFADE Slider</b>: 水平滑桿。A（左）至 B（右）。預設：中央（50%）。</li>\n<li><b>Cross CV</b>: Crossfader 位置的 CV 輸入。±10V 對應 ±1.0 位置偏移（係數 0.1）。</li>\n<li><b>Linear Curve</b>: 直線增益 Crossfade。A = 1-pos、B = pos。</li>\n<li><b>Equal Power (default)</b>: 等功率 Crossfade，使用 Sine/Cosine。中央無凹陷。</li>\n<li><b>Cut Curve</b>: DJ 風格硬切，帶重疊區。A 在 40% 前維持全量，B 在 60% 後維持全量。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Isolator</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>LOW</b>: 低頻增益（250Hz 以下）。雙極: -1 = Kill、0 = Unity、+1 = +12dB Boost。二次曲線 Cut 提供音樂感。</li>\n<li><b>MID</b>: 中頻增益（250Hz-4kHz）。相同雙極控制。</li>\n<li><b>HIGH</b>: 高頻增益（4kHz 以上）。相同雙極控制。</li>\n<li><b>Filter Type</b>: Linkwitz-Riley 4 階（串聯 2 階 Butterworth），相位一致 Crossover。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Drive</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>DRIVE</b>: Master Tube Drive（0-100%）。非對稱波形整形：正半週柔和飽和、負半週較硬，產生偶次諧波。</li>\n<li><b>Makeup Gain</b>: 自動增益補償以維持感知音量。</li>\n<li><b>DC Blocker</b>: 1 階高通約 10Hz，消除 Saturation 產生的 DC 偏移。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Cue 監聽</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>CUE Button</b>: 在 A 與 B 之間切換。以彩色文字顯示目前選擇。</li>\n<li><b>CUE L/R</b>: 專用 Stereo 耳機監聽輸出。輸出所選 Deck（A 或 B）的原始 Audio，不經 Crossfader、Isolator 或 Drive 處理。</li>\n<li><b>Use Case</b>: 在 Crossfading 前預聽即將進入的 Deck，如同 DJ Mixer。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">CV 輸出</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Gate</b>: 各角色 Crossfade 後的 Gate 訊號（Timeline、Foundation、Groove、Lead）。</li>\n<li><b>Pitch</b>: 各角色 Crossfade 後的 Pitch CV（1V/Oct）。</li>\n<li><b>Vel/Env</b>: 各角色 Crossfade 後的 Velocity Envelope CV。</li>\n<li><b>Layout</b>: 上半組（Timeline + Groove），下半組（Foundation + Lead）。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">輸入</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Poly in A</b>: 來自 UniRhythm Deck A 的 16 聲道 Polyphonic 輸入。</li>\n<li><b>Poly in B</b>: 來自 UniRhythm Deck B 的 16 聲道 Polyphonic 輸入。</li>\n<li><b>Cross CV</b>: Crossfader 位置 CV 調變（±10V，係數 0.1）。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">輸出</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Master L/R</b>: Stereo Master 輸出，含 Crossfade、Isolator、Drive 與 Soft Clip。</li>\n<li><b>CUE L/R</b>: Stereo Cue 監聽輸出（原始所選 Deck Audio）。</li>\n<li><b>Per-Role Gate/Pitch/VelEnv</b>: 4 角色 x 3 CV 類型 = 12 個 Crossfade 後的 CV 輸出。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">技術規格</h3>\n<ul style="padding-left: 1.5rem;">\n<li>模組寬度: 8HP</li>\n<li>Poly 輸入: 每 Deck 16 聲道</li>\n<li>Crossfader 曲線: Linear、Equal Power、Cut</li>\n<li>Isolator 分頻點: 250Hz / 4kHz（Linkwitz-Riley 4 階）</li>\n<li>Drive: 非對稱 Tube Saturation，含 DC Blocker（~10Hz）</li>\n<li>輸出限幅: 透過 tanh 的 Soft Clip</li>\n<li>處理: 32 位元浮點</li>\n<li><b>Crossfader</b>: DJ 風格交叉混合器，Deck A 與 Deck B 之間。0%=完全 A，100%=完全 B。可透過 Crossfader CV 輸入進行 CV 調變。</li>\n<li><b>Cue A/B</b>: Cue 路由切換。選擇將哪個 Deck（A 或 B）送至 Cue 輸出以供監聽。</li>\n<li><b>Deck A (16ch poly)</b>: Deck A 的 16 聲道 Polyphonic 輸入。各聲道解碼為獨立的軌道訊號。</li>\n<li><b>Deck B (16ch poly)</b>: Deck B 的 16 聲道 Polyphonic 輸入。各聲道解碼為獨立的軌道訊號。</li>\n<li><b>Crossfader CV</b>: Crossfader 位置調變的 CV 輸入（&plusmn;10V，係數 0.1，加至 Crossfader 位置偏移）。</li>\n<li><b>Master L</b>: Master 左聲道輸出。經過 Crossfader、Isolator、Drive 與 Soft Clip 後的主立體聲混音。</li>\n<li><b>Master R</b>: Master 右聲道輸出。經過 Crossfader、Isolator、Drive 與 Soft Clip 後的主立體聲混音。</li>\n<li><b>Cue L</b>: Cue 左聲道輸出，用於耳機監聽。</li>\n<li><b>Cue R</b>: Cue 右聲道輸出，用於耳機監聽。</li>\n</ul>'
        }
      },
      common: {
        back: '返回',
        more: '了解更多',
        intro: '功能介紹',
        features: '特色一覽',
        tech: '技術資訊',
        platform: '平台',
        language: '開發語言',
        version: '版本',
        license: '授權'
      }
    },

    'en': {
      nav: {
        home: 'Home',
        works: 'Works',
        software: 'Software',
        contact: 'Contact'
      },
      hero: {
        title: 'MADZINE',
        subtitle: 'Media Art \u00B7 Software Coding',
        description: 'Strict with art, gentle with life'
      },
      section: {
        works: {
          title: 'Selected Works',
          desc: 'Music, sound installations, and live performances',
          more: 'View All Works'
        },
        software: {
          title: 'Software',
          desc: 'VCV Rack modules and original applications',
          more: 'View All Software'
        },
        contact: {
          desc: 'Collaboration inquiries and social links'
        }
      },
      software: {
        vcv: {
          title: 'VCV Rack Modules',
          desc: 'MADZINE module series, bringing unique sound processing tools to modular synthesis',
          browse: 'Browse Full Module Manual',
          count: '38 modules across 6 categories'
        },
        apps: {
          title: 'Applications',
          desc: 'Original audio tools and creative software'
        }
      },
      apps: {
        decapyramid: {
          name: 'DECAPyramid',
          desc: '8-track 3D VBAP spatial mixer',
          platform: 'macOS, iOS',
          intro: 'DECAPyramid is an 8-track 3D VBAP spatial mixer, developed from the MADZINE VCV Rack module into a standalone commercial product. The application uses a Vector Base Amplitude Panning (VBAP) algorithm with an 8-speaker cube configuration for real-time positioning of each track\'s sound source in three-dimensional space. Users drag source positions via an isometric 3D view, with both global overview and per-track interaction modes available.<br><br>Each track includes a 3D LFO with four modes: manual mode for direct position control, sequencer mode for cycling through preset path points, random mode for unpredictable spatial trajectories, and rotate mode for periodic rotation along specified axes. The LFO supports speed, amplitude, and smoothness parameter adjustments, with custom path recording capability. Each track is additionally equipped with 7 Biquad filter types (lowpass, highpass, bandpass, notch, peak, low shelf, high shelf), dual-mode Peak/RMS VU meters, and independent Send A/B controls.<br><br>Audio routing uses macOS CoreAudio IOProc for simultaneous multi-device output, supporting up to 22 output channels with each channel independently assignable to a specific physical device and channel position. The C++17 DSP core handles all real-time audio computation, while the Swift/SwiftUI frontend manages the interface, supporting both macOS and iOS. The preset system stores complete mixer states in JSON format.',
          features: {
            vbap: '8-speaker cube VBAP panning',
            lfo: '4-mode 3D LFO',
            filter: '7 Biquad filter types',
            vu: 'Peak / RMS VU meters',
            routing: 'Multi-device audio routing (22 channels)',
            preset: 'Preset file management'
          }
        },
        jazzarchitect: {
          name: 'JazzArchitect',
          desc: 'Jazz chord analysis and music generation AU plugin',
          platform: 'macOS, iOS',
          intro: 'JazzArchitect is a rule-based jazz harmony generator built on the recursive grammar framework proposed by Rohrmeier (2020). At its core, Probabilistic Context-Free Grammar (PCFG) generates chord progressions through recursive expansion and probabilistic selection of non-terminal symbols including Tonic, Dominant, and Subdominant. The system includes built-in jazz substitution rules such as tritone substitution, ii-V progressions, and secondary dominants, producing results with theoretically correct functional harmonic structures.<br><br>The application supports parameterized settings for 9 jazz styles, covering different eras and genres including Bebop, Hard Bop, Modal Jazz, and Cool Jazz. The StyleVector mechanism controls the probability weights for each rule within a given style, allowing users to adjust vector parameters to blend characteristics across styles. After chord progression generation, the system automatically executes a voice leading optimization algorithm that calculates minimum voice movement distances between adjacent chords to ensure smooth voice connections. A built-in chord synthesis engine provides real-time auditioning.<br><br>The application is available both as a standalone app and as an Audio Unit v3 plugin. As an AU plugin, it functions as a MIDI generator within DAWs such as Logic Pro and GarageBand, outputting chord MIDI signals to other tracks. Generated chord progressions can be exported as PDF scores. C++ DSP core with Swift UI frontend, supporting macOS and iOS.',
          features: {
            pcfg: 'PCFG-based jazz chord progression generation',
            styles: '9 jazz styles support',
            voicing: 'Voice leading optimization',
            synth: 'Chord synthesis engine',
            vector: 'Style vector control',
            pdf: 'PDF score export'
          }
        },
        complexrhythmer: {
          name: 'ComplexRhythmer',
          desc: '8-track polymetric complex rhythm machine',
          platform: 'macOS, iOS',
          intro: 'ComplexRhythmer is an 8-track polymetric compound rhythm machine, ported from the HTML-based TriRhythm to a native macOS/iOS application. At its core is a Least Common Multiple (LCM) multi-clock scheduling algorithm where each track can be assigned arbitrary beat divisions. When multiple tracks run different division settings simultaneously (such as a 3:4:5 combination), the system automatically calculates the LCM across all tracks as the complete cycle length, precisely scheduling each track\'s trigger points within the cycle to produce compound rhythm patterns.<br><br>The interface provides timeline section management, allowing users to save different rhythm configurations as independent sections and arrange multiple sections sequentially to form complete performance structures. Each section can have different track divisions, timbres, and volume parameters. A visual playhead displays real-time beat positions and trigger states across all tracks through animation, providing intuitive rhythmic visual feedback. A built-in drum synthesis engine generates audio output with adjustable pitch, decay, and volume per track.<br><br>The application is available as both a standalone app and an Audio Unit v3 plugin, loadable in DAWs such as Logic Pro. It supports the Ableton Link protocol for beat and tempo synchronization with other Link-compatible devices on the same network. C++ DSP core with Swift/SwiftUI frontend, supporting both macOS and iOS.',
          features: {
            tracks: '8 tracks with independent division settings (arbitrary time signatures, e.g. 3:4:5)',
            lcm: 'LCM-based synchronization grid',
            section: 'Timeline section management',
            playhead: 'Visual playhead',
            au: 'Audio Unit v3 plugin support',
            link: 'Ableton Link synchronization'
          }
        },
        edgy: {
          name: 'Edgy',
          desc: 'Gesture detection image processing with MIDI/OSC output',
          platform: 'macOS, iOS',
          intro: 'Edgy is a MIDI/OSC controller application for macOS and iOS. Its primary function is converting photographs of physical equipment into operable control panels. Users photograph synthesizers, mixers, or other audio equipment through the camera, set the photo as a background, then freely place touch controls—sliders, knobs, buttons—over the image, with each element independently assignable to a specific MIDI CC number or OSC address.<br><br>The application integrates the MediaPipe gesture detection engine, supporting real-time hand landmark tracking and gesture recognition with detected gestures mappable to MIDI signal output. Multi-touch functionality allows simultaneous operation of multiple controls. Grid mode provides a grid control interface for up to 200 signals, with each cell independently configurable as Continuous (continuous value), Trigger (single fire), or Gate (sustained fire) mode. The grid\'s X and Y axes can be set to different control behaviors separately, enabling two-dimensional control mapping.<br><br>All control signals are output via MIDI or OSC protocol to external software and hardware devices. The preset management system supports saving and loading different control configurations, with iCloud Drive synchronization across devices. The application offers 10 color themes. Supports both macOS and iOS, developed with Swift/SwiftUI.',
          features: {
            gesture: 'Real-time gesture analysis',
            canvas: 'Multi-touch canvas',
            grid: 'Customizable grid controller (sliders, circular fill)',
            midi: 'MIDI / OSC output mapping',
            preset: 'Preset management',
            gridxy: 'Grid X/Y independent mode',
            icloud: 'iCloud Drive preset sync',
            themes: '10 color themes'
          }
        },
        watchnext: {
          name: 'WatchNext',
          desc: 'Cross-platform streaming search tool',
          platform: 'macOS, iOS',
          intro: 'WatchNext is a cross-platform streaming search tool for movies and TV shows, available on macOS and iOS. The application integrates the TMDB API Watch Providers interface to query content catalogs across major streaming platforms including Apple TV, Netflix, Prime Video, and Disney+. After selecting a specific platform and region, the system automatically lists all available movies and shows for that platform in that region, with sorting by popularity, rating, release date, and other dimensions.<br><br>Search results display TMDB rating information alongside IMDb scores and Rotten Tomatoes freshness indexes integrated through the OMDb API, providing side-by-side comparison across three rating sources. Genre filtering narrows results to specific categories. Region selection supports 120 regions worldwide, with the system automatically filtering available content per platform based on the selected region and placing recently used regions at the top for quick switching. Keyword search by movie title, actor, or director is supported.<br><br>A favorites feature allows users to bookmark movies and shows of interest, with favorites data syncing across devices via iCloud. The interface supports English, Japanese, and Traditional Chinese. Built with Swift/SwiftUI using SwiftData for the data layer. Open-source project released under MIT license on GitHub.',
          features: {
            search: 'Multi-platform search (Apple TV, Netflix, Prime Video, Disney+)',
            rating: 'IMDb / Rotten Tomatoes rating comparison',
            genre: 'Genre filtering',
            region: 'Region selection (120 regions)',
            favorites: 'Favorites collection (iCloud sync)',
            multilang: 'Multi-language interface (EN / JA / ZH)'
          }
        },
        anyani: {
          name: 'AnyAni',
          desc: 'Stop motion animation maker with AI upscale and interpolation',
          platform: 'macOS, Windows',
          intro: 'AnyAni is a stop motion animation maker that converts image sequences into video. It supports per-frame scale, offset, rotation, and chroma key background removal, with built-in Fade/Dissolve transitions.<br><br>AI upscaling uses Real-ESRGAN models. On macOS, CoreML drives the Apple Neural Engine for 2-6x faster processing compared to traditional Vulkan, using 512x512 tiling with overlap blending to preserve original aspect ratios. On Windows, ncnn-vulkan supports NVIDIA, AMD, and Intel GPUs.<br><br>RIFE AI interpolation boosts frame count by 2-16x and works simultaneously with transitions. Hardware video encoding prioritizes VideoToolbox (macOS) or NVENC/AMF/QSV (Windows), with OpenH264 (BSD licensed, no GPL dependencies) as software fallback.<br><br>Built with Rust + egui, GPU compositing via wgpu compute shader. Interface supports English, Japanese, and Traditional Chinese.',
          features: {
            upscale: 'AI Upscale (Real-ESRGAN, 2x/4x, Photo/Anime models)',
            rife: 'AI Interpolation (RIFE, 2x/4x/8x/16x)',
            transition: 'Transitions (Fade / Dissolve)',
            chromakey: 'Chroma Key (click-to-pick color + tolerance)',
            transform: 'Per-frame transforms (Scale / Offset / Rotation)',
            batch: 'Multi-select batch operations',
            multilang: 'Trilingual interface (EN / JP / TW)'
          }
        }
      },
      works: {
        title: 'Works',
        desc: 'A complete archive of music, sound installations, and live performances',
        residency: {
          title: 'Residency'
        },
        filter: {
          all: 'All',
          music: 'Music',
          installation: 'Installation',
          performance: 'Performance'
        },
        music: {
          title: 'Music',
          desc: 'Original music albums and EPs',
          albums: {
            dissolvingSounds: {
              desc: 'Classical foundations blended with electronic sounds, perfectly balancing electronic and real instruments. Synthesizer and piano serve as equal partners, creating a unique listening experience.'
            },
            fragranceLiang: {
              desc: 'Fragrance Liang, a fictional character manifested from past memories, appearing in different forms based on each individual\'s inner desires. Crafted by MAD and vocalist Alfa, using water as a medium to dissolve the bonds between human and non-human entities.'
            },
            helsinkiSapporo: {
              desc: 'Recording of conversations between a 3D printer and synthesizer in Sapporo, and a techno live set in Helsinki following the concept of STARMAN RETURNs. These two tracks represent two different approaches to the modular synth universe after studying in digital and physical domains.'
            },
            ovOct: {
              desc: 'Combining a robot drummer (Polyend Perc), Buchla, and ambient sampling collage, a watershed moment in the transition from musician to new media artist, and the beginning of works not created from musical notes.'
            },
            starmanReturns: {
              desc: 'Organic breathing techno pieces revealing one\'s feedback of the universe.'
            },
            matsu: {
              desc: 'Influenced by Berlin techno and Synth Wave, created while gazing at pine trees, merging inorganic techno with organic, living sensations and emotions.'
            },
            monologueInAnalogue: {
              desc: 'A new frontier created without dependence on beats. Expressing observation of the inner world and uncertainty, a spiritual journey through multiverses.'
            }
          }
        },
        performance: {
          title: 'Live Performance',
          desc: 'Modular synthesizer live performance selections',
          works: {
            utsurobune: {
              desc: 'A Butoh piece in collaboration with Butoh painter AKIYO. Responsible for visuals, sound, and stage design.'
            }
          }
        },
        audiovisual: {
          title: 'Motion and Pictures and Motion Pictures',
          desc: 'A series of visual works done in April 2024, while doing residency in Sapporo Tenjinyama Art Studio.'
        },
        tutorial: {
          title: 'Tutorials',
          desc: 'Modular synthesizer tutorial resources',
          vcvrack: {
            title: 'VCV Rack from Scratch',
            desc: 'VCV Rack beginner tutorial series, 8 episodes'
          }
        },
        interactive: {
          title: 'Physical Interaction',
          desc: 'Using sounds collected from human behaviour to drive the vibration of objects, further influencing a series of sound/image/device/performance works corresponding to the behaviour.',
          works: {
            kopiLuwak: {
              title: 'Conflicting Experience: Kopi Luwak',
              source: 'Civet Coffee: Brewing the Next Pandemic'
            },
            egg: {
              title: 'Conflicting Experience: Egg',
              source: 'What\'s behind Britain\'s egg shortage? - BBC Newsnight'
            },
            egg2: {
              title: 'Conflicting Experience: Egg #2'
            },
            salmon: {
              title: 'Conflicting Experience: Salmon',
              source: 'Salmon shortages in Alaska\'s Yukon River are changing Native ways of life'
            },
            standSteady: {
              desc: 'The performer performs a three-point headstand with head immersed in a bucket, using the performer\'s breath signals to strike the bucket.'
            },
            observingTofu: {
              desc: 'A series of observations conducted during the process of squeezing out excess water from tofu.'
            },
            nose: {
              title: 'Nose',
              desc: 'Using the snoring signals during sleep to tap on the pot lid.'
            },
            painting: {
              desc: 'Using a small knife to shave pigment from a pastel, the sound of the knife serves as a signal to vibrate the paper, allowing the pigment to naturally fall and become a painting.'
            }
          }
        },
        dance: {
          title: 'Dance Sound Design',
          desc: 'Sound and music design for contemporary dance and butoh performance'
        },
        research: {
          title: 'Research'
        },
        bandcamp: 'Listen on Bandcamp',
        youtube: 'Watch on YouTube'
      },
      contact: {
        title: 'Contact',
        desc: 'Open to collaborations, performance invitations, and any exchange',
        course: {
          title: 'Course',
          modular: 'Modular Synth Sound Design Online Course Registration',
          handout: 'Course handout download'
        },
        email: 'Email',
        social: 'Social',
        bandcamp: 'Bandcamp',
        youtube: 'YouTube',
        instagram: 'Instagram',
        github: 'GitHub',
        about: {
          title: 'About',
          bio: 'MADZINE is a multimedia artist from Kaohsiung, Taiwan, based between Europe and Japan. He creates through improvisation and balance of natural, electronic, acoustic, and digital elements. His artistic career began in Tokyo and Berlin, extending to numerous exhibitions and residency programs across Europe and Japan. With over a decade of experience in sound design education, he serves as an endorsed artist for the Soundfreak modular synthesizer brand. Additionally, he began software development in 2025, and has since developed more than a dozen custom audiovisual applications and over thirty digital modular synthesizers.'
        }
      },
      brand: {
        tagline: 'Taiwanese Sound Designer based in Tokyo'
      },
      footer: {
        copyright: '\u00A9 2025 MADZINE. All rights reserved.'
      },
      tutorial: {
        handout: 'Modular Synth Sound Design',
        handoutDesc: 'Course handout download'
      },
      mod: {
        uni_rhythm: {
          desc: 'Compact 4-track rhythm generator with 10 world music styles, 8-voice drum synthesis, primary-priority merged outputs, master isolator and drive, and 16-channel poly output for Portal',
          feat0: '10 world music rhythm styles with per-role selection',
          feat1: '4 rhythmic roles: Timeline, Foundation, Groove, Lead',
          feat2: '8-voice ExtendedDrumSynth (2 voices per role)',
          feat3: 'Per-role FREQ/DECAY/VEL controls with CV',
          feat4: 'EXT IN for external sound sources per role',
          feat5: 'Master 3-band isolator (LOW/MID/HIGH) and tube drive',
          feat6: 'Stereo MIX L/R output with SPREAD control',
          feat7: '16-channel POLY output for Portal crossfading',
          manual: '<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Overview</h3>\n<p style="margin-bottom: 1rem;">Compact 4-track cross-cultural rhythm generator with 10 world music styles and 8-voice integrated drum synthesis. Each of the 4 roles (Timeline, Foundation, Groove, Lead) features independent pattern sequencing with 2 synthesized voices, supporting per-role style selection, density and length control, external audio input mixing, and fill patterns. The master section provides a 3-band isolator, tube drive, stereo spread, and a 16-channel polyphonic output designed for seamless crossfading with the Portal module.</p>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">4-Role System</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Timeline</b> (Voices 0-1): Time-keeping layer. Bells, hi-hats, and ride cymbals in the 3-12kHz range.</li>\n<li><b>Foundation</b> (Voices 2-3): Bass layer at 40-150Hz. Kick drums and low-frequency bass drums.</li>\n<li><b>Groove</b> (Voices 4-5): Mid-range 250-700Hz. Snare drums, claps, and congas.</li>\n<li><b>Lead</b> (Voices 6-7): High-frequency embellishments and accents. Ghost notes and fills.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Per-Role Controls</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>STYLE</b>: Rhythm style (0-9, snapped to integers). Each role can have a different style. CV: ±5V selects style.</li>\n<li><b>DENSITY</b>: Pattern density (0-100%). Foundation default 20%, Timeline 40%, others 50%. CV: ±5V modulation.</li>\n<li><b>LENGTH</b>: Pattern length (4-32 steps, integer snap).</li>\n<li><b>FREQ</b>: Frequency modifier (-1 to +1 octave). CV: ±1V = ±0.2 octave.</li>\n<li><b>DECAY</b>: Decay multiplier (0.2x to 2.0x). CV: ±1V = ±0.18x (±5V = ±0.9x).</li>\n<li><b>MIX</b>: Blend between internal synth (0%) and external audio (100%).</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">External Audio Inputs</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>EXT IN 1/2</b>: Two external audio inputs per role, corresponding to voice 1 and voice 2.</li>\n<li><b>VCA Envelope</b>: External audio volume responds to hit velocity with natural dynamics. Decay is faster for louder hits.</li>\n<li><b>MIX Knob</b>: Crossfades between internal drum synthesis and external audio sources.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Global Parameters</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Variation</b>: Pattern variation amount (default 30%). Controls how much patterns evolve over time.</li>\n<li><b>Humanize</b>: Humanize timing and velocity (default 50%). Adds organic feel to rhythms.</li>\n<li><b>Swing</b>: Swing amount (default 50%). Adjusts timing of off-beat notes.</li>\n<li><b>Rest</b>: Rest probability with CV input. Removes hits from patterns probabilistically.</li>\n<li><b>Fill</b>: Combined fill probability and intensity (default 30%). Pre-determined at bar start.</li>\n<li><b>Articulation</b>: Articulation amount. Enables Ghost, Accent, Rim, Flam, Drag, Buzz, Ruff articulations.</li>\n<li><b>Ghost Notes</b>: Ghost note probability.</li>\n<li><b>Accent</b>: Accent probability.</li>\n<li><b>Spread</b>: Stereo spread for mix output (default 50%).</li>\n<li><b>Regenerate</b>: Generate new patterns based on current settings.</li>\n<li><b>Reset</b>: Reset all step counters to zero.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Master Section</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Isolator Low</b>: 3-band isolator low band (250Hz crossover). Bipolar: -1 = kill, 0 = unity, +1 = +12dB boost.</li>\n<li><b>Isolator Mid</b>: 3-band isolator mid band (250Hz-4kHz). Same bipolar control.</li>\n<li><b>Isolator High</b>: 3-band isolator high band (4kHz crossover). Same bipolar control.</li>\n<li><b>Master Drive</b>: Asymmetric tube saturation (0-100%). Creates warm even harmonics with DC blocker.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Primary-Priority Merged Outputs</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Audio</b>: Sum of both voices per role (primary + secondary).</li>\n<li><b>Gate</b>: Merged gate output. When both voices trigger simultaneously, primary voice takes priority.</li>\n<li><b>Pitch CV</b>: 1V/Oct pitch output from the last triggered voice (primary priority). C4 = 0V.</li>\n<li><b>Vel/Env</b>: Velocity envelope CV (0-10V) from the priority voice.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Clock and Timing</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>CLK</b>: External clock input. Required for pattern playback.</li>\n<li><b>RST</b>: Reset input. Returns all step counters to zero.</li>\n<li><b>REGEN</b>: Regenerate trigger input. Generates new patterns based on current settings.</li>\n<li><b>PPQN</b>: 1 (quarter), 2 (8th), or 4 (16th note) pulses per quarter. Set via right-click menu.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Outputs</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Per-Role Audio</b>: Individual role audio output (sum of 2 voices).</li>\n<li><b>Per-Role Gate</b>: Merged trigger output per role.</li>\n<li><b>Per-Role Pitch</b>: 1V/Oct CV output per role.</li>\n<li><b>Per-Role Vel/Env</b>: Velocity envelope CV output per role.</li>\n<li><b>MIX L/R</b>: Stereo master mix with isolator, drive, and spread applied.</li>\n<li><b>POLY</b>: 16-channel polyphonic output. 4 roles x 4 channels (Audio, Gate, Pitch, VelEnv). Designed for Portal.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Per-Role Parameter Reference</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Timeline Style</b>: Timeline role rhythm style (0-9, integer snap).</li>\n<li><b>Timeline Density</b>: Timeline role pattern density (0-100%, default 40%).</li>\n<li><b>Timeline Length</b>: Timeline role pattern length (4-32 steps, integer snap).</li>\n<li><b>Timeline Freq</b>: Timeline role frequency modifier (-1 to +1 octave).</li>\n<li><b>Timeline Decay</b>: Timeline role decay multiplier (0.2x to 2.0x).</li>\n<li><b>Timeline Mix (Int/Ext)</b>: Timeline role internal synth (0%) to external audio (100%).</li>\n<li><b>Foundation Style</b>: Foundation role rhythm style (0-9, integer snap).</li>\n<li><b>Foundation Density</b>: Foundation role pattern density (0-100%, default 20%).</li>\n<li><b>Foundation Length</b>: Foundation role pattern length (4-32 steps, integer snap).</li>\n<li><b>Foundation Freq</b>: Foundation role frequency modifier (-1 to +1 octave).</li>\n<li><b>Foundation Decay</b>: Foundation role decay multiplier (0.2x to 2.0x).</li>\n<li><b>Foundation Mix (Int/Ext)</b>: Foundation role internal synth (0%) to external audio (100%).</li>\n<li><b>Groove Style</b>: Groove role rhythm style (0-9, integer snap).</li>\n<li><b>Groove Density</b>: Groove role pattern density (0-100%, default 50%).</li>\n<li><b>Groove Length</b>: Groove role pattern length (4-32 steps, integer snap).</li>\n<li><b>Groove Freq</b>: Groove role frequency modifier (-1 to +1 octave).</li>\n<li><b>Groove Decay</b>: Groove role decay multiplier (0.2x to 2.0x).</li>\n<li><b>Groove Mix (Int/Ext)</b>: Groove role internal synth (0%) to external audio (100%).</li>\n<li><b>Lead Style</b>: Lead role rhythm style (0-9, integer snap).</li>\n<li><b>Lead Density</b>: Lead role pattern density (0-100%, default 50%).</li>\n<li><b>Lead Length</b>: Lead role pattern length (4-32 steps, integer snap).</li>\n<li><b>Lead Freq</b>: Lead role frequency modifier (-1 to +1 octave).</li>\n<li><b>Lead Decay</b>: Lead role decay multiplier (0.2x to 2.0x).</li>\n<li><b>Lead Mix (Int/Ext)</b>: Lead role internal synth (0%) to external audio (100%).</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Input Reference</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Clock</b>: Clock input for pattern playback.</li>\n<li><b>Reset</b>: Reset input. Returns all step counters to zero.</li>\n<li><b>Regenerate</b>: Trigger input to generate new patterns.</li>\n<li><b>Rest CV</b>: CV input for rest probability modulation.</li>\n<li><b>Fill Trigger</b>: Trigger input for fill activation.</li>\n<li><b>Timeline Style CV</b>: CV input for Timeline style modulation.</li>\n<li><b>Timeline Density CV</b>: CV input for Timeline density modulation.</li>\n<li><b>Timeline Freq CV</b>: CV input for Timeline frequency modulation.</li>\n<li><b>Timeline Decay CV</b>: CV input for Timeline decay modulation.</li>\n<li><b>Foundation Style CV</b>: CV input for Foundation style modulation.</li>\n<li><b>Foundation Density CV</b>: CV input for Foundation density modulation.</li>\n<li><b>Foundation Freq CV</b>: CV input for Foundation frequency modulation.</li>\n<li><b>Foundation Decay CV</b>: CV input for Foundation decay modulation.</li>\n<li><b>Groove Style CV</b>: CV input for Groove style modulation.</li>\n<li><b>Groove Density CV</b>: CV input for Groove density modulation.</li>\n<li><b>Groove Freq CV</b>: CV input for Groove frequency modulation.</li>\n<li><b>Groove Decay CV</b>: CV input for Groove decay modulation.</li>\n<li><b>Lead Style CV</b>: CV input for Lead style modulation.</li>\n<li><b>Lead Density CV</b>: CV input for Lead density modulation.</li>\n<li><b>Lead Freq CV</b>: CV input for Lead frequency modulation.</li>\n<li><b>Lead Decay CV</b>: CV input for Lead decay modulation.</li>\n<li><b>Timeline Audio Input 1</b>: External audio input 1 for Timeline role.</li>\n<li><b>Timeline Audio Input 2</b>: External audio input 2 for Timeline role.</li>\n<li><b>Foundation Audio Input 1</b>: External audio input 1 for Foundation role.</li>\n<li><b>Foundation Audio Input 2</b>: External audio input 2 for Foundation role.</li>\n<li><b>Groove Audio Input 1</b>: External audio input 1 for Groove role.</li>\n<li><b>Groove Audio Input 2</b>: External audio input 2 for Groove role.</li>\n<li><b>Lead Audio Input 1</b>: External audio input 1 for Lead role.</li>\n<li><b>Lead Audio Input 2</b>: External audio input 2 for Lead role.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Output Reference</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Timeline Audio</b>: Timeline role merged audio output (sum of 2 voices).</li>\n<li><b>Timeline Gate</b>: Timeline role merged gate/trigger output (primary priority).</li>\n<li><b>Timeline Pitch CV (1V/Oct, C4=0V)</b>: Timeline role pitch CV output.</li>\n<li><b>Timeline Velocity Envelope</b>: Timeline role velocity envelope CV output.</li>\n<li><b>Foundation Audio</b>: Foundation role merged audio output (sum of 2 voices).</li>\n<li><b>Foundation Gate</b>: Foundation role merged gate/trigger output (primary priority).</li>\n<li><b>Foundation Pitch CV (1V/Oct, C4=0V)</b>: Foundation role pitch CV output.</li>\n<li><b>Foundation Velocity Envelope</b>: Foundation role velocity envelope CV output.</li>\n<li><b>Groove Audio</b>: Groove role merged audio output (sum of 2 voices).</li>\n<li><b>Groove Gate</b>: Groove role merged gate/trigger output (primary priority).</li>\n<li><b>Groove Pitch CV (1V/Oct, C4=0V)</b>: Groove role pitch CV output.</li>\n<li><b>Groove Velocity Envelope</b>: Groove role velocity envelope CV output.</li>\n<li><b>Lead Audio</b>: Lead role merged audio output (sum of 2 voices).</li>\n<li><b>Lead Gate</b>: Lead role merged gate/trigger output (primary priority).</li>\n<li><b>Lead Pitch CV (1V/Oct, C4=0V)</b>: Lead role pitch CV output.</li>\n<li><b>Lead Velocity Envelope</b>: Lead role velocity envelope CV output.</li>\n<li><b>Mix L</b>: Left stereo master mix output (with isolator, drive, spread).</li>\n<li><b>Mix R</b>: Right stereo master mix output (with isolator, drive, spread).</li>\n<li><b>Poly Out (16ch for Portal)</b>: 16-channel polyphonic output (4 roles x 4 channels).</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Technical Specifications</h3>\n<ul style="padding-left: 1.5rem;">\n<li>Module width: 32HP</li>\n<li>Voice count: 8 (2 per role)</li>\n<li>Synth modes: SINE (pitched), NOISE (unpitched)</li>\n<li>Pattern length: 4-32 steps per role</li>\n<li>Isolator crossovers: 250Hz / 4kHz (Linkwitz-Riley 4th order)</li>\n<li>Drive: Asymmetric tube saturation with DC blocker</li>\n<li>Poly output: 16 channels (4 roles x 4 data types)</li>\n<li>Processing: 32-bit floating point</li>\n</ul>'
        },
        portal: {
          desc: 'Poly crossfader for UniRhythm with 3-band isolator, tube drive, DJ-style cue monitoring, and selectable crossfader curve',
          feat0: '2x 16-channel poly input (A/B decks from UniRhythm)',
          feat1: 'Crossfader with 3 curve types: Linear, Equal Power, Cut',
          feat2: '3-band isolator (LOW/MID/HIGH) with kill capability',
          feat3: 'Tube drive with asymmetric saturation',
          feat4: 'DJ-style CUE A/B monitoring with dedicated stereo output',
          feat5: 'Per-role CV outputs: Gate, Pitch, Vel/Env (crossfaded)',
          manual: '<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Overview</h3>\n<p style="margin-bottom: 1rem;">Poly crossfader designed for mixing between two UniRhythm modules in a DJ-style workflow. Accepts two 16-channel polyphonic inputs (Deck A and Deck B) from UniRhythm\'s POLY output, providing smooth crossfading between rhythm generators with a 3-band isolator, tube drive, and dedicated cue monitoring output. The crossfader curve can be selected from three types via the right-click menu. Per-role CV outputs (Gate, Pitch, Vel/Env) are also crossfaded for external synthesis control.</p>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Poly Channel Layout</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Channels 0-3</b>: Timeline (Audio, Gate, Pitch, VelEnv)</li>\n<li><b>Channels 4-7</b>: Foundation (Audio, Gate, Pitch, VelEnv)</li>\n<li><b>Channels 8-11</b>: Groove (Audio, Gate, Pitch, VelEnv)</li>\n<li><b>Channels 12-15</b>: Lead (Audio, Gate, Pitch, VelEnv)</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Crossfader</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>XFADE Slider</b>: Horizontal slider. A (left) to B (right). Default: center (50%).</li>\n<li><b>Cross CV</b>: CV input for crossfader position. ±10V maps to ±1.0 position offset (coefficient 0.1).</li>\n<li><b>Linear Curve</b>: Straight gain crossfade. A = 1-pos, B = pos.</li>\n<li><b>Equal Power (default)</b>: Constant power crossfade using sine/cosine. No dip at center.</li>\n<li><b>Cut Curve</b>: DJ-style hard cut with overlap zone. A stays at full until 40%, B stays at full after 60%.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Isolator</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>LOW</b>: Low band gain (below 250Hz). Bipolar: -1 = kill, 0 = unity, +1 = +12dB boost. Quadratic cut for musical feel.</li>\n<li><b>MID</b>: Mid band gain (250Hz-4kHz). Same bipolar control.</li>\n<li><b>HIGH</b>: High band gain (above 4kHz). Same bipolar control.</li>\n<li><b>Filter Type</b>: Linkwitz-Riley 4th order (cascaded 2nd order Butterworth) for phase-coherent crossover.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Drive</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>DRIVE</b>: Master tube drive (0-100%). Asymmetric waveshaping: soft saturation on positive, harder on negative for even harmonics.</li>\n<li><b>Makeup Gain</b>: Automatic gain compensation to maintain perceived volume.</li>\n<li><b>DC Blocker</b>: 1st order high-pass at ~10Hz removes DC offset from saturation.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Cue Monitoring</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>CUE Button</b>: Toggle between A and B. Displays current selection as colored text.</li>\n<li><b>CUE L/R</b>: Dedicated stereo output for headphone monitoring. Outputs raw audio from selected deck (A or B) without crossfader, isolator, or drive processing.</li>\n<li><b>Use Case</b>: Pre-listen to the incoming deck before crossfading, just like a DJ mixer.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">CV Outputs</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Gate</b>: Crossfaded gate signal per role (Timeline, Foundation, Groove, Lead).</li>\n<li><b>Pitch</b>: Crossfaded pitch CV per role (1V/Oct).</li>\n<li><b>Vel/Env</b>: Crossfaded velocity envelope CV per role.</li>\n<li><b>Layout</b>: Upper group (Timeline + Groove), Lower group (Foundation + Lead).</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Inputs</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Poly in A</b>: 16-channel polyphonic input from UniRhythm Deck A.</li>\n<li><b>Poly in B</b>: 16-channel polyphonic input from UniRhythm Deck B.</li>\n<li><b>Cross CV</b>: Crossfader position CV modulation (±10V, coefficient 0.1).</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Outputs</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Master L/R</b>: Stereo master output with crossfade, isolator, drive, and soft clip applied.</li>\n<li><b>CUE L/R</b>: Stereo cue monitoring output (raw selected deck audio).</li>\n<li><b>Per-Role Gate/Pitch/VelEnv</b>: 4 roles x 3 CV types = 12 crossfaded CV outputs.</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Technical Specifications</h3>\n<ul style="padding-left: 1.5rem;">\n<li>Module width: 8HP</li>\n<li>Poly input: 16 channels per deck</li>\n<li>Crossfader curves: Linear, Equal Power, Cut</li>\n<li>Isolator crossovers: 250Hz / 4kHz (Linkwitz-Riley 4th order)</li>\n<li>Drive: Asymmetric tube saturation with DC blocker (~10Hz)</li>\n<li>Output limiting: Soft clip via tanh</li>\n<li>Processing: 32-bit floating point</li>\n<li><b>Crossfader</b>: DJ-style crossfader between Deck A and Deck B. 0%=full A, 100%=full B. CV modulated via Crossfader CV input.</li>\n<li><b>Cue A/B</b>: Cue routing switch. Selects which deck (A or B) is sent to the Cue output for monitoring.</li>\n<li><b>Deck A (16ch poly)</b>: 16-channel polyphonic input for Deck A. Channels are decoded into individual track signals.</li>\n<li><b>Deck B (16ch poly)</b>: 16-channel polyphonic input for Deck B. Channels are decoded into individual track signals.</li>\n<li><b>Crossfader CV</b>: CV input for crossfader position modulation (&plusmn;10V, coefficient 0.1, adds offset to crossfader position).</li>\n<li><b>Master L</b>: Master left channel output. Main stereo mix after crossfader, isolator, drive, and soft clip.</li>\n<li><b>Master R</b>: Master right channel output. Main stereo mix after crossfader, isolator, drive, and soft clip.</li>\n<li><b>Cue L</b>: Cue left channel output for headphone monitoring.</li>\n<li><b>Cue R</b>: Cue right channel output for headphone monitoring.</li>\n</ul>'
        }
      },
      common: {
        back: 'Back',
        more: 'Learn More',
        intro: 'Introduction',
        features: 'Highlights',
        tech: 'Technical Info',
        platform: 'Platform',
        language: 'Language',
        version: 'Version',
        license: 'License'
      }
    },

    'ja': {
      nav: {
        home: 'ホーム',
        works: '作品',
        software: 'ソフトウェア',
        contact: 'お問い合わせ'
      },
      hero: {
        title: 'MADZINE',
        subtitle: 'メディアアート・ソフトウェア開発',
        description: '芸術に厳しく、人生に優しく'
      },
      section: {
        works: {
          title: '主な作品',
          desc: '音楽、サウンドインスタレーション、ライブパフォーマンス',
          more: 'すべての作品を見る'
        },
        software: {
          title: 'ソフトウェア',
          desc: 'VCV Rack モジュールとオリジナルアプリケーション',
          more: 'すべてのソフトウェアを見る'
        },
        contact: {
          desc: 'コラボレーションのお問い合わせとソーシャルリンク'
        }
      },
      software: {
        vcv: {
          title: 'VCV Rack モジュール',
          desc: 'MADZINEモジュールシリーズ。モジュラーシンセシスにユニークなサウンドプロセッシングツールを',
          browse: '完全なモジュールマニュアルを見る',
          count: '6カテゴリ、38モジュール'
        },
        apps: {
          title: 'アプリケーション',
          desc: 'オリジナルオーディオツールとクリエイティブソフトウェア'
        }
      },
      apps: {
        decapyramid: {
          name: 'DECAPyramid',
          desc: '8トラック 3D VBAP 空間ミキサー',
          platform: 'macOS, iOS',
          intro: 'DECAPyramid は MADZINE VCV Rack モジュールから独立した商用版 8トラック 3D VBAP 空間ミキサーです。8スピーカーキューブ配置の Vector Base Amplitude Panning（VBAP）アルゴリズムにより、各トラックの音源を三次元空間内でリアルタイムに定位します。等角投影の 3D ビューで音源位置をドラッグ操作でき、グローバル概観モードとトラック別操作モードの両方を提供。<br><br>各トラックには 4モードの 3D LFO を搭載：手動モードで直接位置制御、シーケンサーモードでプリセットパスポイントの循環移動、ランダムモードで予測不能な空間軌跡生成、ローテートモードで指定軸の周期的回転が可能。LFO は速度、振幅、スムースネスのパラメータ調整に対応し、カスタムパスの録音も可能。各トラックにはさらに 7種の Biquad フィルター（ローパス、ハイパス、バンドパス、ノッチ、ピーク、ローシェルフ、ハイシェルフ）、Peak/RMS デュアルモード VU メーター、独立した Send A/B コントロールを装備。<br><br>オーディオルーティングは macOS CoreAudio IOProc によるマルチデバイス同時出力に対応し、最大 22チャンネルの出力構成をサポート。各出力チャンネルは物理デバイスとチャンネル位置を個別に割り当て可能です。C++17 DSP コアが全リアルタイムオーディオ演算を処理し、Swift/SwiftUI フロントエンドがインターフェースを担当、macOS と iOS の両プラットフォームに対応。プリセットシステムは JSON 形式でミキサー状態を完全保存します。',
          features: {
            vbap: '8スピーカーキューブ VBAP パンニング',
            lfo: '4モード 3D LFO',
            filter: '7種 Biquad フィルタータイプ',
            vu: 'Peak / RMS VU メーター',
            routing: 'マルチデバイスオーディオルーティング（22チャンネル）',
            preset: 'プリセットファイル管理'
          }
        },
        jazzarchitect: {
          name: 'JazzArchitect',
          desc: 'ジャズコード分析と音楽生成 AU プラグイン',
          platform: 'macOS, iOS',
          intro: 'JazzArchitect は Rohrmeier（2020）が提唱した再帰文法フレームワークに基づくルールベースのジャズハーモニー生成器です。確率的文脈自由文法（PCFG）をコアとし、Tonic、Dominant、Subdominant などの非終端記号の再帰的展開と確率的選択により、ジャズ和声理論に準拠したコード進行を生成します。トライトーン代理、ii-V 進行、セカンダリードミナントなどのジャズ代理規則を内蔵し、理論的に正しい機能和声構造を持つ結果を出力します。<br><br>9種のジャズスタイルのパラメータ化設定に対応し、Bebop、Hard Bop、Modal Jazz、Cool Jazz など異なる時代・ジャンルをカバー。StyleVector メカニズムが各スタイル内の規則の生成確率ウェイトを制御し、ベクトルパラメータの調整により異なるスタイルの特徴をブレンドできます。コード進行生成後、システムが自動的にヴォイスリーディング最適化アルゴリズムを実行し、隣接コード間の最小声部移動距離を計算して滑らかな声部接続を確保。内蔵コード合成エンジンがリアルタイム試聴機能を提供します。<br><br>スタンドアロンアプリと Audio Unit v3 プラグインの両形式で提供。AU プラグインとしては Logic Pro や GarageBand などの DAW で MIDI ジェネレーターとして機能し、コードの MIDI 信号を他のトラックに出力します。生成したコード進行を PDF 楽譜としてエクスポート可能。C++ DSP コアと Swift UI フロントエンドの構成で、macOS と iOS に対応。',
          features: {
            pcfg: 'PCFGベースのジャズコード進行生成',
            styles: '9種ジャズスタイル対応',
            voicing: 'ヴォイスリーディング最適化',
            synth: 'コード合成エンジン',
            vector: 'スタイルベクトルコントロール',
            pdf: 'PDF 楽譜エクスポート'
          }
        },
        complexrhythmer: {
          name: 'ComplexRhythmer',
          desc: '8トラック ポリメトリック複合リズムマシン',
          platform: 'macOS, iOS',
          intro: 'ComplexRhythmer は HTML 版 TriRhythm からネイティブ macOS/iOS アプリケーションへ移植された 8トラック ポリメトリック複合リズムマシンです。コアとなるのは最小公倍数（LCM）ベースのマルチクロックスケジューリングアルゴリズムで、各トラックに任意の拍子分割を設定できます。複数トラックが異なる分割設定で同時に動作する場合（例：3:4:5 の組み合わせ）、システムが全トラックの最小公倍数を自動計算し、完全な周期長として各トラックのトリガーポイントを周期内で正確にスケジューリングし、複合リズムパターンを生成します。<br><br>インターフェースはタイムラインセクション管理機能を提供し、異なるリズム構成を独立したセクションとして保存し、複数セクションを順番に配置して完全な演奏構造を構築できます。各セクションはトラック分割、音色、音量パラメータをそれぞれ設定可能。ビジュアルプレイヘッドがアニメーションで全トラックのビート位置とトリガー状態をリアルタイム表示し、直感的なリズムの視覚的フィードバックを提供します。内蔵ドラムシンセシスエンジンがオーディオ出力を生成し、トラックごとにピッチ、ディケイ、音量を調整可能。<br><br>スタンドアロンアプリと Audio Unit v3 プラグインの両形式で提供され、Logic Pro などの DAW に読み込んで使用できます。Ableton Link プロトコルに対応し、同一ネットワーク内の他の Link 対応デバイスとのビート・テンポ同期が可能。C++ DSP コアと Swift/SwiftUI フロントエンドの構成で、macOS と iOS の両プラットフォームに対応。',
          features: {
            tracks: '8トラック独立分割設定（任意拍子、例 3:4:5）',
            lcm: '最小公倍数ベースの同期グリッド',
            section: 'タイムラインセクション管理',
            playhead: 'ビジュアルプレイヘッド',
            au: 'Audio Unit v3 プラグイン対応',
            link: 'Ableton Link 同期'
          }
        },
        edgy: {
          name: 'Edgy',
          desc: 'ジェスチャー検出画像処理、MIDI/OSC 出力',
          platform: 'macOS, iOS',
          intro: 'Edgy は macOS と iOS に対応した MIDI/OSC コントローラーアプリケーションです。主な機能は実機の写真を操作可能なコントロールパネルに変換することです。カメラでシンセサイザー、ミキサー、その他のオーディオ機器を撮影し、写真を背景に設定した上で、画像上にスライダー、ノブ、ボタンなどのタッチコントロール要素を自由に配置でき、各要素に MIDI CC 番号または OSC アドレスを個別に割り当てられます。<br><br>MediaPipe ジェスチャー検出エンジンを統合し、リアルタイムの手のランドマーク追跡とジェスチャー認識に対応、検出されたジェスチャーを MIDI 信号出力にマッピングできます。マルチタッチ機能により複数のコントロールを同時に操作可能。グリッドモードでは最大 200 信号のグリッドコントロールインターフェースを提供し、各セルを Continuous（連続値）、Trigger（単発トリガー）、Gate（持続トリガー）モードに個別設定可能。グリッドの X 軸と Y 軸にそれぞれ異なる制御動作を設定でき、二次元のコントロールマッピングを実現します。<br><br>すべての制御信号は MIDI または OSC プロトコルで外部ソフトウェア・ハードウェアデバイスに出力されます。プリセット管理システムで異なるコントロール構成の保存・読み込みが可能で、iCloud Drive によるデバイス間同期に対応。10種のカラーテーマを搭載。macOS と iOS の両プラットフォームに対応し、Swift/SwiftUI で開発。',
          features: {
            gesture: 'リアルタイムジェスチャー分析',
            canvas: 'マルチタッチキャンバス',
            grid: 'カスタマイズ可能なグリッドコントローラー（スライダー、円形フィル）',
            midi: 'MIDI / OSC 出力マッピング',
            preset: 'プリセット管理',
            gridxy: 'グリッド X/Y 独立モード',
            icloud: 'iCloud Drive プリセット同期',
            themes: '10種カラーテーマ'
          }
        },
        watchnext: {
          name: 'WatchNext',
          desc: 'クロスプラットフォーム ストリーミング検索ツール',
          platform: 'macOS, iOS',
          intro: 'WatchNext は macOS と iOS に対応したクロスプラットフォーム ストリーミング検索ツールです。TMDB API の Watch Providers インターフェースを統合し、Apple TV、Netflix、Prime Video、Disney+ などの主要ストリーミングプラットフォームのコンテンツカタログを一括検索できます。特定のプラットフォームと地域を選択すると、システムがその地域で視聴可能な全映画・番組を自動的にリスト表示し、人気度、評価、公開日など複数の基準でソート可能。<br><br>検索結果には TMDB 評価情報が表示され、OMDb API を通じて IMDb スコアと Rotten Tomatoes フレッシュネス指数も統合、3つの評価ソースの並列比較を提供します。ジャンルフィルタリングで結果を特定カテゴリに絞り込み可能。地域選択は世界 120 地域に対応し、選択した地域に基づいて各プラットフォームの利用可能コンテンツを自動フィルタリング、最近使用した地域を上位に表示して素早い切り替えを実現。映画タイトル、俳優、監督によるキーワード検索に対応。<br><br>お気に入り機能でユーザーが興味のある映画・番組をブックマークでき、お気に入りデータは iCloud を通じてデバイス間で同期されます。インターフェースは英語、日本語、繁体字中国語の 3言語に対応。Swift/SwiftUI で開発され、データ層に SwiftData を採用。MIT ライセンスで GitHub にて公開されているオープンソースプロジェクトです。',
          features: {
            search: 'マルチプラットフォーム検索（Apple TV、Netflix、Prime Video、Disney+）',
            rating: 'IMDb / Rotten Tomatoes 評価比較',
            genre: 'ジャンルフィルタリング',
            region: '地域選択（120地域）',
            favorites: 'お気に入りコレクション（iCloud 同期）',
            multilang: '多言語インターフェース（EN / JA / ZH）'
          }
        },
        anyani: {
          name: 'AnyAni',
          desc: 'ストップモーションアニメーション制作ツール、AI超解像・補間',
          platform: 'macOS, Windows',
          intro: 'AnyAni は画像シーケンスを動画に変換するストップモーションアニメーション制作ツールです。フレームごとのスケール、オフセット、回転、クロマキー背景除去に対応し、Fade/Dissolve トランジション効果を内蔵しています。<br><br>AI 超解像機能は Real-ESRGAN モデルを使用。macOS 版では CoreML が Apple Neural Engine を駆動し、従来の Vulkan と比べ 2-6 倍高速に処理します。512x512 タイル分割とオーバーラップブレンディングにより、元のアスペクト比を維持します。Windows 版は ncnn-vulkan を使用し、NVIDIA、AMD、Intel GPU に対応。<br><br>RIFE AI 補間でフレーム数を 2-16 倍に増加でき、トランジション効果と同時に動作します。ハードウェアエンコードは VideoToolbox（macOS）または NVENC/AMF/QSV（Windows）を優先使用し、ソフトウェアフォールバックには OpenH264（BSD ライセンス、GPL 依存なし）を使用します。<br><br>Rust + egui で開発、wgpu compute shader による GPU 合成。英語、日本語、繁体字中国語の 3 言語インターフェースに対応。',
          features: {
            upscale: 'AI 超解像（Real-ESRGAN、2x/4x、Photo/Anime モデル）',
            rife: 'AI フレーム補間（RIFE、2x/4x/8x/16x）',
            transition: 'トランジション（Fade / Dissolve）',
            chromakey: 'クロマキー（クリックで色選択 + 許容範囲調整）',
            transform: 'フレームごとの変形（スケール / オフセット / 回転）',
            batch: '複数選択バッチ操作',
            multilang: '3 言語インターフェース（EN / JP / TW）'
          }
        }
      },
      works: {
        title: '作品集',
        desc: '音楽制作、サウンドインスタレーション、ライブパフォーマンスの記録',
        residency: {
          title: 'レジデンス'
        },
        filter: {
          all: 'すべて',
          music: '音楽',
          installation: 'インスタレーション',
          performance: 'パフォーマンス'
        },
        music: {
          title: '音楽作品',
          desc: 'オリジナル音楽アルバムとEP',
          albums: {
            dissolvingSounds: {
              desc: 'クラシック音楽の素養に電子音響を融合し、電子楽器と生楽器を完璧にバランスさせている。シンセサイザーとピアノが互いに主役となり、これまでにない聴取体験をもたらす。'
            },
            fragranceLiang: {
              desc: '架空の人物・梁香（フレグランス・リャン）は過去の記憶から生まれ、各人の内なる欲望に応じて異なる姿で現れる。MADとボーカルのAlfaによって創り上げられ、水を媒介として人間と非人間の間の絆を浄化し溶かそうと試みる。'
            },
            helsinkiSapporo: {
              desc: '札幌での3Dプリンターとシンセサイザーの対話の記録と、《STARMAN RETURNs》のコンセプトに沿ったヘルシンキでのテクノライブセット。デジタルとフィジカルの領域で学んだ後の、モジュラーシンセの世界への二つの異なるアプローチを表している。'
            },
            ovOct: {
              desc: 'ロボットドラマー（Polyend Perc）、Buchla、環境サンプリングのコラージュを組み合わせ、ミュージシャンからニューメディアアーティストへの転身の分岐点となり、音符から創作しない作品の始まりでもある。'
            },
            starmanReturns: {
              desc: '有機的な呼吸を持つテクノ作品、宇宙への個人のフィードバックを表現している。'
            },
            matsu: {
              desc: 'ベルリンテクノとシンセウェーブの影響を受け、松の木を見つめながら創作。無機的なテクノと有機的な生命の感覚と感情を融合させている。'
            },
            monologueInAnalogue: {
              desc: 'ビートに依存せず作り上げた新境地。内なる世界と不確実さの観察、多宇宙への精神世界の旅を表現している。'
            }
          }
        },
        performance: {
          title: 'ライブパフォーマンス',
          desc: 'モジュラーシンセサイザー ライブパフォーマンス選集',
          works: {
            utsurobune: {
              desc: '舞踏画家AKIYOとのコラボレーションによる舞踏作品。映像、サウンド、舞台デザインを担当。'
            }
          }
        },
        audiovisual: {
          title: 'Motion and Pictures and Motion Pictures',
          desc: '2024年4月、札幌天神山アートスタジオでのレジデンシー中に制作した一連の映像作品。'
        },
        tutorial: {
          title: 'チュートリアル',
          desc: 'モジュラーシンセサイザー チュートリアルリソース',
          vcvrack: {
            title: 'ゼロから始める VCV Rack',
            desc: 'VCV Rack 入門チュートリアルシリーズ、全8回'
          }
        },
        interactive: {
          title: 'Physical Interaction',
          desc: '人間の行動から収集した音を用いて物体の振動を駆動し、その行動に対応する一連の音響・映像・装置・パフォーマンス作品にさらなる影響を与える。',
          works: {
            kopiLuwak: {
              title: '対立する体験：コピルアック',
              source: 'ジャコウネコのコーヒー：次のパンデミックを醸成する'
            },
            egg: {
              title: '対立する体験：たまご',
              source: 'イギリスの卵不足の裏側とは？- BBC Newsnight'
            },
            egg2: {
              title: '対立する体験：たまご #2'
            },
            salmon: {
              title: '対立する体験：サーモン',
              source: 'アラスカ・ユーコン川の鮭不足が先住民の生活様式を変えている'
            },
            standSteady: {
              desc: 'パフォーマーはバケツに頭を浸し、三点倒立を行い、パフォーマーの呼吸の信号を使ってバケツを叩きます。'
            },
            observingTofu: {
              desc: '豆腐の余分な水分を絞り出す過程で行われた一連の観察'
            },
            nose: {
              title: '鼻',
              desc: '睡眠中のいびきの信号を使って鍋蓋をたたく。'
            },
            painting: {
              desc: '粉彩筆から小刀で顔料を削り出し、小刀の音が紙を振動させる合図となり、顔料が自然に落ちて絵画となる。'
            }
          }
        },
        dance: {
          title: 'ダンス・サウンドデザイン',
          desc: 'コンテンポラリーダンスと舞踏のための音楽・サウンドデザイン'
        },
        research: {
          title: '研究'
        },
        bandcamp: 'Bandcampで聴く',
        youtube: 'YouTubeで見る'
      },
      contact: {
        title: 'お問い合わせ',
        desc: 'コラボレーション、パフォーマンスへの招待、その他のお問い合わせ',
        course: {
          title: 'コース',
          modular: 'モジュラーシンセ サウンドデザイン オンラインコース申し込み',
          handout: 'コース講義ダウンロード'
        },
        email: 'メール',
        social: 'ソーシャル',
        bandcamp: 'Bandcamp',
        youtube: 'YouTube',
        instagram: 'Instagram',
        github: 'GitHub',
        about: {
          title: 'About',
          bio: 'MADZINEは台湾・高雄出身、ヨーロッパと日本を拠点とするメディアアーティスト。自然・電子・音響・デジタルの要素を即興的にバランスさせ制作する。東京とベルリンでキャリアを始め、欧州と日本で展覧会やレジデンスを展開。サウンドデザインの教育経験は10年以上、Soundfreakモジュラーシンセの推薦アーティスト。2025年よりソフトウェア開発を開始し、十数種の音像アプリケーションと30種以上のデジタルモジュールを開発している。'
        }
      },
      brand: {
        tagline: '東京在住の台湾人サウンドデザイナー'
      },
      footer: {
        copyright: '\u00A9 2025 MADZINE. All rights reserved.'
      },
      tutorial: {
        handout: 'モジュラーシンセ サウンドデザイン',
        handoutDesc: 'コース講義ダウンロード'
      },
      mod: {
        uni_rhythm: {
          desc: '10種のワールドミュージックスタイル、8ボイスドラム合成、プライマリプライオリティ統合出力、マスターアイソレーター+ドライブ、Portal用16チャンネルポリ出力を備えたコンパクト4トラックリズムジェネレーター',
          feat0: '10種のワールドミュージックリズムスタイル、ロール別選択可能',
          feat1: '4つのリズムロール：タイムライン、ファウンデーション、グルーヴ、リード',
          feat2: '8ボイスExtendedDrumSynth（ロールあたり2ボイス）',
          feat3: 'ロール別FREQ/DECAY/VELコントロール、CV入力対応',
          feat4: 'ロール別EXT IN外部音源入力',
          feat5: 'マスター3バンドアイソレーター（LOW/MID/HIGH）とチューブドライブ',
          feat6: 'ステレオMIX L/R出力、SPREADコントロール付き',
          feat7: 'Portal用16チャンネルポリ出力',
          manual: '<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">概要</h3>\n<p style="margin-bottom: 1rem;">10種のワールドミュージックスタイルと8ボイス統合ドラム合成を備えたコンパクト4トラッククロスカルチャーリズムジェネレーター。4つのロール（タイムライン、ファウンデーション、グルーヴ、リード）はそれぞれ独立したパターンシーケンサーと2つの合成ボイスを備え、ロール別スタイル選択、Density・Lengthコントロール、外部オーディオ入力ミキシング、フィルパターンをサポート。マスターセクションは3バンドアイソレーター、チューブドライブ、ステレオスプレッド、Portal用16チャンネルポリフォニック出力を搭載。</p>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">4ロールシステム</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Timeline</b>（ボイス0-1）: タイムキーピングレイヤー。ベル、ハイハット、ライドシンバル。3-12kHz帯域。</li>\n<li><b>Foundation</b>（ボイス2-3）: ベースレイヤー、40-150Hz。キックドラムと低域ベースドラム。</li>\n<li><b>Groove</b>（ボイス4-5）: 中域250-700Hz。スネアドラム、クラップ、コンガ。</li>\n<li><b>Lead</b>（ボイス6-7）: 高域装飾音とアクセント。ゴーストノートとフィル。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">ロール別コントロール</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>STYLE</b>: リズムスタイル（0-9、整数スナップ）。各ロールで異なるスタイル選択可能。CV: ±5Vでスタイル選択。</li>\n<li><b>DENSITY</b>: パターン密度（0-100%）。Foundationデフォルト20%、Timeline 40%、その他50%。CV: ±5V変調。</li>\n<li><b>LENGTH</b>: パターン長（4-32ステップ、整数スナップ）。</li>\n<li><b>FREQ</b>: 周波数修正（-1～+1オクターブ）。CV: ±1V = ±0.2オクターブ。</li>\n<li><b>DECAY</b>: ディケイ倍率（0.2x～2.0x）。CV: ±1V = ±0.18x（±5V = ±0.9x）。</li>\n<li><b>MIX</b>: 内部シンセ（0%）と外部オーディオ（100%）のブレンド。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">外部オーディオ入力</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>EXT IN 1/2</b>: ロールごとに2つの外部オーディオ入力、ボイス1とボイス2に対応。</li>\n<li><b>VCA Envelope</b>: 外部オーディオの音量がヒットベロシティに応じて変化。強いヒットほどディケイが速い。</li>\n<li><b>MIX Knob</b>: 内部ドラムシンセと外部オーディオソースのクロスフェード。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">グローバルパラメータ</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Variation</b>: パターンバリエーション量（デフォルト30%）。パターンの時間経過に伴う変化を制御。</li>\n<li><b>Humanize</b>: タイミング・ベロシティヒューマナイズ（デフォルト50%）。リズムにオーガニック感を付加。</li>\n<li><b>Swing</b>: スウィング量（デフォルト50%）。オフビートノートのタイミングを調整。</li>\n<li><b>Rest</b>: 休符確率、CV入力対応。確率的にパターンからヒットを除去。</li>\n<li><b>Fill</b>: フィル確率+強度の統合パラメータ（デフォルト30%）。小節開始時に事前決定。</li>\n<li><b>Articulation</b>: アーティキュレーション量。Ghost、Accent、Rim、Flam、Drag、Buzz、Ruff技法を有効化。</li>\n<li><b>Ghost Notes</b>: ゴーストノート確率。</li>\n<li><b>Accent</b>: アクセント確率。</li>\n<li><b>Spread</b>: ミックス出力のステレオスプレッド（デフォルト50%）。</li>\n<li><b>Regenerate</b>: 現在の設定に基づいて新パターンを生成。</li>\n<li><b>Reset</b>: 全ステップカウンターをゼロにリセット。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">マスターセクション</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Isolator Low</b>: 3バンドアイソレーター低域（250Hzクロスオーバー）。バイポーラ: -1 = Kill、0 = Unity、+1 = +12dBブースト。</li>\n<li><b>Isolator Mid</b>: 3バンドアイソレーター中域（250Hz-4kHz）。同じバイポーラコントロール。</li>\n<li><b>Isolator High</b>: 3バンドアイソレーター高域（4kHzクロスオーバー）。同じバイポーラコントロール。</li>\n<li><b>Master Drive</b>: 非対称チューブサチュレーション（0-100%）。DCブロッカー付きの暖かい偶数倍音を生成。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">プライマリプライオリティ統合出力</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Audio</b>: ロールあたり両ボイスのオーディオ合計（プライマリ+セカンダリ）。</li>\n<li><b>Gate</b>: 統合ゲート出力。両ボイスが同時トリガーの場合、プライマリボイスが優先。</li>\n<li><b>Pitch CV</b>: 最後にトリガーされたボイスの1V/Octピッチ出力（プライマリ優先）。C4 = 0V。</li>\n<li><b>Vel/Env</b>: 優先ボイスのベロシティエンベロープCV（0-10V）。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">クロックとタイミング</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>CLK</b>: 外部クロック入力。パターン再生に必須。</li>\n<li><b>RST</b>: リセット入力。全ステップカウンターをゼロに戻す。</li>\n<li><b>REGEN</b>: リジェネレートトリガー入力。現在の設定に基づいて新パターンを生成。</li>\n<li><b>PPQN</b>: 1（四分音符）、2（八分音符）、または4（十六分音符）。右クリックメニューで設定。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">出力</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Per-Role Audio</b>: 個別ロールオーディオ出力（2ボイス合計）。</li>\n<li><b>Per-Role Gate</b>: ロール別統合トリガー出力。</li>\n<li><b>Per-Role Pitch</b>: ロール別1V/Oct CV出力。</li>\n<li><b>Per-Role Vel/Env</b>: ロール別ベロシティエンベロープCV出力。</li>\n<li><b>MIX L/R</b>: ステレオマスターミックス（アイソレーター、ドライブ、スプレッド適用済み）。</li>\n<li><b>POLY</b>: 16チャンネルポリフォニック出力。4ロール×4チャンネル（Audio、Gate、Pitch、VelEnv）。Portal用に設計。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Per-Role Parameter Reference</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Timeline Style</b>: Timelineロールリズムスタイル（0-9、整数スナップ）。</li>\n<li><b>Timeline Density</b>: Timelineロールパターン密度（0-100%、デフォルト40%）。</li>\n<li><b>Timeline Length</b>: Timelineロールパターン長（4-32ステップ、整数スナップ）。</li>\n<li><b>Timeline Freq</b>: Timelineロール周波数修正（-1～+1オクターブ）。</li>\n<li><b>Timeline Decay</b>: Timelineロールディケイ倍率（0.2x～2.0x）。</li>\n<li><b>Timeline Mix (Int/Ext)</b>: Timelineロール内部シンセ（0%）から外部オーディオ（100%）。</li>\n<li><b>Foundation Style</b>: Foundationロールリズムスタイル（0-9、整数スナップ）。</li>\n<li><b>Foundation Density</b>: Foundationロールパターン密度（0-100%、デフォルト20%）。</li>\n<li><b>Foundation Length</b>: Foundationロールパターン長（4-32ステップ、整数スナップ）。</li>\n<li><b>Foundation Freq</b>: Foundationロール周波数修正（-1～+1オクターブ）。</li>\n<li><b>Foundation Decay</b>: Foundationロールディケイ倍率（0.2x～2.0x）。</li>\n<li><b>Foundation Mix (Int/Ext)</b>: Foundationロール内部シンセ（0%）から外部オーディオ（100%）。</li>\n<li><b>Groove Style</b>: Grooveロールリズムスタイル（0-9、整数スナップ）。</li>\n<li><b>Groove Density</b>: Grooveロールパターン密度（0-100%、デフォルト50%）。</li>\n<li><b>Groove Length</b>: Grooveロールパターン長（4-32ステップ、整数スナップ）。</li>\n<li><b>Groove Freq</b>: Grooveロール周波数修正（-1～+1オクターブ）。</li>\n<li><b>Groove Decay</b>: Grooveロールディケイ倍率（0.2x～2.0x）。</li>\n<li><b>Groove Mix (Int/Ext)</b>: Grooveロール内部シンセ（0%）から外部オーディオ（100%）。</li>\n<li><b>Lead Style</b>: Leadロールリズムスタイル（0-9、整数スナップ）。</li>\n<li><b>Lead Density</b>: Leadロールパターン密度（0-100%、デフォルト50%）。</li>\n<li><b>Lead Length</b>: Leadロールパターン長（4-32ステップ、整数スナップ）。</li>\n<li><b>Lead Freq</b>: Leadロール周波数修正（-1～+1オクターブ）。</li>\n<li><b>Lead Decay</b>: Leadロールディケイ倍率（0.2x～2.0x）。</li>\n<li><b>Lead Mix (Int/Ext)</b>: Leadロール内部シンセ（0%）から外部オーディオ（100%）。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Input Reference</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Clock</b>: パターン再生用クロック入力。</li>\n<li><b>Reset</b>: リセット入力。全ステップカウンターをゼロに戻す。</li>\n<li><b>Regenerate</b>: 新パターン生成トリガー入力。</li>\n<li><b>Rest CV</b>: 休符確率変調CV入力。</li>\n<li><b>Fill Trigger</b>: フィル発動トリガー入力。</li>\n<li><b>Timeline Style CV</b>: Timelineスタイル変調CV入力。</li>\n<li><b>Timeline Density CV</b>: Timeline密度変調CV入力。</li>\n<li><b>Timeline Freq CV</b>: Timeline周波数変調CV入力。</li>\n<li><b>Timeline Decay CV</b>: Timelineディケイ変調CV入力。</li>\n<li><b>Foundation Style CV</b>: Foundationスタイル変調CV入力。</li>\n<li><b>Foundation Density CV</b>: Foundation密度変調CV入力。</li>\n<li><b>Foundation Freq CV</b>: Foundation周波数変調CV入力。</li>\n<li><b>Foundation Decay CV</b>: Foundationディケイ変調CV入力。</li>\n<li><b>Groove Style CV</b>: Grooveスタイル変調CV入力。</li>\n<li><b>Groove Density CV</b>: Groove密度変調CV入力。</li>\n<li><b>Groove Freq CV</b>: Groove周波数変調CV入力。</li>\n<li><b>Groove Decay CV</b>: Grooveディケイ変調CV入力。</li>\n<li><b>Lead Style CV</b>: Leadスタイル変調CV入力。</li>\n<li><b>Lead Density CV</b>: Lead密度変調CV入力。</li>\n<li><b>Lead Freq CV</b>: Lead周波数変調CV入力。</li>\n<li><b>Lead Decay CV</b>: Leadディケイ変調CV入力。</li>\n<li><b>Timeline Audio Input 1</b>: Timelineロール外部オーディオ入力1。</li>\n<li><b>Timeline Audio Input 2</b>: Timelineロール外部オーディオ入力2。</li>\n<li><b>Foundation Audio Input 1</b>: Foundationロール外部オーディオ入力1。</li>\n<li><b>Foundation Audio Input 2</b>: Foundationロール外部オーディオ入力2。</li>\n<li><b>Groove Audio Input 1</b>: Grooveロール外部オーディオ入力1。</li>\n<li><b>Groove Audio Input 2</b>: Grooveロール外部オーディオ入力2。</li>\n<li><b>Lead Audio Input 1</b>: Leadロール外部オーディオ入力1。</li>\n<li><b>Lead Audio Input 2</b>: Leadロール外部オーディオ入力2。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">Output Reference</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Timeline Audio</b>: Timelineロール統合オーディオ出力（2ボイス合計）。</li>\n<li><b>Timeline Gate</b>: Timelineロール統合ゲート/トリガー出力（プライマリ優先）。</li>\n<li><b>Timeline Pitch CV (1V/Oct, C4=0V)</b>: TimelineロールピッチCV出力。</li>\n<li><b>Timeline Velocity Envelope</b>: TimelineロールベロシティエンベロープCV出力。</li>\n<li><b>Foundation Audio</b>: Foundationロール統合オーディオ出力（2ボイス合計）。</li>\n<li><b>Foundation Gate</b>: Foundationロール統合ゲート/トリガー出力（プライマリ優先）。</li>\n<li><b>Foundation Pitch CV (1V/Oct, C4=0V)</b>: FoundationロールピッチCV出力。</li>\n<li><b>Foundation Velocity Envelope</b>: FoundationロールベロシティエンベロープCV出力。</li>\n<li><b>Groove Audio</b>: Grooveロール統合オーディオ出力（2ボイス合計）。</li>\n<li><b>Groove Gate</b>: Grooveロール統合ゲート/トリガー出力（プライマリ優先）。</li>\n<li><b>Groove Pitch CV (1V/Oct, C4=0V)</b>: GrooveロールピッチCV出力。</li>\n<li><b>Groove Velocity Envelope</b>: GrooveロールベロシティエンベロープCV出力。</li>\n<li><b>Lead Audio</b>: Leadロール統合オーディオ出力（2ボイス合計）。</li>\n<li><b>Lead Gate</b>: Leadロール統合ゲート/トリガー出力（プライマリ優先）。</li>\n<li><b>Lead Pitch CV (1V/Oct, C4=0V)</b>: LeadロールピッチCV出力。</li>\n<li><b>Lead Velocity Envelope</b>: LeadロールベロシティエンベロープCV出力。</li>\n<li><b>Mix L</b>: 左ステレオマスターミックス出力（アイソレーター、ドライブ、スプレッド適用済み）。</li>\n<li><b>Mix R</b>: 右ステレオマスターミックス出力（アイソレーター、ドライブ、スプレッド適用済み）。</li>\n<li><b>Poly Out (16ch for Portal)</b>: 16チャンネルポリフォニック出力（4ロール×4チャンネル）。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">技術仕様</h3>\n<ul style="padding-left: 1.5rem;">\n<li>モジュール幅: 32HP</li>\n<li>ボイス数: 8（ロールあたり2）</li>\n<li>シンセモード: SINE（ピッチあり）、NOISE（ピッチなし）</li>\n<li>パターン長: ロールあたり4-32ステップ</li>\n<li>アイソレータークロスオーバー: 250Hz / 4kHz（リンクウィッツ・ライリー4次）</li>\n<li>ドライブ: 非対称チューブサチュレーション、DCブロッカー付き</li>\n<li>ポリ出力: 16チャンネル（4ロール×4データタイプ）</li>\n<li>処理: 32ビット浮動小数点</li>\n</ul>'
        },
        portal: {
          desc: '3バンドアイソレーター、チューブドライブ、DJスタイルキューモニタリング、選択可能なクロスフェーダーカーブを備えたUniRhythm用ポリクロスフェーダー',
          feat0: '2系統16チャンネルポリ入力（UniRhythmのA/Bデッキ）',
          feat1: '3種のカーブ対応クロスフェーダー：リニア、イコールパワー、カット',
          feat2: '3バンドアイソレーター（LOW/MID/HIGH）、Kill機能付き',
          feat3: 'チューブドライブ非対称サチュレーション',
          feat4: 'DJスタイルCUE A/Bモニタリング、専用ステレオ出力',
          feat5: 'ロール別CV出力：Gate、Pitch、Vel/Env（クロスフェード済み）',
          manual: '<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">概要</h3>\n<p style="margin-bottom: 1rem;">2台のUniRhythmモジュールをDJスタイルでミキシングするためのポリクロスフェーダー。UniRhythmのPOLY出力から2系統の16チャンネルポリフォニック入力（デッキA・デッキB）を受け取り、3バンドアイソレーター、チューブドライブ、専用キューモニタリング出力を備えたスムーズなクロスフェードを提供。クロスフェーダーカーブは右クリックメニューから3種類を選択可能。ロール別CV出力（Gate、Pitch、Vel/Env）もクロスフェード処理され、外部シンセ制御に使用可能。</p>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">ポリチャンネルレイアウト</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Channels 0-3</b>: Timeline（Audio、Gate、Pitch、VelEnv）</li>\n<li><b>Channels 4-7</b>: Foundation（Audio、Gate、Pitch、VelEnv）</li>\n<li><b>Channels 8-11</b>: Groove（Audio、Gate、Pitch、VelEnv）</li>\n<li><b>Channels 12-15</b>: Lead（Audio、Gate、Pitch、VelEnv）</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">クロスフェーダー</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>XFADE Slider</b>: 水平スライダー。A（左）からB（右）。デフォルト：中央（50%）。</li>\n<li><b>Cross CV</b>: クロスフェーダー位置のCV入力。±10Vが±1.0の位置オフセットに対応（係数0.1）。</li>\n<li><b>Linear Curve</b>: ストレートゲインクロスフェード。A = 1-pos、B = pos。</li>\n<li><b>Equal Power (default)</b>: サイン/コサインによる定電力クロスフェード。中央でのディップなし。</li>\n<li><b>Cut Curve</b>: DJスタイルハードカット。Aは40%までフル、Bは60%以降フル。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">アイソレーター</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>LOW</b>: 低域ゲイン（250Hz以下）。バイポーラ: -1 = Kill、0 = Unity、+1 = +12dBブースト。二次曲線カットで音楽的な操作感。</li>\n<li><b>MID</b>: 中域ゲイン（250Hz-4kHz）。同じバイポーラコントロール。</li>\n<li><b>HIGH</b>: 高域ゲイン（4kHz以上）。同じバイポーラコントロール。</li>\n<li><b>Filter Type</b>: リンクウィッツ・ライリー4次（カスケード2次バターワース）、位相コヒーレントクロスオーバー。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">ドライブ</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>DRIVE</b>: マスターチューブドライブ（0-100%）。非対称ウェーブシェーピング：正側ソフトサチュレーション、負側ハードで偶数倍音を生成。</li>\n<li><b>Makeup Gain</b>: 知覚音量を維持する自動ゲイン補正。</li>\n<li><b>DC Blocker</b>: 1次ハイパス約10Hz、サチュレーションによるDCオフセットを除去。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">キューモニタリング</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>CUE Button</b>: AとBを切り替え。カラーテキストで現在の選択を表示。</li>\n<li><b>CUE L/R</b>: 専用ステレオヘッドフォンモニタリング出力。クロスフェーダー、アイソレーター、ドライブ処理なしの、選択デッキ（AまたはB）の生オーディオを出力。</li>\n<li><b>Use Case</b>: DJミキサーのように、クロスフェード前に次のデッキをプリリスン。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">CV出力</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Gate</b>: ロール別クロスフェード済みゲート信号（Timeline、Foundation、Groove、Lead）。</li>\n<li><b>Pitch</b>: ロール別クロスフェード済みピッチCV（1V/Oct）。</li>\n<li><b>Vel/Env</b>: ロール別クロスフェード済みベロシティエンベロープCV。</li>\n<li><b>Layout</b>: 上段グループ（Timeline + Groove）、下段グループ（Foundation + Lead）。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">入力</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Poly in A</b>: UniRhythmデッキAからの16チャンネルポリフォニック入力。</li>\n<li><b>Poly in B</b>: UniRhythmデッキBからの16チャンネルポリフォニック入力。</li>\n<li><b>Cross CV</b>: クロスフェーダー位置CV変調（±10V、係数0.1）。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">出力</h3>\n<ul style="padding-left: 1.5rem; margin-bottom: 1rem;">\n<li><b>Master L/R</b>: ステレオマスター出力（クロスフェード、アイソレーター、ドライブ、ソフトクリップ適用済み）。</li>\n<li><b>CUE L/R</b>: ステレオキューモニタリング出力（選択デッキの生オーディオ）。</li>\n<li><b>Per-Role Gate/Pitch/VelEnv</b>: 4ロール×3 CVタイプ = 12個のクロスフェード済みCV出力。</li>\n</ul>\n\n<h3 style="color: oklch(0.65 0.06 295); margin-bottom: 0.8rem; border-bottom: 2px solid oklch(0.30 0.008 265); padding-bottom: 0.5rem;">技術仕様</h3>\n<ul style="padding-left: 1.5rem;">\n<li>モジュール幅: 8HP</li>\n<li>ポリ入力: デッキあたり16チャンネル</li>\n<li>クロスフェーダーカーブ: リニア、イコールパワー、カット</li>\n<li>アイソレータークロスオーバー: 250Hz / 4kHz（リンクウィッツ・ライリー4次）</li>\n<li>ドライブ: 非対称チューブサチュレーション、DCブロッカー付き（~10Hz）</li>\n<li>出力リミッティング: tanhによるソフトクリップ</li>\n<li>処理: 32ビット浮動小数点</li>\n<li><b>Crossfader</b>: DJスタイルのクロスフェーダー。Deck AとDeck Bの間を制御。0%=完全A、100%=完全B。Crossfader CV入力でCV変調可能。</li>\n<li><b>Cue A/B</b>: キュールーティングスイッチ。モニタリング用にどのデッキ（AまたはB）をキュー出力に送るかを選択。</li>\n<li><b>Deck A (16ch poly)</b>: Deck Aの16チャンネルポリフォニック入力。チャンネルは個別のトラック信号にデコードされます。</li>\n<li><b>Deck B (16ch poly)</b>: Deck Bの16チャンネルポリフォニック入力。チャンネルは個別のトラック信号にデコードされます。</li>\n<li><b>Crossfader CV</b>: クロスフェーダー位置変調用CV入力（&plusmn;10V、係数0.1、クロスフェーダー位置にオフセットを加算）。</li>\n<li><b>Master L</b>: マスター左チャンネル出力。クロスフェーダー、アイソレーター、ドライブ、ソフトクリップ後のメインステレオミックス。</li>\n<li><b>Master R</b>: マスター右チャンネル出力。クロスフェーダー、アイソレーター、ドライブ、ソフトクリップ後のメインステレオミックス。</li>\n<li><b>Cue L</b>: ヘッドフォンモニタリング用キュー左チャンネル出力。</li>\n<li><b>Cue R</b>: ヘッドフォンモニタリング用キュー右チャンネル出力。</li>\n</ul>'
        }
      },
      common: {
        back: '戻る',
        more: 'もっと見る',
        intro: '機能紹介',
        features: 'ハイライト',
        tech: '技術情報',
        platform: 'プラットフォーム',
        language: '開発言語',
        version: 'バージョン',
        license: 'ライセンス'
      }
    }
  },

  /**
   * 初始化 i18n 系統
   * 優先順序：localStorage > 瀏覽器語系 > 預設 en
   */
  init() {
    var saved = localStorage.getItem('madzine-lang');

    if (saved && this.translations[saved]) {
      this.currentLang = saved;
    } else {
      var browserLang = navigator.language || navigator.userLanguage || '';
      if (browserLang.startsWith('zh')) {
        this.currentLang = 'zh-TW';
      } else if (browserLang.startsWith('ja')) {
        this.currentLang = 'ja';
      } else if (browserLang.startsWith('en')) {
        this.currentLang = 'en';
      } else {
        this.currentLang = 'en';
      }
    }

    document.documentElement.lang = this.currentLang;
    this.updateDOM();
    this._updateLangButtons();
  },

  /**
   * 切換語言
   * @param {string} lang - 語系代碼：'zh-TW' | 'en' | 'ja'
   */
  setLang(lang) {
    if (!this.translations[lang]) return;

    this.currentLang = lang;
    localStorage.setItem('madzine-lang', lang);
    document.documentElement.lang = lang;
    this.updateDOM();
    this._updateLangButtons();
  },

  /**
   * 取得翻譯文字
   * 支援 dot notation，例如 t('nav.home')
   * 找不到時回傳 key 本身
   * @param {string} key
   * @returns {string}
   */
  t(key) {
    var dict = this.translations[this.currentLang];
    if (!dict) return key;

    var parts = key.split('.');
    var result = dict;
    for (var i = 0; i < parts.length; i++) {
      if (result == null || typeof result !== 'object') return key;
      result = result[parts[i]];
    }

    return (result != null && typeof result !== 'object') ? String(result) : key;
  },

  /**
   * 更新所有帶有 data-i18n 系列屬性的 DOM 元素
   */
  updateDOM() {
    // data-i18n → textContent
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      els[i].textContent = this.t(key);
    }

    // data-i18n-html → innerHTML
    els = document.querySelectorAll('[data-i18n-html]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n-html');
      els[i].innerHTML = this.t(key);
    }

    // data-i18n-placeholder → placeholder
    els = document.querySelectorAll('[data-i18n-placeholder]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n-placeholder');
      els[i].placeholder = this.t(key);
    }

    // data-i18n-alt → alt
    els = document.querySelectorAll('[data-i18n-alt]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n-alt');
      els[i].alt = this.t(key);
    }

    // data-i18n-title → title
    els = document.querySelectorAll('[data-i18n-title]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n-title');
      els[i].title = this.t(key);
    }
  },

  /**
   * 更新語言切換按鈕的 active 狀態
   * 按鈕需帶有 [data-lang] 屬性
   * @private
   */
  _updateLangButtons() {
    var buttons = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('data-lang') === this.currentLang) {
        buttons[i].classList.add('active');
      } else {
        buttons[i].classList.remove('active');
      }
    }
  }
};

// 頁面載入時自動初始化
document.addEventListener('DOMContentLoaded', function () {
  I18N.init();
});
