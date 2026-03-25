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
        waaasaabiii: {
          name: 'WAAASAABIII',
          desc: '多影音同步播放器，支援多設備音訊輸出',
          platform: 'macOS, Windows',
          intro: 'WAAASAABIII 是一款以 Rust 開發的多影音同步播放器，設計用於現場演出與多螢幕裝置藝術。程式的核心是多軌時間軸系統，每一軌可載入獨立的影片檔案，所有軌道在統一時間軸上進行同步播放。每軌提供獨立的透明度、位置與縮放控制，並支援三種混合模式，可將多個影像層疊合成為單一輸出畫面。<br><br>輸出端配備多邊形遮罩功能，使用者可對每個輸出畫面定義多邊形區域，進行伸縮、裁切與邊緣平滑處理，適用於非標準形狀的投影表面。音訊方面，程式透過 RtAudio C++ 封裝實現多音訊裝置的同時輸出，採用 callback-driven 架構搭配 lock-free ring buffer，每軌可獨立指定輸出裝置與聲道偏移，支援多聲道音訊介面如 Expert Sleepers ES-8 的 16 聲道輸出。<br><br>程式支援 Ableton Link 協定，在 audio callback 內處理同步邏輯，可與其他 Link 相容的音樂軟體或硬體進行節拍對齊。影片解碼使用 ffmpeg-next，支援包含 H.264、HEVC 與 PCM/AAC 等常見格式。程式同時支援 macOS 與 Windows 雙平台。',
          features: {
            timeline: '多軌時間軸同步播放',
            multidevice: '多設備音訊輸出',
            adjust: '每軌透明度 / 位置 / 縮放調整',
            blend: '3 種混合模式',
            mask: '每輸出多邊形遮罩（伸縮 / 裁切 + 平滑）',
            link: 'Ableton Link 同步'
          }
        },
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
        }
      },
      works: {
        title: '作品集',
        desc: '音樂創作、聲音裝置與現場演出的完整紀錄',
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
          desc: '模組化合成器現場演出選輯'
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
          },
          handout: {
            title: '聲音設計講義',
            desc: '模組合成器聲音設計講義下載'
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
        bandcamp: '在 Bandcamp 收聽',
        youtube: '在 YouTube 觀看'
      },
      contact: {
        title: '聯絡與合作',
        desc: '歡迎合作提案、演出邀約或任何交流',
        course: '課程',
        'course.modular': '模組合成器聲音設計線上課程報名',
        email: '電子郵件',
        social: '社群連結',
        bandcamp: 'Bandcamp',
        youtube: 'YouTube',
        instagram: 'Instagram',
        github: 'GitHub'
      },
      brand: {
        tagline: '台灣聲音設計師，現居東京'
      },
      footer: {
        copyright: '\u00A9 2025 MADZINE. 保留所有權利。'
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
        waaasaabiii: {
          name: 'WAAASAABIII',
          desc: 'Multi-video synchronized player with multi-device audio output',
          platform: 'macOS, Windows',
          intro: 'WAAASAABIII is a multi-video synchronized player built in Rust, designed for live performance and multi-screen installation art. At its core is a multi-track timeline system where each track loads an independent video file, with all tracks playing in sync on a unified timeline. Each track provides independent opacity, position, and zoom controls, with three blend modes available for compositing multiple video layers into a single output.<br><br>The output stage features polygon masking, allowing users to define polygonal regions per output for stretching, cropping, and edge smoothing—suitable for non-standard projection surfaces. On the audio side, the application uses an RtAudio C++ wrapper for simultaneous multi-device output with a callback-driven architecture and lock-free ring buffers. Each track can independently specify its output device and channel offset, supporting multi-channel audio interfaces such as the Expert Sleepers ES-8 with 16-channel output.<br><br>The application supports the Ableton Link protocol, processing synchronization logic within the audio callback for beat alignment with other Link-compatible music software and hardware. Video decoding uses ffmpeg-next, supporting common formats including H.264, HEVC, and PCM/AAC audio. The application runs on both macOS and Windows.',
          features: {
            timeline: 'Multi-track timeline with synchronized playback',
            multidevice: 'Multi-device audio output',
            adjust: 'Opacity / position / zoom adjustment per track',
            blend: '3 blend modes',
            mask: 'Per-output polygon mask (stretch / crop + smoothing)',
            link: 'Ableton Link synchronization'
          }
        },
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
        }
      },
      works: {
        title: 'Works',
        desc: 'A complete archive of music, sound installations, and live performances',
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
          desc: 'Modular synthesizer live performance selections'
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
          },
          handout: {
            title: 'Sound Design Handout',
            desc: 'Modular synth sound design handout download'
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
        bandcamp: 'Listen on Bandcamp',
        youtube: 'Watch on YouTube'
      },
      contact: {
        title: 'Contact',
        desc: 'Open to collaborations, performance invitations, and any exchange',
        course: 'Course',
        'course.modular': 'Modular Synth Sound Design Online Course Registration',
        email: 'Email',
        social: 'Social',
        bandcamp: 'Bandcamp',
        youtube: 'YouTube',
        instagram: 'Instagram',
        github: 'GitHub'
      },
      brand: {
        tagline: 'Taiwanese Sound Designer based in Tokyo'
      },
      footer: {
        copyright: '\u00A9 2025 MADZINE. All rights reserved.'
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
        waaasaabiii: {
          name: 'WAAASAABIII',
          desc: 'マルチ映像同期プレーヤー、複数デバイスオーディオ出力対応',
          platform: 'macOS, Windows',
          intro: 'WAAASAABIII は Rust で開発されたマルチ映像同期プレーヤーで、ライブパフォーマンスやマルチスクリーンインスタレーションアート向けに設計されています。コアとなるのはマルチトラックタイムラインシステムで、各トラックに独立した映像ファイルを読み込み、統一タイムライン上で同期再生します。各トラックは透明度、位置、ズームを個別に制御でき、3種類のブレンドモードにより複数の映像レイヤーを単一出力に合成できます。<br><br>出力段にはポリゴンマスク機能を搭載し、出力ごとにポリゴン領域を定義してストレッチ、クロップ、エッジスムージングを適用でき、非標準形状のプロジェクション面に対応します。オーディオ面では RtAudio C++ ラッパーにより複数デバイスへの同時出力を実現し、callback-driven アーキテクチャと lock-free ring buffer を採用。各トラックは出力デバイスとチャンネルオフセットを個別に指定でき、Expert Sleepers ES-8 の 16チャンネル出力などのマルチチャンネルオーディオインターフェースに対応します。<br><br>Ableton Link プロトコルに対応し、audio callback 内で同期ロジックを処理して他の Link 対応音楽ソフトウェア・ハードウェアとのビート同期が可能です。映像デコードには ffmpeg-next を使用し、H.264、HEVC、PCM/AAC など一般的なフォーマットに対応。macOS と Windows の両プラットフォームで動作します。',
          features: {
            timeline: 'マルチトラックタイムライン同期再生',
            multidevice: 'マルチデバイスオーディオ出力',
            adjust: 'トラック別の透明度・位置・ズーム調整',
            blend: '3種ブレンドモード',
            mask: '出力別ポリゴンマスク（ストレッチ / クロップ + スムージング）',
            link: 'Ableton Link 同期'
          }
        },
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
        }
      },
      works: {
        title: '作品集',
        desc: '音楽制作、サウンドインスタレーション、ライブパフォーマンスの記録',
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
          desc: 'モジュラーシンセサイザー ライブパフォーマンス選集'
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
          },
          handout: {
            title: 'サウンドデザイン資料',
            desc: 'モジュラーシンセ サウンドデザイン資料ダウンロード'
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
        bandcamp: 'Bandcampで聴く',
        youtube: 'YouTubeで見る'
      },
      contact: {
        title: 'お問い合わせ',
        desc: 'コラボレーション、パフォーマンスへの招待、その他のお問い合わせ',
        course: 'コース',
        'course.modular': 'モジュラーシンセ サウンドデザイン オンラインコース申し込み',
        email: 'メール',
        social: 'ソーシャル',
        bandcamp: 'Bandcamp',
        youtube: 'YouTube',
        instagram: 'Instagram',
        github: 'GitHub'
      },
      brand: {
        tagline: '東京在住の台湾人サウンドデザイナー'
      },
      footer: {
        copyright: '\u00A9 2025 MADZINE. All rights reserved.'
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
