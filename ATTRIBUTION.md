# 資料與素材來源

## OpenStreetMap 衍生資料

© OpenStreetMap contributors。

`outputs/xinyi-walk/assets/city.json` 與 `roads.json` 包含從使用者提供的 OSM 資料轉換而來的信義區建築幾何、估算高度、道路中心線與碰撞多邊形，作為衍生資料庫以 **Open Database License (ODbL) 1.0** 提供。

- [OpenStreetMap 著作權與授權說明](https://www.openstreetmap.org/copyright)
- [ODbL 1.0 授權全文](https://opendatacommons.org/licenses/odbl/1-0/)

衍生資料可直接從上述 JSON 檔案取得。原始 `map.osm` 不在倉庫中；本專案沒有保存原始資料的取得日期，不能據此判斷地圖的新舊。

`map-public.png` 是依上述資料繪製的示意地圖，不是衛星影像；它及程式中的地圖畫面為 Produced Work，來源仍為 © OpenStreetMap contributors。

## Three.js

`outputs/xinyi-walk/vendor/` 隨附 Three.js r180 與 OrbitControls，採 MIT 授權。完整著作權及授權聲明保存在 `vendor/LICENSE`。

## 本專案產生的素材

`concrete-public.png`、`brick-public.png`、`normal-public.png` 由 `scripts/prepare_public_assets.py` 使用固定亂數及純色產生，沒有使用照片、外掛貼圖或人物參考圖。網頁窗格、天空與道路細節由著色器產生。

此倉庫沒有另行指定自有程式碼及自產材質的通用開源授權；GitHub 的 Public 可見性不代表所有內容都採 MIT。OSM 資料與 Three.js 依各自授權使用。

## 未包含的本機內容

原先的 Esri World Imagery 衛星影像、The City Generator 2.8 貼圖、Blender 場景及備份、內嵌字型、LensSim 安裝包、個人照片、外掛安裝及檢查腳本均未加入公開倉庫。
