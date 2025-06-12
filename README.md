# YouBike 站點搜尋

**一個簡單、美觀、低流量的YouBike站點搜尋器**

---

**簡介**

此專案為一個簡單的網頁應用程式，提供使用者可以搜尋全國的 YouBike 站點資訊，並查看各站點的車輛狀況。

使用者可以透過輸入站點名稱或定位，快速查詢 YouBike 2.0 站點的資訊，包括：
* 站點名稱、地址
* 直線距離
* YouBike 2.0(E)數量
* 可停空位數
* 附近站點

**其他功能**
* Openstreet Map地圖顯示
* 定位開關
* 明亮/黑暗 雙色模式
* 中/英 雙語模式
* PWA 應用程式安裝(BETA)
* 離線模式(BETA)

**離線模式提供定位功能，但需要在PWA或實體應用程式中開啟。離線模式僅提供附近站點，不會顯示車子數量**

**使用VPN或是清除應用資料可能導致離線模式無法正確啟動，使用時請確保符合條件**

**BETA版的功能可能存在部分嚴重錯誤，請斟酌使用**

## 使用方式

1. 請前往 [potatosserver.github.io/YouBike](https://potatosserver.github.io/YouBike/) 或是從[Releases](https://github.com/potatosserver/YouBike/releases)下載APK安裝至Android手機即可使用本服務。
2. 在搜尋框輸入關鍵字查詢
3. 可開啟定位啟用最近站點與距離計算。
4. 可使用卡片右上角的星星釘選車站
6. 點擊右下角的設定按鈕，開啟設定面板

## 螢幕截圖

| ![1746933643059_100 (1)](https://raw.githubusercontent.com/potatosserver/YouBike/refs/heads/main/img/%E4%BA%AE%E8%89%B2%E6%A8%A1%E5%BC%8F.png) | ![1746933638947_100 (1)](https://raw.githubusercontent.com/potatosserver/YouBike/refs/heads/main/img/%E6%B7%B1%E8%89%B2%E6%A8%A1%E5%BC%8F.png) |
|:---------------------------------------------------------------------------------------------------------:|:---------------------------------------------------------------------------------------------------------:|

## 備註

1. PWA(Progressive Web App)是指一種網頁應用程式的設計理念，旨在提供類似原生應用程式的使用體驗。PWA可以在各種設備上運行，包括桌面和移動設備，並且可以離線使用。PWA的特點包括快速加載、可靠性和可安裝性。PWA的目標是讓網頁應用程式像原生應用程式一樣流暢和易於使用。
2. 建議使用Chrome、Microsoft Edge 等瀏覽器，其他瀏覽器對於PWA的支援較差，可能會導致安裝失敗或無法正常運行。
3. 目前新版本支援全國的YouBike站點資訊，但在未開啟定位的情況下會以高雄捷運美麗島站為中心定位。
4. GitHub 按鈕提供兩個程式語言編寫的YouBike搜尋器

## 資料來源

-  [YouBike 官網](https://www.youbike.com.tw)

## 版權與聲明

本專案皆可自由共享與修改，但不可用於盈利目的。  
本工具不屬於 YouBike 微笑單車股份有限公司

## 已知錯誤

* 載入卡頓


## 貢獻

歡迎對本專案感興趣的開發者一起參與貢獻！您可以透過 GitHub 提交 Pull Request 來改善程式碼、新增功能或修復錯誤.

## 貢獻者

* [AndrewCho0531](https://github.com/AndrewCho0531):邏輯編寫、UI設計、錯誤修正
* [KEVIN970712](https://github.com/KEVIN970712):題材發想、錯誤修正、APK封裝

## 補充

1. 在修改程式時，請注意YouBike 官方API的請求時間間隔，避免大量請求造成IP封鎖
2. 複製儲存庫後記得更改部分資料，避免造成PWA應用安裝失敗 
