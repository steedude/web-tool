# 網路分層模型筆記：OSI 七層 vs TCP/IP

學網路常會看到兩種分層方式：

```txt
OSI 七層模型
TCP/IP 四層或五層模型
```

兩個都值得知道，但學習順序建議是：

```txt
先用 TCP/IP 模型理解真實網路
再用 OSI 七層當面試與溝通語言
```

## 1. 為什麼有分層？

網路通訊很複雜，從瀏覽器送出一個 request 到對方 server，中間會經過：

```txt
應用程式
加密
TCP / UDP
IP
路由器
網卡
實體線路或 Wi-Fi
```

分層的目的，是把問題拆開：

```txt
上層不用知道下層所有細節
每一層只處理自己的責任
```

例如前端寫 HTTP API 時，不需要自己處理電壓、Wi-Fi 訊號或封包路由。

## 2. OSI 七層模型

OSI 七層：

| 層級 | 名稱 | 大概負責什麼 |
|---|---|---|
| L7 | Application 應用層 | HTTP、WebSocket、DNS、SMTP |
| L6 | Presentation 表示層 | 編碼、壓縮、加密格式 |
| L5 | Session 會議層 | session 管理、連線會話 |
| L4 | Transport 傳輸層 | TCP、UDP、port、可靠性 |
| L3 | Network 網路層 | IP、路由 |
| L2 | Data Link 資料鏈結層 | Ethernet、Wi-Fi、MAC address |
| L1 | Physical 實體層 | 電纜、光纖、無線電波 |

### OSI 七層怎麼記？

由上到下：

```txt
Application
Presentation
Session
Transport
Network
Data Link
Physical
```

前端最常碰到的是：

```txt
L7 Application：HTTP、WebSocket、GraphQL、SSE
L4 Transport：TCP / UDP
L3 Network：IP
```

## 3. TCP/IP 四層模型

TCP/IP 模型比較貼近真實網路實作。

常見四層：

| 層級 | 名稱 | 對應 |
|---|---|---|
| Application | 應用層 | HTTP、WebSocket、DNS、TLS 部分討論也常放這裡 |
| Transport | 傳輸層 | TCP、UDP |
| Internet | 網際網路層 | IP、ICMP |
| Link | 網路介面層 | Ethernet、Wi-Fi |

也有人用五層模型，把 Link 拆成：

```txt
Data Link
Physical
```

五層會變成：

| 層級 | 名稱 |
|---|---|
| L5 | Application |
| L4 | Transport |
| L3 | Network |
| L2 | Data Link |
| L1 | Physical |

## 4. OSI 七層 vs TCP/IP，學哪個比較好？

建議：

```txt
學理解：TCP/IP 四層或五層比較實用
學面試與溝通：OSI 七層要知道
```

原因：

```txt
OSI 七層比較像教科書模型，分類細。
TCP/IP 比較貼近真實網際網路實作。
```

但面試官常會問：

```txt
HTTP 在第幾層？
TCP / UDP 在第幾層？
IP 在第幾層？
WebSocket 是哪一層？
TLS 是哪一層？
```

所以 OSI 七層仍然值得背。

## 5. 前端常見技術對應哪一層？

| 技術 | 大概層級 | 說明 |
|---|---|---|
| HTTP | 應用層 | 前端 API 最常見 |
| HTTPS | 應用層 + TLS | HTTP over TLS |
| WebSocket | 應用層 | 建立在 TCP 之上 |
| SSE | 應用層 | HTTP 單向串流 |
| GraphQL | 應用層 | API query language，通常跑在 HTTP |
| DNS | 應用層 | 網域查 IP |
| TCP | 傳輸層 | 可靠、有序 |
| UDP | 傳輸層 | 不保證可靠，但延遲低 |
| IP | 網路層 | 定址與路由 |
| Ethernet / Wi-Fi | 資料鏈結層 | 同一網路內傳輸 |

## 6. TCP 和 UDP 差在哪？

TCP：

```txt
可靠
有序
會重傳
有擁塞控制
適合 HTTP、WebSocket、檔案下載
```

UDP：

```txt
不保證可靠
不保證順序
延遲低
應用層可以自己決定要不要補救
適合影音、遊戲、WebRTC 底層傳輸
```

但要注意：

```txt
使用 UDP 不代表應用一定不可靠。
```

例如 WebRTC DataChannel 底層可以用 UDP，但上面還有 SCTP / DTLS 等機制，可以提供可靠、有序的 DataChannel。

## 7. WebRTC 大概在哪些層？

WebRTC 是一組技術，不是單一協定。

粗略來看：

```txt
應用層：
WebRTC API、DataChannel、MediaStream、SDP signaling

傳輸相關：
SCTP、SRTP、DTLS

傳輸層：
UDP

網路層：
IP
```

WebRTC 常見組合：

```txt
DataChannel:
DataChannel API
-> SCTP
-> DTLS
-> UDP
-> IP

影音:
RTP / SRTP
-> UDP
-> IP
```

## 8. 常見面試回答

### Q：HTTP 是第幾層？

應用層。

### Q：WebSocket 是第幾層？

應用層。WebSocket 建立在 TCP 之上，通常一開始透過 HTTP Upgrade 建立連線。

### Q：TCP / UDP 是第幾層？

傳輸層。

### Q：IP 是第幾層？

網路層。

### Q：WebRTC 是第幾層？

WebRTC 不是單一層，它是一組瀏覽器即時通訊技術。它提供應用層 API，但底層會用到 ICE、DTLS、SCTP、SRTP、UDP、IP 等不同層的技術。

### Q：前端工程師需要懂到哪裡？

至少要懂：

```txt
HTTP / HTTPS
WebSocket / SSE
TCP vs UDP
DNS 基本概念
瀏覽器 cache
CORS
SSR / SSG 對 request 的影響
```

如果作品有 WebRTC，就應該再懂：

```txt
signaling
STUN / TURN
ICE candidate
DataChannel
bufferedAmount
ACK / backpressure
```

## 9. 最推薦的學習方式

不要一開始死背七層。

比較好的順序是：

```txt
1. 先理解一次 HTTP request 發生了什麼事
2. 再理解 DNS、TCP、TLS、HTTP
3. 再理解 WebSocket / SSE
4. 如果做即時影音或 P2P，再學 WebRTC、STUN、TURN、ICE
5. 最後用 OSI 七層把這些知識分類起來
```

一句話：

```txt
TCP/IP 模型用來理解真實網路。
OSI 七層用來整理和溝通。
```
