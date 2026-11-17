# AGENTS.md

本檔適用整個 repository；子目錄若有更具體的 `AGENTS.md`，以其規則為準。

## 協作原則

- 使用台灣繁體中文溝通，不使用 emoji；程式識別字維持英文。
- 修改前先閱讀相關實作、呼叫端與測試，沿用既有慣例；不要只根據檔名推測行為。
- 以完成需求的最小合理改動為原則。不要順便重構無關模組、全專案格式化或加入尚未需要的抽象。
- 需求有小幅歧義時，依現有產品行為作合理假設；需求未明確授權的資料破壞、公開 API 不相容或核心流程改變，先釐清。
- 保留使用者尚未提交的修改；不得擅自覆蓋、還原或刪除。未被要求時，不自行 commit、push 或部署。
- 指令與格式以 `package.json`、相關 config 及 ESLint 為準。既有實作可參考，但不要複製已知問題，也不要藉機擴大重構；架構或流程改變時同步更新相關文件。
- 完成後簡述變更、驗證結果及剩餘限制；未執行的檢查必須明說，不能宣稱通過。

## 專案概況與目錄

Web Tool 是 Nuxt 4 工具網站，包含短網址、圖片分享、Drop 檔案傳輸及你畫我猜。
使用 Vue 3、TypeScript、Tailwind CSS 4、Nuxt i18n、Supabase、Sentry 與 Vitest。
前端狀態優先沿用 composable；新增狀態管理或 UI 套件須有具體需求。

| 路徑 | 職責 |
| --- | --- |
| `app/pages/` | 路由頁面與功能整合 |
| `app/components/` | 共用 UI 與功能元件；功能元件放對應子目錄 |
| `app/composables/` | Vue 狀態、生命週期與功能協調；Drop 子模組位於 `drop/` |
| `app/utils/` | 工具函式；可獨立的邏輯盡量不依賴 Vue |
| `app/configs/`、`app/types/` | 前端設定、enum 與型別 |
| `shared/` | Nuxt 前後端共用的設定與 API 型別，不放伺服器機密或瀏覽器專用程式 |
| `server/api/` | Nitro API；檔名決定路徑與 HTTP method |
| `server/routes/` | 短網址轉址、robots、sitemap 等自訂路由 |
| `server/utils/` | Supabase REST／Storage、驗證、錯誤處理與 HTML 回應工具 |
| `services/realtime/` | 獨立 Node.js WebSocket 服務，有自己的 build 與 typecheck |
| `i18n/locales/` | `zh-TW.json`、`en.json` 翻譯 |
| `supabase/setup.sql` | Schema、RPC、RLS 與 Storage policy |
| `deploy/`、`.github/workflows/` | Realtime 的 Caddy、systemd 與部署流程 |

## 開發與檢查指令

使用 `pnpm`，版本以根目錄 `package.json` 的 `packageManager` 為準；CI 使用 Node.js 24。
不要產生 npm／Yarn lockfile；依賴變更須同步 `pnpm-lock.yaml`。

| 指令 | 用途 |
| --- | --- |
| `pnpm install` | 安裝 workspace 依賴，postinstall 會執行 `nuxt prepare` |
| `pnpm dev` | 啟動 Nuxt 開發服務，預設 `http://localhost:3000` |
| `pnpm --dir services/realtime dev` | 另行啟動 WebSocket 開發服務 |
| `pnpm lint` | 全專案 ESLint |
| `pnpm typecheck` | Nuxt 型別檢查 |
| `pnpm test` | 根 Vitest，涵蓋 app、server 與 services 的測試 |
| `pnpm exec vitest run <測試檔路徑>` | 執行指定測試 |
| `pnpm build` | Nuxt 正式建置 |
| `pnpm --dir services/realtime typecheck` | Realtime 型別檢查 |
| `pnpm --dir services/realtime build` | Realtime 正式建置 |

## 檔案分工與依賴方向

| 類別 | 放什麼 | 邊界 |
| --- | --- | --- |
| `configs/*.config.ts` | enum、固定選項、限制、預設設定、規則表 | 不放 Vue 狀態、請求或流程控制；一般設定應避免副作用，獨立服務的啟動設定可讀環境變數 |
| `types/*.type.ts` | 資料結構、Options、Payload、API 契約與型別組合 | 以 `interface`／`type` 為主；執行期會用到的 enum 放 config |
| `utils/*.util.ts` | 計算、格式化、解析、驗證與可獨立呼叫的工具 | 不管理 Vue 生命週期；優先寫純函式，必要的 I/O 工具留在對應環境，例如 `server/utils/` |
| `composables/useXxx.ts` | 響應式狀態、watch、生命週期、非同步協調 | 以功能或責任拆分；功能變複雜時用主 composable 整合子模組，例如 `useDropPeer` |
| `components/*.vue` | 呈現、表單與 UI 互動 | 透過 props／emits 溝通，複雜流程委派 composable |
| `pages/*.vue` | 路由參數、SEO、頁面級整合 | 可保留簡單頁面狀態，不把跨頁可重用的流程堆在頁面 |

- 依使用環境放在 `app/`、`server/` 或 `shared/`；只有 Nuxt 前後端確實共用的定義才移到 `shared/`，不是所有型別都放 shared。
- 共用定義維持單一來源；可像 `app/configs/link.config.ts`、`server/types/link.type.ts` 一樣 re-export，不複製另一份常數或型別。
- `shared/` 不依賴 `app/`、`server/`、Nuxt runtime 或瀏覽器專用 API；前端不得匯入 server 模組。
- 共享或具領域意義的型別放 `types/`；單檔專用的小型 props、emit、options 型別可留原檔，不為抽型別增加無必要的跳轉。
- Config 可用 `as const` 保留字面值型別，用 `satisfies` 檢查結構；不要為了集中常數，把每個區域變數都搬進 config。
- Realtime 維持自己的 `src/*.config.ts`、`*.type.ts` 結構；未處理編譯與打包邊界前，不直接把 Nuxt shared 模組搬入服務。

## 命名與程式碼風格

| 對象 | 慣例與例子 |
| --- | --- |
| Vue 元件 | PascalCase，以功能前綴辨識：`AppAlert.vue`、`DropChatPanel.vue`、`LinkCreateForm.vue` |
| Composable | 檔案與 export 同名：`useDropPeer.ts` → `useDropPeer` |
| Config／型別／工具 | kebab-case 領域名稱＋單數後綴：`link.config.ts`、`link.type.ts`、`drop-debug.util.ts`；資料夾維持複數 `configs/`、`types/`、`utils/` |
| 測試 | 沿用來源檔名＋`.test.ts`，如 `file.util.test.ts`；app 工具測試與來源相鄰，Realtime 測試放 `services/realtime/test/` |
| 型別與 enum | PascalCase，不加 `I`／`T` 前綴：`DropChatItem`、`RealtimeRole`；enum member 也用 PascalCase |
| 模組級固定設定 | SCREAMING_SNAKE_CASE：`LINK_CONFIG`、`LINK_FORM_LIMITS`；物件欄位用 camelCase |
| 函式、變數與欄位 | camelCase；函式以動作命名，如 `parseRealtimeMessage`、`cleanupTransfer`；布林值用可讀的狀態或判斷名稱，如 `isReady`、`peerConnected` |
| 單位與資料契約 | 數值單位寫入名稱，如 `intervalMs`、`maxPayloadBytes`；DB／RPC 的 `snake_case` 欄位沿用契約，不順便改成 camelCase |

- Vue 使用 Composition API、`<script setup lang="ts">`，通常 script 在 template 前；格式、排序與空白交由 ESLint，不另建一套排版規則。
- 不使用 `any`。外部資料與 caught error 使用 `unknown`，經驗證或型別守衛縮窄；型別斷言不能取代執行期驗證。
- 物件資料結構優先用 `interface`；union、mapped type 與型別運算用 `type`。讓區域值與一般函式回傳值自然推導，在介面邊界或推導不足時補型別。
- Vue props／emits 使用型別宣告；簡單結構可 inline，跨元件傳遞的領域 payload 放對應 `types/`。
- 可重用函式沿用具名 `export function`；優先 early return 降低巢狀。多個具名參數可用 `XxxOptions` 物件，避免長串 positional arguments。
- Vue／Nuxt API 沿用 auto-import；專案的型別、config、util 沿用明確 import。前端使用 `~/`，Nuxt shared 可使用 `#shared/`；Server 沿用相對匯入。
- Realtime 使用 NodeNext，相對匯入沿用 `.js` 副檔名；不可使用 Nuxt auto-import 或 alias。
- 翻譯映射優先寫明確的 `t('完整.key')`，如 `useApiErrorTranslations`；保留 IDE 可追蹤性，避免任意拼接 key。
- 註解說明原因、協定限制與非直覺取捨；不要逐行翻譯程式碼。既有檔案有例外時，不為套用命名規則全面改名。

## UI、SSR 與多語系

- 沿用 `PageContainer`、`PageHeader`、`AppBackLink`、`AppAlert`、`AppPasswordInput` 等共用元件。
- 共用樣式與設計 token 位於 `app/assets/css/main.css`；優先使用既有 `ui-button`、`ui-input` 與 Tailwind，避免新增 UI 套件。
- 維持手機版可用性、鍵盤操作、表單 label、可見焦點與載入／空白／失敗狀態；功能不可只靠顏色表達。
- 使用者可見文案走 i18n；新增或修改 key 時同步兩種語系，維持相同結構。語系內路由沿用 `useLocalePath` 等既有方式。
- 新頁面依用途設定 SEO 或 noindex，優先使用 `usePageSeo`；分享 URL、canonical 與 sitemap 必須考慮正式站網址及語系。
- `window`、`document`、Canvas、WebSocket、WebRTC 等瀏覽器 API 只在 client 階段存取；避免 SSR 執行與 hydration 不一致。
- 計時器、事件監聽、連線與 Object URL 必須在卸載或流程結束時清理；非同步結果需防止過期請求覆蓋最新狀態。

## API、Supabase 與錯誤處理

- 所有外部輸入都在服務端驗證；前端驗證僅改善操作體驗。沿用現有長度、大小、格式、過期時間與 rate limit 限制。
- Nuxt 設定透過 `useRuntimeConfig()` 讀取；新增環境變數時同步 `.env.example`，只放 placeholder，不讀出或輸出真實憑證。
- `runtimeConfig.public` 會公開給瀏覽器；Supabase service role key 等伺服器機密只能留在 server。
- API 錯誤沿用 `ApiErrorCode` 與 `throwApiError`，前端依 code 翻譯；不要依賴英文錯誤文字判斷流程。
- 預期錯誤（輸入錯誤、密碼錯誤、資源不存在）不主動送 Sentry；非預期錯誤使用既有 capture helper 及 feature／operation tags。
- 日誌與 Sentry context 不放密碼、憑證、檔案內容或不必要的個人資料。
- 修改 Supabase 時一併檢查 RPC、RLS、Storage policy 與 API 契約。維持 `setup.sql` 可重複執行；更新 SQL 檔不代表線上資料庫已套用。
- Storage 與 DB 不是同一個 transaction。維持圖片上傳後建立資料失敗時的補償清理；cleanup 失敗不可覆蓋原始錯誤。
- 轉址 URL 須驗證允許的協定；伺服器產生的 HTML 必須正確跳脫動態內容。

## WebSocket、WebRTC 與畫布

- WebSocket 負責房間及 signaling；Drop 的文字與檔案透過 WebRTC DataChannel 傳輸，可能經 TURN relay。
- 收到的 JSON／訊息先做執行期驗證，再依 discriminated union 處理。新增訊息時同步前端 parser、型別、服務端驗證與測試。
- 前端與 Realtime 可能在不同時間更新。協定變更優先新增欄位或訊息；刪除、改名或改變欄位意義時，說明相容策略與部署順序。
- 保留房間容量、角色與訊息轉送限制；連線重建時要避免舊 socket 事件、重複 listener 或 retry timer 污染新狀態。
- 檔案傳輸修改須顧及分塊、ACK、`bufferedAmount` 背壓、佇列、進度、斷線及清理；不可一次將大檔案塞入通道。
- 不把「signaling 已連線」視為「DataChannel 已可傳送」；維持兩者狀態分離。
- 畫布沿用筆畫增量繪製；復原、同步或尺寸改變時才做必要的完整重繪。

## 驗收與變更邊界

| 變更範圍 | 必要檢查；同時涉及多種類型時合併執行 |
| --- | --- |
| 純文件 | 核對內容、路徑、指令與 diff |
| 純樣式／翻譯 | `pnpm lint`；樣式確認相關畫面，翻譯確認語系 key 對齊 |
| Nuxt 程式邏輯 | `pnpm lint`、`pnpm typecheck`、相關測試 |
| 共享邏輯／多功能整合／測試設定 | 加跑完整 `pnpm test` |
| SSR／依賴／建置設定 | 加跑所影響應用的 build；Nuxt 使用 `pnpm build` |
| Realtime 程式 | `pnpm lint`、相關測試及服務自己的 typecheck、build；Nuxt typecheck 不能取代服務檢查 |

- Bug 修復優先補能重現問題的回歸測試；新增重要解析、驗證、狀態轉換與清理邏輯須測試。不要為單純樣式或文案寫對照實作的測試。
- 檢查失敗時區分本次變更、既有問題與環境限制；不得為通過檢查而刪除測試、放寬斷言或停用規則。
- Vitest 目前使用 Node 環境，且設定 `import.meta.client = true`；單元測試通過不代表 SSR 或瀏覽器整合已驗證。
- 互動變更以瀏覽器確認主要流程；Realtime／Drop 涉及雙端時使用兩個分頁或裝置驗證。未驗證跨網路、TURN 或 iPhone 私密瀏覽時，明確註記。
- 不手改 `.nuxt/`、`.output/`、`dist/`、`node_modules/` 等產物；修改來源或設定後重新產生。
- 新增依賴前確認現有工具或原生 API 是否足夠；必要時說明用途，將服務專用依賴放在所屬 workspace。
- 調整部署流程時檢查觸發路徑與獨立服務打包範圍；不可假設根目錄任意檔案會隨 Realtime 一起部署。

## 優先參考的實作

| 任務 | 入口 |
| --- | --- |
| 頁面 SEO／noindex | `app/composables/usePageSeo.ts` |
| 共用 config／型別及 re-export | `shared/configs/link.config.ts`、`app/configs/link.config.ts`、`server/types/link.type.ts` |
| API 錯誤與前端翻譯 | `shared/configs/error.config.ts`、`server/utils/error.util.ts`、`app/composables/useApiErrorTranslations.ts` |
| 訊息解析與型別縮窄 | `app/utils/realtime-message.util.ts` 及同名測試 |
| 圖片建立與補償清理 | `server/api/links/image.post.ts` |
| 功能 composable 拆分 | `app/composables/useDropPeer.ts`、`app/composables/drop/` |
| 房間狀態與測試 | `services/realtime/src/realtime-room.ts`、`services/realtime/test/realtime-room.test.ts` |
