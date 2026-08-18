# 鮮果市集 🍉

簡易水果電商網站：前台商品瀏覽 + 購物車 + 結帳，後台商品管理 + 訂單管理。

- 後端：Node.js + Express
- 資料：`data/db.json`（JSON 檔案，重啟不會遺失）
- 前端：Vue 3 + Vue Router（Vite 打包，購物車存在 localStorage）

## 啟動

```bash
npm install
npm run dev        # 開發：API + Vue HMR
```

開發時請開啟 Vite 網址：

| 頁面 | 網址 |
| --- | --- |
| 前台商品列表 | http://localhost:5173 |
| 購物車 / 結帳 | http://localhost:5173/cart |
| 後台管理 | http://localhost:5173/admin |

正式環境：

```bash
npm run build
npm start          # http://localhost:3000
```

| 頁面 | 網址 |
| --- | --- |
| 前台商品列表 | http://localhost:3000 |
| 購物車 / 結帳 | http://localhost:3000/cart |
| 後台管理 | http://localhost:3000/admin |

後台預設帳密：`admin` / `admin`。

## 部署到 Render

Vue 前端要先打包成 `dist/`，Render 才找得到頁面。Settings 建議設成：

| 項目 | 值 |
| --- | --- |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

改完後重新 Deploy。若 Build Command 維持預設的 `npm install`，專案也會在 Render 環境自動執行 `vite build`。

## API

| Method | 路徑 | 說明 |
| --- | --- | --- |
| GET | `/api/shop` | 前台商品、分類、商店設定 |
| POST | `/api/orders` | 結帳建立訂單（會檢查並扣庫存） |
| GET | `/api/orders/:orderNo` | 訂單查詢（需搭配電話） |
| GET | `/api/admin/data` | 後台商品／分類／設定 |
| POST | `/api/admin/products` | 新增商品 |
| PUT | `/api/admin/products/:id` | 更新商品 |
| DELETE | `/api/admin/products/:id` | 刪除商品 |
| GET | `/api/admin/orders` | 訂單列表 |
| PUT | `/api/admin/orders/:id` | 更新訂單狀態（pending / shipped / completed / cancelled） |

要重置假資料，把 `data/db.json` 還原成 git 裡的版本即可。
