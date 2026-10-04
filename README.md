# GAT-Taiwan-Pound — 信義區 3D 城市漫遊

以台北信義區的 OpenStreetMap 建築與道路資料呈現可在瀏覽器探索的立體城市，提供城市鳥瞰與第一人稱街道漫遊。

這是本專案根目錄的**城市漫遊公開版**，不是先前線上遊戲的後續版本。目前沒有第三人稱主角、動態人車、駕駛、打鬥、警察追捕或任務系統。

## 專案解決什麼問題

將平面的建築輪廓、樓層／高度與道路中心線轉為可探索的 3D 城市，協助理解信義區街廓、建築尺度與空間關係。下載後即可在本機使用，不需要 Blender、外掛、API Key 或帳號。

## 主要功能

- 城市鳥瞰：旋轉、縮放與平移。
- 第一人稱漫遊：鍵盤移動、加速、滑鼠或觸控拖曳轉頭。
- 建築碰撞：玩家半徑、穿牆防護、沿牆滑動、安全出生點與地圖邊界。
- 台北 101 快速定位與近似外觀。
- 示意外牆、程序化窗格、天空、共享環境倒影與可切換陰影。
- 07:00–18:00 示意日照調整、小地圖、位置與 FPS。
- 觸控方向按鈕；手機效能依裝置而異，未保證固定 FPS。

資料範圍約 1.71 × 0.94 公里，包含 1,166 個建築／建築分段要素與 1,144 個地面碰撞多邊形。地面是平面，沒有地形高低或可進入的建築內部；建築高度可能來自估算。道路寬度、標線及外牆均為示意，並非精密測量或實拍街景。

公開版使用自產材質及 OSM 示意底圖，**不包含原本的衛星影像、City Generator 貼圖或 Blender 檔案**。

## 安裝方法

1. 安裝 Node.js（驗證環境為 Node.js 24）與支援 WebGL 2 的瀏覽器。
2. 下載倉庫 ZIP 後解壓縮，或執行：

   ```sh
   git clone https://github.com/POUND0423/GAT-Taiwan-Pound.git
   cd GAT-Taiwan-Pound
   ```

3. 在專案根目錄啟動：

   ```sh
   node outputs/xinyi-walk/server.cjs
   ```

4. 開啟 http://127.0.0.1:8765/ 。

沒有 `package.json`，不需要 `npm install` 或建置；伺服器只使用 Node.js 內建模組，Three.js r180 與素材已附在倉庫中。不要直接以 `file://` 開啟 `index.html`。

## 使用方法

| 操作 | 方法 |
| --- | --- |
| 城市鳥瞰 | 拖曳旋轉、滾輪縮放、右鍵拖曳平移 |
| 街道漫遊 | 點「街道漫遊」，WASD 或方向鍵移動，Shift 加速 |
| 轉頭 | 點「進入漫遊」後移動滑鼠；Esc 解除滑鼠鎖定。也可按住場景拖曳 |
| 手機／觸控 | 街道模式使用方向按鈕，拖曳場景轉頭 |
| 台北 101 | 點「台北 101」跳至南側街道 |
| 日照／陰影 | 使用右側滑桿及「建築陰影」選項 |
| 說明 | 點右上角「?」 |

Windows 可雙擊 `outputs/xinyi-walk/開啟街景.cmd`；啟動器使用 PATH 中的 `node`。終端機按 Ctrl+C 停止伺服器。

若 8765 已被占用，在 PowerShell 使用其他連接埠：

```powershell
$env:PORT = '8766'
node outputs/xinyi-walk/server.cjs
```

此時開啟 http://127.0.0.1:8766/ 。伺服器僅監聽 `127.0.0.1`，其他裝置無法直接連入；GitHub 倉庫發布也不會自動啟用線上網站。

## 輸入輸出範例

### 啟動網頁

輸入：

```sh
node outputs/xinyi-walk/server.cjs
```

終端機輸出：

```text
Xinyi city: http://127.0.0.1:8765
```

瀏覽器輸出可操作的 3D 城市；移動後小地圖更新位置及朝向。沒有資料庫、進度存檔或新增地圖檔案。

### 碰撞資料

在根目錄的 PowerShell 執行：

```powershell
@'
import {createCollider} from './outputs/xinyi-walk/collision.js';
const building = {
  base: 0,
  height: 10,
  footprints: [[[0, 0], [10, 0], [10, 10], [0, 10]]]
};
const collider = createCollider([building], [-50, -50, 50, 50]);
console.log(JSON.stringify({
  insideBuilding: collider.blocked(5, 5),
  outsideBuilding: collider.blocked(-1, 5),
  pastMapEdge: collider.blocked(50, 0)
}));
'@ | node --input-type=module
```

輸出：

```json
{"insideBuilding":true,"outsideBuilding":false,"pastMapEdge":true}
```

座標為 `[x, z]`，單位公尺；邊界為 `[minX, minZ, maxX, maxZ]`。`blocked` 回傳是否不可行走。

## 驗證與素材重建

執行既有碰撞測試：

```sh
node work/test_city_collision.mjs
```

成功輸出：

```json
{"passed":true,"buildings":1166,"collisionPolygons":1144,"realWallSweeps":672,"landmarkSpawn":[30,190],"walkSpawn":[-100,145]}
```

它驗證碰撞及幾何一致性，不代表所有裝置的畫面或 FPS 均通過測試。

素材已提交，不需 Python 即可使用。如需在本機重新產生公開版 PNG，另安裝 Python 與 Pillow：

```sh
python -m pip install Pillow
python scripts/prepare_public_assets.py
```

腳本只使用現有 OSM JSON、固定亂數及純色；也會移除 `city.json` 未使用的名稱及重複道路資料，保留建築幾何與碰撞資料。它不會重新下載或重建 OSM 城市模型。

## 目錄與來源

```text
README.md
ATTRIBUTION.md
outputs/xinyi-walk/       # 網頁、Node 伺服器、Three.js 與公開素材
scripts/prepare_public_assets.py
work/test_city_collision.mjs
```

建築與道路資料為 © OpenStreetMap contributors，以 [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) 提供；Three.js 為 MIT。詳細來源、各檔案的授權範圍及未公開內容見 [ATTRIBUTION.md](ATTRIBUTION.md)。

公開倉庫使用白名單式 `.gitignore`。原電腦的 Blender 場景、備份、影像、外掛安裝包與其他 `work` 腳本可能仍保留在本機，但不屬於這份公開版本。
