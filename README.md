# 鮮果市集 🍉

簡易水果電商網站：前台商品瀏覽 + 購物車 + 結帳，後台商品管理 + 訂單管理。

- 後端：Node.js + Express
- 資料：`data/db.json`（JSON 檔案，重啟不會遺失）
- 前端：純 HTML / CSS / JS（購物車存在 localStorage）

## 啟動

```bash
npm install
npm start          # http://localhost:3000
```

| 頁面 | 網址 |
| --- | --- |
| 前台商品列表 | http://localhost:3000 |
| 購物車 / 結帳 | http://localhost:3000/cart.html |
| 後台管理 | http://localhost:3000/admin |

## API

| Method | 路徑 | 說明 |
| --- | --- | --- |
| GET | `/api/products` | 商品列表（`?all=1` 含下架商品） |
| GET | `/api/products/:id` | 單一商品 |
| POST | `/api/orders` | 結帳建立訂單（會檢查並扣庫存） |
| POST | `/api/admin/products` | 新增商品 |
| PUT | `/api/admin/products/:id` | 更新商品 |
| DELETE | `/api/admin/products/:id` | 刪除商品 |
| GET | `/api/admin/orders` | 訂單列表 |
| PUT | `/api/admin/orders/:id` | 更新訂單狀態（pending / shipped / completed / cancelled） |

要重置假資料，把 `data/db.json` 還原成 git 裡的版本（或重新 seed）即可。
