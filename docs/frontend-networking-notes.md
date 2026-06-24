# 前端常見網路與架構名詞筆記

這份筆記整理幾個前端面試常見名詞：WebRTC、WebSocket、SSE、GraphQL、狀態管理、SSR、SSG。

## 1. Google Meet 為什麼會用 WebRTC？

Google Meet 這種視訊會議很適合用 WebRTC，不適合只用 WebSocket。

因為它主要傳的是：

```txt
即時音訊
即時視訊
螢幕分享
低延遲資料
```

WebSocket 是可靠、有序的 TCP 連線，很適合：

```txt
聊天室文字
通知
協作事件
遊戲房間訊息
WebRTC signaling
```

但影音串流更重視低延遲，不一定需要每個封包都補回來。

例如視訊時某一小段影格掉了：

```txt
直接跳過，使用者可能只覺得畫面抖一下
```

如果硬要可靠補回來：

```txt
畫面會延遲
聲音會卡住
```

WebRTC 底層常用 UDP，再搭配 RTP / SRTP、jitter buffer、擁塞控制、NACK、FEC 等機制，比較適合即時影音。

所以大型即時影音服務通常是：

```txt
WebRTC：音訊、視訊、螢幕分享
WebSocket / HTTP：房間狀態、聊天、交換 SDP/ICE、控制訊息
```

## 2. 多人視訊不是都用 WebSocket 嗎？

不是。

多人視訊通常不會讓所有影音資料都走 WebSocket。

小型 P2P 可以用 mesh：

```txt
A <-> B
A <-> C
B <-> C
```

但人一多，每個人都要跟所有人連線，成本會暴增。

大型會議常用 SFU：

```txt
A -> SFU -> B / C / D
B -> SFU -> A / C / D
```

SFU 是 Selective Forwarding Unit，專門轉發 WebRTC media stream。

它不是一般 WebSocket server，而是即時影音伺服器。

## 3. WebSocket 是什麼？

WebSocket 是瀏覽器和伺服器之間的雙向長連線。

```txt
browser <-> server
```

適合：

```txt
聊天室
通知
即時協作
遊戲房間事件
WebRTC signaling
```

特點：

```txt
雙向
低延遲
通常基於 TCP
可靠、有序
```

## 4. SSE 是什麼？

SSE = Server-Sent Events。

它是伺服器單向推送資料給瀏覽器：

```txt
server -> browser
```

適合：

```txt
通知
任務進度
log streaming
AI 回覆串流
股票價格
系統狀態
```

SSE 和 WebSocket 的差別：

```txt
SSE：單向，server 推給 client
WebSocket：雙向，client 和 server 都能主動傳
```

SSE 比 WebSocket 簡單，走 HTTP，瀏覽器內建 `EventSource`。

如果只是 server 持續推資料給前端，SSE 通常比 WebSocket 更簡潔。

## 5. GraphQL 是什麼？

GraphQL 是一種 API 查詢語言。

傳統 REST 可能會有多個 endpoint：

```txt
GET /users/1
GET /users/1/posts
GET /users/1/followers
```

GraphQL 則是前端直接描述自己要什麼資料：

```graphql
{
  user(id: 1) {
    name
    avatar
    posts {
      title
    }
  }
}
```

優點：

```txt
前端可以精準拿需要的欄位
減少 over-fetching
減少 under-fetching
多個資料需求可以合成一次 query
```

缺點：

```txt
後端設計比較複雜
快取比 REST 麻煩
權限和效能要管好
```

簡單說：

```txt
REST 是後端定義很多資源 endpoint。
GraphQL 是前端送 query 描述自己要哪些資料。
```

## 6. 狀態管理是什麼？

前端畫面中會變動、且會影響 UI 的資料，都可以叫 state。

例如：

```txt
使用者登入狀態
購物車
目前語系
表單內容
API 回來的資料
modal 是否開啟
聊天室訊息
```

狀態管理就是管理這些 state 的方式。

在 Vue 裡常見：

```txt
ref / reactive
Pinia
TanStack Query / Vue Query
```

在 React 裡常見：

```txt
useState
Context
Redux
Zustand
TanStack Query
```

狀態可以分成：

```txt
本地 UI 狀態：
modal 開關、input 內容、tab 切換

全域 client state：
登入者、主題、語系、購物車

server state：
API 資料、loading、error、cache
```

TanStack Query 比較偏向管理 server state。

例如：

```txt
取得資料
loading
error
cache
重新請求
背景更新
```

## 7. SSR 是什麼？

SSR = Server-Side Rendering。

意思是每次 request 進來時，伺服器即時產生 HTML。

```txt
使用者請求頁面
server 查資料
server render HTML
回傳給 browser
```

適合：

```txt
資料常變
需要 SEO
需要根據使用者登入狀態產生不同內容
```

例如：

```txt
商品頁
會員頁
新聞首頁
搜尋結果頁
```

優點：

```txt
SEO 好
首屏內容可由 server 先產生
可以拿到 request-time 的最新資料
```

缺點：

```txt
server 成本較高
速度受後端查詢影響
cache 設計比較重要
```

## 8. SSG 是什麼？

SSG = Static Site Generation。

意思是 build 的時候就先產生 HTML。

```txt
部署前 build
先產生好 HTML 檔
使用者請求時直接回傳靜態檔
```

適合：

```txt
部落格
文件網站
作品集首頁
行銷頁
內容不常變的頁面
```

優點：

```txt
很快
便宜
穩定
容易放 CDN
```

缺點：

```txt
內容更新通常要重新 build
不適合每個使用者都不同的高度動態內容
```

## 9. SSR 和 SSG 差別

一句話：

```txt
SSR 是 request 時產生 HTML。
SSG 是 build 時先產生 HTML。
```

| 類型 | 產生時間 | 優點 | 缺點 |
|---|---|---|---|
| SSR | 每次請求時 | 資料新、SEO 好、可依使用者動態生成 | server 成本較高、速度受後端影響 |
| SSG | build 時 | 很快、便宜、穩定、可放 CDN | 資料更新要重新 build 或補 client fetch |

## 10. 在這個作品集裡可以怎麼理解？

```txt
首頁 / 功能展示頁：
偏靜態，可以 SSG 或 CSR

短網址 redirect：
需要 server route

圖片密碼驗證：
需要 server API

WebRTC / WebSocket：
client runtime 才會發生

Supabase 資料：
屬於 server state / API data
```

面試時可以這樣講：

```txt
我知道一般前端常見的不只是畫 UI，還包含 API 資料流、即時連線、狀態管理和 rendering strategy。像 WebRTC 適合低延遲影音或點對點資料，WebSocket 適合雙向事件，SSE 適合 server 單向推送，GraphQL 是 API 查詢方式，而 SSR / SSG 則是 HTML 產生時機的差異。
```
