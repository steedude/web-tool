# WebRTC DataChannel 面試複習筆記

這份筆記整理 `3854335 Web Lab` 的「Web AirDrop / 即時傳輸」功能。重點不是死背 API，而是能清楚說明：WebRTC 怎麼連線、檔案怎麼傳、為什麼會卡住、最後怎麼修好。

## 目錄

1. [專案功能摘要](#1-專案功能摘要)
2. [基本名詞解釋](#2-基本名詞解釋)
3. [完整連線與傳檔流程](#3-完整連線與傳檔流程)
4. [面試常見問題](#4-面試常見問題)
5. [實際除錯與修復歷程](#5-實際除錯與修復歷程)
6. [最後穩定版設計](#6-最後穩定版設計)
7. [面試總結講法](#7-面試總結講法)

## 1. 專案功能摘要

這個功能是網頁版 AirDrop：

1. 第一台裝置建立房間。
2. 第二台裝置掃 QR Code 或輸入房間碼加入。
3. 兩台裝置透過 WebSocket 交換 WebRTC signaling 訊息。
4. WebRTC 建立點對點連線。
5. 文字和檔案透過 WebRTC DataChannel 傳輸。

整體架構：

```txt
WebSocket server：
- 管理 room
- 通知 peer joined / room full
- 轉送 SDP offer / answer
- 轉送 ICE candidate

WebRTC DataChannel：
- 傳文字
- 傳檔案 metadata
- 傳檔案 binary chunks
- 傳檔案進度 ACK
```

一句話：

```txt
WebSocket 負責牽線，WebRTC 負責真正傳資料。
```

## 2. 基本名詞解釋

### WebRTC

WebRTC 是瀏覽器提供的即時通訊能力，可以做視訊、語音、螢幕分享，也可以用 DataChannel 傳任意資料。

它不是單一協定，而是一組技術，包含：

```txt
RTCPeerConnection
RTCDataChannel
SDP
ICE
STUN / TURN
DTLS / SCTP / SRTP
```

### Peer

`peer` 就是「另一端」。

在這個專案裡：

```txt
手機的 peer = 電腦瀏覽器
電腦的 peer = 手機瀏覽器
```

### RTCPeerConnection

`RTCPeerConnection` 是瀏覽器中負責建立 WebRTC 連線的物件。

你的專案是：

```txt
手機瀏覽器有一個 RTCPeerConnection instance
電腦瀏覽器有一個 RTCPeerConnection instance
這兩個 instance 協商後形成一組雙向 WebRTC 連線
```

不是：

```txt
手機 -> 電腦 一組 RTC
電腦 -> 手機 另一組 RTC
```

### RTCDataChannel

`RTCDataChannel` 是 WebRTC 裡用來傳任意資料的通道。

這個專案建立兩條 DataChannel：

```txt
drop-control：文字、FileStart、FileReady、FileProgress ACK、FileEnd
drop-file：binary file chunks
```

DataChannel 本身是雙向的。只要 channel open，兩邊都可以 `send()`，也都可以 `onmessage` 接收。

### SDP

SDP = Session Description Protocol，可以理解成 WebRTC 連線前交換的「通訊規格書」。

它描述：

```txt
要建立什麼通道
支援哪些能力
這次 session 的參數
ICE 相關資訊
```

簡單記：

```txt
SDP = 我可以怎麼通訊
ICE candidate = 可以從哪些網路地址找到我
```

### offer / answer

offer / answer 是 SDP 協商角色。

以這個專案來說：

```txt
host 建立 offer
guest 根據 offer 建立 answer
```

各自保存的 description：

```txt
host:
localDescription  = offer
remoteDescription = answer

guest:
localDescription  = answer
remoteDescription = offer
```

所以 guest 沒有「自己的 offer」。guest 收到的是對方的 offer，自己產生的是 answer。

### signaling

WebRTC 不能憑空知道對方在哪裡，所以需要 signaling channel 交換連線資訊。

這個專案用 WebSocket 做 signaling：

```txt
room joined
SDP offer
SDP answer
ICE candidate
```

後端只轉送 signaling，不負責跑 ICE，也不負責傳檔案。

### room joined

`room joined` 不是 WebRTC 標準，而是這個專案自己的房間配對訊息。

用途：

```txt
通知房間裡另一台裝置：peer 已經進來，可以開始建立 WebRTC offer。
```

### NAT

NAT = Network Address Translation，網路位址轉換。

家裡很多裝置可能共用同一個外網 IP：

```txt
手機 192.168.1.20:5000 -> 36.226.10.8:62001
筆電 192.168.1.30:5000 -> 36.226.10.8:62002
```

外部打到 `36.226.10.8:62001` 時，路由器查 NAT 表後轉給手機。

### STUN

STUN server 讓裝置知道「外面的世界看到我是什麼 IP:Port」。

例如：

```txt
手機內網位址：192.168.1.20:5000
STUN 看到：36.226.10.8:62001
```

STUN 不幫你傳資料，只幫你發現外部映射位址。

### TURN

TURN server 是中繼伺服器。

如果兩端無法直接連線，資料會走：

```txt
裝置 A -> TURN -> 裝置 B
```

只有 ICE candidate type 是 `relay` 時，才代表真的走 TURN 中繼。

### ICE

ICE = Interactive Connectivity Establishment。

它會收集很多候選路線，實際測試哪些能通，最後選出一組 selected candidate pair。

### ICE candidate

WebRTC 可以嘗試的網路路線。

常見類型：

```txt
host  = 裝置自己的本機或區網位址
srflx = STUN server 看到的 NAT 外部映射位址
prflx = 實際連線檢查時，從 peer 封包來源動態發現的位址
relay = TURN server 提供的中繼位址
```

### host candidate

裝置自己知道的位址，例如：

```txt
192.168.1.20:5000
```

如果兩台裝置在同一個區網，可能會選到 `host -> host`。

### srflx candidate

`srflx` = server-reflexive candidate。

它是透過 STUN server 看到的外部映射位址，例如：

```txt
36.226.10.8:62001
```

### prflx candidate

`prflx` = peer-reflexive candidate。

它不是一開始問 STUN 得到的，而是在實際 ICE connectivity check 時，對方從收到的封包來源動態發現的可用位址。

例如：

```txt
STUN 看到你是 36.226.10.8:62001
但你實際打 peer 時，NAT 分配成 36.226.10.8:63188
對方收到後發現這個位址真的能通，就記成 prflx
```

`srflx` 和 `prflx` 都不是中繼。真正中繼是 `relay`。

### ICE controlling / controlled agent

ICE 連線檢查時，最後不能讓兩邊各自選不同路線，所以有兩個角色：

```txt
controlling agent = 負責 nominate 最終 candidate pair
controlled agent  = 接受與回應 nomination
```

通常：

```txt
offerer = controlling
answerer = controlled
```

但嚴格來說，這是 ICE role，不是業務上的 host / guest 角色。

### tie-breaker

ICE role 衝突時的決勝號碼。

例如雙方幾乎同時 createOffer，兩邊都以為自己是 controlling agent，就可能發生 role conflict。ICE 會比較 tie-breaker：

```txt
tie-breaker 較大的一方保留 controlling
較小的一方改成 controlled
```

瀏覽器底層會處理，前端通常不需要手動操作。

### DataChannel API

前端 JavaScript 直接操作的瀏覽器 API：

```txt
createDataChannel
send
onmessage
```

### SCTP

SCTP = Stream Control Transmission Protocol。

在 WebRTC DataChannel 裡，SCTP 負責：

```txt
可靠傳輸
順序控制
重傳
多 stream
保留 message boundary
```

### DTLS

DTLS = Datagram Transport Layer Security。

可以理解成 UDP 版的 TLS，負責：

```txt
加密
身份驗證
防竄改
```

### UDP

UDP 是傳輸層協定。

特色：

```txt
低延遲
本身不保證可靠
本身不保證順序
```

但使用 UDP 不代表上層應用一定不可靠。WebRTC DataChannel 會在 UDP 上方透過 SCTP 提供可靠、有序傳輸。

### IP

IP 是網路層，負責定址與路由。

### DataChannel over SCTP over DTLS over UDP

DataChannel 大致可以理解成：

```txt
DataChannel API
-> SCTP
-> DTLS
-> UDP
-> IP
```

白話：

```txt
我在 JS 呼叫 DataChannel API
瀏覽器用 SCTP 處理順序與可靠性
再用 DTLS 加密
最後透過 UDP/IP 送到對方
```

### chunk

檔案切成的小片段。

目前專案設定：

```txt
chunkSize = 16KB
```

16KB 是應用層切檔大小，不代表網路真實 packet 都是 16KB。

### packet / bytes

```txt
packet = 封包數
bytes = 資料量
```

不能簡單用 `packet * 固定大小 = bytes`，因為封包大小不固定，還有 header、控制訊息、重傳等因素。

### bufferedAmount

`bufferedAmount` 是 DataChannel 中「已經交給瀏覽器，但還沒真正送出去」的資料量。

它是 sender 本機狀態，不代表 receiver 已經收到。

### bufferedamountlow

DataChannel 事件。

當 `bufferedAmount` 降到 `bufferedAmountLowThreshold` 以下時，瀏覽器會通知你可以繼續送資料。

這個專案保留事件，同時加本地 polling fallback。

### ACK

ACK = acknowledgement，確認收到。

這個專案的 ACK 是應用層 ACK：

```txt
receiver 收到 chunk
累加 received bytes
透過 control channel 回 FileProgress ACK
```

目的不是取代 DataChannel reliable mode，而是讓 sender 知道 receiver 的 JS 實際收到多少。

### backpressure

backpressure 是「不要送超過系統能消化的量」。

這個專案有兩層 backpressure：

```txt
bufferedAmount：保護 sender 本機 DataChannel queue 不要塞爆
ACK window：保護 receiver 不要跟不上
```

### maxUnackedBytes

sender 最多允許自己比 receiver 已確認進度領先多少。

目前設定：

```txt
maxUnackedBytes = 128KB
```

概念：

```txt
sentBytes - acknowledgedBytes <= 128KB
```

## 3. 完整連線與傳檔流程

### 3.1 WebRTC signaling 流程

```txt
1. host 建立 RTCPeerConnection
2. host 建立 DataChannel
3. host createOffer()
4. host setLocalDescription(offer)
5. host 透過 WebSocket 傳 offer 給 guest

6. guest 收到 offer
7. guest 建立 RTCPeerConnection
8. guest setRemoteDescription(offer)
9. guest createAnswer()
10. guest setLocalDescription(answer)
11. guest 透過 WebSocket 傳 answer 給 host

12. host 收到 answer
13. host setRemoteDescription(answer)

14. 兩邊透過 WebSocket 持續交換 ICE candidate
15. 兩邊瀏覽器各自執行 ICE connectivity check
16. ICE 選出 selected candidate pair
17. DataChannel open，開始傳文字與檔案
```

### 3.2 檔案傳輸流程

```txt
1. sender 選擇檔案
2. sender 透過 control channel 送 FileStart
3. receiver 收到 FileStart，建立 incomingFile 狀態
4. receiver 回 FileReady
5. sender 收到 FileReady 後才開始送 binary chunks

6. sender 將檔案切成 16KB chunks
7. sender 透過 file channel 送 chunk
8. receiver 每收到一個 chunk：
   - 存入 chunks
   - 累加 received bytes
   - 立刻送 FileProgress ACK
   - UI 最多每 100ms 更新一次

9. sender 每次送完 chunk 後檢查：
   - bufferedAmount 不要太高
   - sentBytes - acknowledgedBytes 不要超過 maxUnackedBytes

10. receiver 收滿後組成 Blob，產生下載 URL
11. sender 收到完整 ACK 後送 FileEnd
```

### 3.3 最終資料通道設計

```txt
RTCPeerConnection
├─ drop-control：文字、FileStart、FileReady、FileProgress ACK、FileEnd
└─ drop-file：binary file chunks
```

## 4. 面試常見問題

### WebRTC 是單向傳輸嗎？是不是要建立兩個 RTC？

不是。兩端各自有一個 `RTCPeerConnection` instance，協商後形成一組雙向 WebRTC 連線。

DataChannel 也是雙向的：

```txt
手機可以 send 給電腦
電腦也可以 send 給手機
```

offer / answer 只是建立連線時的協商角色，不代表資料方向。

### WebSocket 在 WebRTC 裡扮演什麼角色？

WebSocket 是 signaling channel。

它負責讓兩台裝置交換：

```txt
room joined
SDP offer
SDP answer
ICE candidate
```

檔案本身不走 WebSocket，而是走 WebRTC DataChannel。

### WebSocket、STUN、ICE 是誰在做？

```txt
後端 WebSocket server：
- 管 room
- 通知 peer joined / room full
- 轉送 offer / answer / candidate

兩邊瀏覽器：
- 建立 RTCPeerConnection
- 向 STUN 詢問外部映射地址
- 產生 ICE candidate
- 執行 ICE connectivity check
- 建立 DataChannel
```

後端不替瀏覽器跑 ICE。

### 為什麼不直接問路由器 NAT 表？

因為：

1. 瀏覽器沒有權限讀路由器 NAT 表。
2. 沒有通用、安全的瀏覽器 API 可以要求路由器開 port。
3. 網路可能有多層 NAT，例如電信商 CGNAT。
4. NAT 映射可能依目的地不同而改變。

所以 WebRTC 透過 STUN 問外部伺服器：「外面看到我是什麼 IP:Port？」

### srflx 和 prflx 都是中繼嗎？

不是。

```txt
srflx = STUN 看到的外部映射
prflx = 實際 ICE check 中動態發現的外部映射
relay = TURN 中繼
```

只有 `relay` 是中繼。

### 為什麼 candidate 是一個清單？

因為一台裝置可能有很多路線：

```txt
Wi-Fi IPv4
Wi-Fi IPv6
VPN
STUN 外部位址
TURN relay 位址
實測發現的 prflx 位址
```

WebRTC 會測試這些 candidate pair，選出能通且表現合適的路線。

### ICE connectivity check 的結果兩邊會不一致嗎？

過程中可能暫時看到不同結果，但最後 ICE 會透過 nomination 選出一組 selected candidate pair。

如果選不出共同可用路線：

```txt
ICE state 可能變成 failed / disconnected
```

可處理方式：

```txt
ICE restart
重新建立 PeerConnection
使用 TURN relay
```

### ICE nomination 是 host 的工作嗎？

精準說法：ICE nomination 是 controlling agent 的工作。

通常 offerer 是 controlling agent，所以在這個專案裡大多可以理解成 host / offerer 負責 nomination。

但嚴格來說，這是 ICE role，不是房間 host 這個業務角色決定。

### WebRTC 底層是 UDP，為什麼可以傳檔？

因為 DataChannel 不是裸 UDP。

```txt
DataChannel API -> SCTP -> DTLS -> UDP -> IP
```

UDP 本身不可靠，但 SCTP 在上層提供 reliable / ordered 傳輸，所以 DataChannel 可以傳檔。

面試講法：

```txt
WebRTC DataChannel 底層常走 UDP，但它不是裸 UDP，而是 SCTP over DTLS over UDP。SCTP 提供可靠與順序，DTLS 提供加密，所以可以用來傳檔。
```

### DataChannel reliable mode 已經會重傳，為什麼還要自己寫 ACK？

DataChannel reliable mode 處理底層可靠性：

```txt
封包掉了 -> 底層重傳
順序亂了 -> 底層重排
資料沒到齊 -> 不交給 JS
```

自己寫 ACK 是應用層控制：

```txt
知道 receiver 的 JS 實際收到多少 bytes
控制 sender 不要送太快
顯示真實接收進度
方便 debug 卡住點
```

### 每個 WebRTC 傳檔都要自己寫 ACK 嗎？

不一定。

簡單 demo 可以只做：

```txt
FileStart
binary chunks
FileEnd
```

但如果要處理大檔案、手機 Safari、真實進度與流量控制，應用層 ACK 會比較穩。

### 為什麼中間要一直送控制訊息？開頭結尾不夠嗎？

只靠 FileStart / FileEnd，sender 只知道自己送了多少，不知道 receiver 真正收到多少。

中間的 FileProgress ACK 讓 sender 可以：

```txt
知道 receiver 收到哪裡
避免 sender 比 receiver 領先太多
避免把 DataChannel queue 塞爆
```

### 為什麼要限制 bufferedAmount？

`bufferedAmount` 高不代表速度快，只代表 sender 本機瀏覽器排隊很多資料還沒送出去。

如果無限制一直塞：

```txt
瀏覽器 queue 變長
控制訊息可能變慢
手機 Safari / WebKit 可能延遲或卡住
```

限制 buffer 是為了讓管線保持有資料，但不要塞爆。

### bufferedamountlow 為什麼還需要 polling fallback？

理論上 `bufferedamountlow` 會在 buffer 降到門檻時觸發。

但 iPhone / Safari 實測時，傳輸曾出現：

```txt
進度停住
sender 沒恢復送下一批 chunk
看起來像在等某個事件
```

因此加雙保險：

```txt
1. 繼續監聽 bufferedamountlow
2. 同時本地 polling fileChannel.bufferedAmount
3. 只要 buffer 降到門檻，就恢復送資料
```

這不是 HTTP long polling，也不是問對方主機，而是本地讀取 `RTCDataChannel.bufferedAmount`。

### 能不能只看 ACK，不看 buffer？

不建議。

兩者處理不同層級：

```txt
bufferedAmount = sender 本機 DataChannel queue
ACK = receiver JS 實際收到多少資料
```

ACK 不能精準推算本機瀏覽器內部 queue；bufferedAmount 也不能代表對方已經收到。

所以兩個都需要。

### bufferedAmount 和 ACK 是 OR 還是 AND？

是 AND。

sender 要送下一個 chunk，兩個條件都要通過：

```txt
bufferOK && ackOK
```

反過來：

```txt
while (bufferTooHigh || ackTooFarBehind) {
  wait()
}
```

它們不會打架，因為保護的位置不同：

```txt
bufferedAmount：保護 sender 本機 queue
ACK：保護 receiver 實際接收進度
```

### 為什麼拆成 control channel 和 file channel？

如果檔案 chunk 和控制訊息都走同一條 DataChannel，控制訊息可能被大量 binary chunk 擋住。

拆開後：

```txt
file channel 專心傳 binary chunks
control channel 專心傳文字、FileStart、FileReady、ACK、FileEnd
```

### 拆成兩條 DataChannel 有什麼新問題？

不同 DataChannel 之間沒有跨 channel 順序保證。

可能發生：

```txt
file chunk 比 FileStart 更早被處理
```

所以加 `FileReady`：

```txt
sender 送 FileStart
receiver 建立接收狀態
receiver 回 FileReady
sender 收到 FileReady 後才送 binary chunks
```

### 為什麼 UI 更新要節流？

每個 chunk 都更新 Vue state / DOM 會很耗效能，手機瀏覽器尤其明顯。

所以：

```txt
ACK 每個 chunk 立即送
UI 最多每 100ms 更新一次
```

重點是 ACK 和 UI 更新不能綁在一起。

### ACK 跟 UI 更新綁在一起為什麼會卡住？

曾經的問題邏輯接近：

```txt
收到 chunk
如果超過 100ms：
  更新 UI
  送 ACK
否則：
  不更新 UI
  也不送 ACK
```

當 sender 送到 `maxUnackedBytes` 上限時，它會停下來等 ACK。  
但 receiver 因為 UI throttle 沒送 ACK，sender 停了又沒有新 chunk 觸發下一次 ACK，形成 deadlock。

最後修正：

```txt
每收到 chunk -> 立即 ACK
每 100ms -> 更新 UI
```

### 如果第三人進 RTC 房會怎樣？

這個功能定位是一對一傳輸房。

如果不限制第三人，offer / answer / ICE candidate 可能混在同一個 room，導致原本連線重建、錯亂或失敗。

目前採用第一個方案：

```txt
WebSocket server 限制 room 最多兩人
第三人加入時回 room:full
前端提示建立新房間
```

## 5. 實際除錯與修復歷程

### 問題起點

iPhone 和筆電傳圖片時，速度很慢、忽快忽慢，接收速率常常長時間是 0，之後才突然跳一段。

一開始無法判斷是：

```txt
sender 沒送
buffer 塞住
receiver 沒收
UI 沒更新
```

### 第一次：加入 WebRTC debug stats

commit：

```txt
46aef7e feat: add drop transfer debug stats
```

加入：

```txt
connection state
channel state
buffer
RTT
send / receive rate
candidate path
packets / bytes
```

結果：確認 DataChannel 是 connected / open，但速度仍不穩。

### 第二次：限制 DataChannel buffer

commit：

```txt
93b7a6e perf: keep drop datachannel buffer shallow
```

判斷：一次塞太多 chunk 會讓 `bufferedAmount` 很高，Safari / WebKit 可能延遲。

修正：

```txt
buffer 太高就暫停
等 bufferedamountlow 後繼續
```

結果：有改善，但仍不夠穩。

### 第三次：補 bufferedAmount polling fallback

commit：

```txt
3acf5c4 fix: stabilize drop transfer backpressure
```

判斷：手機瀏覽器上 `bufferedamountlow` 事件可能不穩或延遲。

修正：

```txt
保留 bufferedamountlow
同時 setInterval polling bufferedAmount
```

結果：buffer backpressure 比較穩，但 iPhone 傳檔仍有停頓。

### 第四次：調整 chunk 與 buffer 設定

commit：

```txt
cb08b5c4 perf: tune drop chunks for mobile datachannels
```

設定：

```txt
chunkSize = 16KB
bufferLowThreshold = 64KB
maxBufferedAmount = 256KB
progressIntervalMs = 100ms
```

結果：比一開始穩，但接收端進度仍偶爾才跳。

### 第五次：拆成 control channel 和 file channel

commit：

```txt
3d0e377 perf: split drop control and file datachannels
```

修正：

```txt
drop-control：文字、FileStart、ACK、FileEnd
drop-file：binary chunks
```

結果：控制訊息比較不會被檔案 chunk 擋住。  
但也發現兩條 DataChannel 之間沒有跨 channel 順序保證。

### 第六次：加入傳輸診斷

commit：

```txt
2d32bde feat: add drop transfer diagnostics
```

加入：

```txt
耗時
平均速度
峰值
最後進度間隔
停頓次數
```

結果：看出不是完全沒有頻寬，而是傳輸節奏或 ACK 流程有問題。

### 第七次：加入 FileReady 與 ACK pacing

commit：

```txt
ec90527 fix: pace drop file transfer with receiver acknowledgements
```

修正 1：處理跨 channel 順序問題。

```txt
sender -> FileStart
receiver -> FileReady
sender 收到 FileReady 才送 chunks
```

修正 2：加入 receiver ACK window。

```txt
sentBytes - acknowledgedBytes <= 128KB
```

結果：傳輸變合理，但後來出現某個進度點卡住不動。

### 第八次：找出 ACK 與 UI throttle 的 deadlock

使用者截圖顯示：

```txt
檔案約 3.7MB
進度卡在 784KB
sender 已送出約 928KB
maxUnackedBytes = 128KB
```

差距：

```txt
928KB - 784KB = 144KB
```

超過上限，所以 sender 停下來等 ACK。

但當時 ACK 跟 UI throttle 綁在一起，導致 receiver 沒立刻送 ACK，sender 停了後也沒有新 chunk 觸發下一次 ACK。

### 最終修正：ACK 每個 chunk 立即送，UI 才節流

commit：

```txt
d80b85e fix: acknowledge every received drop file chunk
```

最後邏輯：

```txt
每收到 chunk -> 立刻送 ACK
每 100ms -> 更新 UI
```

結果：使用者回報修好了。

核心結論：

```txt
資料控制不能依賴畫面更新節奏。
ACK 是傳輸控制，UI throttle 是渲染優化，兩者要分開。
```

## 6. 最後穩定版設計

### 關鍵設定

```txt
bufferLowThreshold = 64KB
chunkSize = 16KB
maxBufferedAmount = 256KB
maxFileSize = 50MB
maxUnackedBytes = 128KB
ackPollIntervalMs = 40ms
bufferPollIntervalMs = 40ms
progressIntervalMs = 100ms
```

### 傳輸控制策略

sender 送下一個 chunk 前，必須同時滿足：

```txt
本地 buffer 沒太滿
receiver ACK 沒落後太多
```

也就是：

```txt
bufferOK && ackOK
```

### 一句話架構

```txt
file channel 負責搬資料
control channel 負責回報狀態
ACK 立即送
UI 節流更新
sender 根據 buffer 和 receiver ACK 控制節奏
```

## 7. 面試總結講法

### 30 秒版本

這個功能是網頁版 AirDrop。WebSocket 只負責房間配對和 WebRTC signaling，真正的文字和檔案透過 WebRTC DataChannel 點對點傳輸。為了讓檔案傳輸穩定，我把檔案切成 chunk，拆出 control / file 兩條 DataChannel，並用 bufferedAmount 和 receiver ACK 做雙層 backpressure。

### 1 分鐘版本

一開始 iPhone 傳圖很慢，而且會卡住。我先加 WebRTC debug stats 觀察 connection、buffer、RTT 和 candidate path。後來發現問題不是單純頻寬，而是傳輸節奏不穩。  
我先限制 DataChannel buffer，再補 bufferedamountlow 的 polling fallback，接著把控制訊息和檔案 chunk 拆成兩條 DataChannel。拆 channel 後又處理跨 channel 無順序保證，所以加 FileReady 握手。最後真正的卡點是 ACK 跟 UI throttle 綁在一起，造成 sender 等 ACK、receiver 又不送 ACK 的 deadlock。最後我把 ACK 改成每個 chunk 立即送，UI 才節流更新，傳輸就穩定了。

### 可以強調的亮點

1. 不只是 WebRTC demo，而是處理了手機瀏覽器傳檔穩定性。
2. 理解 WebSocket signaling 和 WebRTC DataChannel 的分工。
3. 理解 STUN / TURN / ICE candidate，不會把 srflx、prflx 誤認成中繼。
4. 拆 control / file channel，避免控制訊息被檔案資料堵住。
5. 用 FileReady 解決跨 DataChannel 無順序保證。
6. 用 ACK window 做 receiver-driven pacing。
7. 用 bufferedAmount 做 sender 本地 backpressure。
8. 將 ACK 與 UI throttle 解耦，修掉實際 deadlock。

### 最後一句話

這次最大的困難不是 WebRTC 連不上，而是「連上之後怎麼穩定傳大檔」。最後的解法是把資料傳輸、流量控制、畫面更新三件事拆開，各自處理。
