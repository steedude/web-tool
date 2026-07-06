# Web Tool

Nuxt 4 工具型作品集，整合短網址、圖片分享、WebRTC 檔案傳輸與即時互動房間。  
這個專案的重點不是單一工具本身，而是把前端 UI、Server API、Realtime service、Supabase Storage / Database、SEO、錯誤追蹤、測試與部署流程串成一個可維護的完整 Web app。

線上網址：https://3854335.com

## 專案亮點

- 使用 Nuxt 4、Vue 3、TypeScript 建立多功能工具網站
- 自建 Node.js WebSocket realtime service，支援房間配對與訊息轉發
- 使用 WebRTC DataChannel 實作瀏覽器點對點檔案傳輸
- 使用 Supabase PostgreSQL / RPC / Storage 處理短連結與圖片上傳
- 支援短網址、圖片連結、密碼保護、過期時間、QR Code 與 SEO metadata
- 使用 Sentry 區分前後端錯誤、realtime service 錯誤與手動捕捉的可追蹤錯誤
- 使用 Vitest、ESLint、TypeScript typecheck 維持核心邏輯品質
- 使用 GitHub Actions 部署 realtime service，搭配 systemd 與 Caddy 管理服務

## 功能

### 短網址

- 建立短網址
- 自訂標題、描述與過期時間
- 產生 QR Code
- 支援密碼保護
- 伺服器端解析 slug 並重新導向

### 圖片分享

- 上傳圖片並建立分享頁
- 圖片頁支援 SEO title / description
- 支援過期時間與密碼保護
- Storage 上傳成功但 DB 建立失敗時，會嘗試清理已上傳圖片，降低 orphan file 機率

### Drop 檔案傳輸

- 使用 WebSocket service 交換 WebRTC signaling message
- 使用 WebRTC DataChannel 進行點對點文字與檔案傳輸
- 傳檔流程包含 ACK、bufferedAmount 控制與進度更新
- 支援 TURN server 設定，改善不同網路環境下的連線成功率

### 你畫我猜

- 使用 realtime room 同步遊戲狀態
- 支援主持人與加入者角色
- 即時同步繪圖與遊戲流程

## 技術架構

```txt
Browser
  |
  | Nuxt pages / components / composables
  |
Nuxt Server API
  |
  | RPC / REST / Storage API
  |
Supabase PostgreSQL + Storage

Browser <-> Realtime WebSocket Service <-> Browser
Browser <---------- WebRTC DataChannel ----------> Browser
```

### Frontend

- Nuxt 4
- Vue 3
- TypeScript
- Tailwind CSS 4
- @nuxtjs/i18n
- Composable-based feature state
- WebRTC DataChannel
- QR Code generation

### Backend / Data

- Nuxt Server API
- Supabase PostgreSQL
- Supabase RPC
- Supabase Storage
- Row Level Security policies
- Custom redirect routes
- Sitemap / robots routes

### Realtime

- Standalone Node.js service
- ws WebSocket server
- Room registry / peer matching
- Health check endpoint
- GitHub Actions deployment
- systemd service
- Caddy reverse proxy

### Observability

- @sentry/nuxt
- @sentry/node
- Client / server / realtime service error reporting
- Expected API errors are filtered to reduce noise
- Handled errors use tags such as `feature` and `operation` for easier searching

## 工程取捨

### Storage 與 DB 一致性

圖片分享流程需要先上傳圖片到 Storage，再建立資料庫紀錄。Storage 和 DB 不是同一個 transaction，因此無法做到真正 100% atomic。

目前做法：

- Storage 上傳失敗：直接回傳圖片上傳失敗
- Storage 成功、DB 建立失敗：嘗試刪除已上傳圖片
- cleanup 失敗：保留原本建立失敗錯誤，並送出可追蹤錯誤，避免覆蓋主要錯誤

這不是取代 lifecycle policy 或定期 orphan cleanup，而是降低失敗後殘留檔案的機率。

### Realtime service 獨立部署

Realtime service 沒有塞在 Nuxt server 裡，而是獨立成 `services/realtime`：

- WebSocket 連線生命週期和一般 HTTP API 不同
- 可獨立 build、部署與重啟
- 可用 systemd 管理長時間執行服務
- 未來可以獨立擴充 room 管理、心跳、清理與監控

### 錯誤處理

API 使用統一 error code，前端再依 code 顯示對應 i18n 訊息。  
Sentry 只追蹤真正需要工程判斷的錯誤，例如 Storage upload 失敗、cleanup 失敗、WebRTC signaling 失敗與檔案傳輸 queue 失敗；使用者輸入錯誤、密碼錯誤、slug 不存在等預期錯誤不主動送出。

## 專案結構

```txt
app/
  pages/          Nuxt 頁面
  components/     依功能拆分的 UI 元件
  composables/    前端功能邏輯，例如 Drop、Draw、SEO、API error handling
  configs/        前端可使用的設定與 enum
  utils/          前端工具函式

server/
  api/            Nuxt Server API
  routes/         redirect、sitemap、robots 等自訂 route
  configs/        後端設定與 enum
  utils/          Supabase、Storage、error、SEO 等 server 工具

services/realtime/
  src/            WebSocket realtime service

supabase/
  setup.sql       Database、RPC、RLS policy、Storage bucket / policy

deploy/
  caddy/          Caddy reverse proxy 設定
  systemd/        realtime service systemd unit
```

## 環境設定

完整範例放在 `.env.example`。主要需要設定：

- site URL：供 SEO、sitemap、短連結產生使用
- Supabase：Database、RPC、Storage 與 server-side service role key
- Realtime：WebSocket signaling service URL
- TURN server：改善 WebRTC 在不同網路環境下的連線成功率
- Sentry：前端、Nuxt server 與 realtime service 錯誤追蹤

其中 Supabase service role key 只會在 server side 使用，不會暴露到 client。

## 開發指令

```bash
pnpm install
pnpm dev
```

Nuxt dev server 預設執行於：

```txt
http://localhost:3000
```

常用指令：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Realtime service：

```bash
pnpm --dir services/realtime dev
pnpm --dir services/realtime typecheck
pnpm --dir services/realtime build
pnpm --dir services/realtime start
```

## Supabase 初始化

將 `supabase/setup.sql` 貼到 Supabase SQL Editor 執行。

內容包含：

- `short_links`
- `image_links`
- RPC functions
- Row Level Security policies
- `link-images` Storage bucket
- Storage upload / read policies

SQL 以可重複執行為目標撰寫，方便後續更新 schema。

## 品質檢查

目前專案提供：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --dir services/realtime typecheck
pnpm --dir services/realtime build
```

測試涵蓋：

- realtime room 管理
- Drop 檔案傳輸工具函式
- link utility
- file utility
