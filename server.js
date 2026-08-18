const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// 商品圖片以 base64 存進 db.json，放寬 body 大小限制
app.use(express.json({ limit: '8mb' }));

// ---------- 後台登入保護 ----------
// 帳號密碼存在 db.json（預設 admin / admin），可透過「忘記密碼」直接重設
function ensureAdmin(db) {
  if (!db.admin) {
    db.admin = { username: 'admin', password: 'admin' };
    writeDb(db);
  }
  return db.admin;
}

// token 由帳密推導，改密碼後舊的登入 cookie 立即失效
function adminToken(admin) {
  return Buffer.from(`fg:${admin.username}:${admin.password}`).toString('base64');
}

function isAdmin(req) {
  const admin = ensureAdmin(readDb());
  return (req.headers.cookie || '').split(/;\s*/).includes('adminKey=' + adminToken(admin));
}

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const admin = ensureAdmin(readDb());
  if (username === admin.username && password === admin.password) {
    res.setHeader('Set-Cookie', `adminKey=${adminToken(admin)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return res.json({ ok: true });
  }
  res.status(401).json({ error: '帳號或密碼錯誤' });
});

// 忘記密碼：輸入正確帳號即可直接重設（依需求設計；正式環境建議改為 Email 驗證）
app.post('/api/admin/reset-password', (req, res) => {
  const { username, newPassword } = req.body || {};
  const db = readDb();
  const admin = ensureAdmin(db);
  if (username !== admin.username) return res.status(400).json({ error: '帳號不存在' });
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: '新密碼至少 4 個字元' });
  admin.password = newPassword;
  writeDb(db);
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'adminKey=; Path=/; HttpOnly; Max-Age=0');
  res.json({ ok: true });
});

// login/logout 以外的所有 /api/admin/* 都要通過驗證
app.use('/api/admin', (req, res, next) => {
  if (!isAdmin(req)) return res.status(401).json({ error: '未登入' });
  next();
});

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// 訂單編號：FG + 年月日 + 當日流水號，例如 FG260706-003
function makeOrderNo(db, date) {
  const d = date.toISOString().slice(2, 10).replace(/-/g, '');
  const todayCount = db.orders.filter((o) => o.orderNo && o.orderNo.startsWith(`FG${d}`)).length;
  return `FG${d}-${String(todayCount + 1).padStart(3, '0')}`;
}

// ---------- 前台 API ----------

// 一次取得前台需要的所有資料
app.get('/api/shop', (req, res) => {
  const db = readDb();
  res.json({
    settings: db.settings,
    categories: db.categories,
    products: db.products.filter((p) => p.active),
  });
});

// 結帳建立訂單
app.post('/api/orders', (req, res) => {
  const { customer, delivery, items, note } = req.body || {};

  if (!customer || !customer.name || !customer.phone) {
    return res.status(400).json({ error: '請填寫姓名與電話' });
  }
  if (!delivery || !['pickup', 'delivery'].includes(delivery.method)) {
    return res.status(400).json({ error: '請選擇配送方式' });
  }
  if (delivery.method === 'pickup' && (!delivery.pickupDate || !delivery.pickupTime)) {
    return res.status(400).json({ error: '請選擇自取日期與時間區段' });
  }
  if (delivery.method === 'delivery' && !delivery.address) {
    return res.status(400).json({ error: '請填寫收件地址' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '購物車是空的' });
  }

  const db = readDb();
  const orderItems = [];
  let eligibleSubtotal = 0; // 計入免運門檻的金額（排除促銷商品）
  let latestPreorderDate = ''; // 預購商品中最晚的預計到貨日

  for (const item of items) {
    const product = db.products.find((p) => p.id === Number(item.productId));
    if (!product || !product.active) {
      return res.status(400).json({ error: `商品不存在或已下架（id: ${item.productId}）` });
    }
    const variant = product.variants.find((v) => v.unit === item.unit);
    if (!variant) {
      return res.status(400).json({ error: `「${product.name}」沒有「${item.unit}」這個規格` });
    }
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: `「${product.name}」數量不正確` });
    }

    let preorder = false;
    if (qty > variant.stock) {
      if (product.allowPreorder) {
        preorder = true; // 庫存不足但開放預購
        if (product.preorderDate && product.preorderDate > latestPreorderDate) {
          latestPreorderDate = product.preorderDate;
        }
      } else {
        return res.status(400).json({ error: `「${product.name}（${variant.unit}）」庫存不足（剩 ${variant.stock}）` });
      }
    }

    const lineTotal = variant.price * qty;
    if (!product.excludeFreeShipping) eligibleSubtotal += lineTotal;
    orderItems.push({
      productId: product.id,
      name: product.name,
      unit: variant.unit,
      price: variant.price,
      qty,
      preorder,
    });
  }

  // 含預購商品時，自取日期不得早於預計到貨日
  if (delivery.method === 'pickup' && latestPreorderDate && delivery.pickupDate < latestPreorderDate) {
    return res.status(400).json({
      error: `訂單含預購商品，預計 ${latestPreorderDate} 到貨，請選擇該日（含）之後的自取日期`,
    });
  }

  // 扣庫存（預購不扣到負數）
  for (const item of orderItems) {
    const product = db.products.find((p) => p.id === item.productId);
    const variant = product.variants.find((v) => v.unit === item.unit);
    variant.stock = Math.max(0, variant.stock - item.qty);
  }

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  let shippingFee = 0;
  if (delivery.method === 'delivery') {
    shippingFee = eligibleSubtotal >= db.settings.freeShippingThreshold ? 0 : db.settings.shippingFee;
  }

  const now = new Date();
  const order = {
    id: db.nextOrderId++,
    orderNo: makeOrderNo(db, now),
    customer: { name: customer.name, phone: customer.phone },
    delivery:
      delivery.method === 'pickup'
        ? { method: 'pickup', pickupDate: delivery.pickupDate, pickupTime: delivery.pickupTime }
        : { method: 'delivery', address: delivery.address },
    items: orderItems,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    note: (note || '').slice(0, 500),
    status: 'pending',
    createdAt: now.toISOString(),
  };
  db.orders.push(order);
  writeDb(db);
  res.status(201).json({ ...order, bankInfo: db.settings.bankInfo });
});

// 訂單查詢（給顧客憑單號＋電話查）
app.get('/api/orders/:orderNo', (req, res) => {
  const db = readDb();
  const order = db.orders.find(
    (o) => o.orderNo === req.params.orderNo && o.customer.phone === req.query.phone
  );
  if (!order) return res.status(404).json({ error: '查無訂單，請確認單號與電話' });
  res.json(order);
});

// ---------- 後台 API ----------

app.get('/api/admin/data', (req, res) => {
  const db = readDb();
  res.json({ settings: db.settings, categories: db.categories, products: db.products });
});

app.put('/api/admin/settings', (req, res) => {
  const db = readDb();
  const { freeShippingThreshold, shippingFee, pickupTimeSlots, bankInfo } = req.body || {};
  if (freeShippingThreshold != null) db.settings.freeShippingThreshold = Number(freeShippingThreshold);
  if (shippingFee != null) db.settings.shippingFee = Number(shippingFee);
  if (Array.isArray(pickupTimeSlots)) db.settings.pickupTimeSlots = pickupTimeSlots.filter(Boolean);
  if (bankInfo != null) db.settings.bankInfo = bankInfo;
  writeDb(db);
  res.json(db.settings);
});

// 分類
app.post('/api/admin/categories', (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: '請輸入分類名稱' });
  const db = readDb();
  const category = { id: db.nextCategoryId++, name };
  db.categories.push(category);
  writeDb(db);
  res.status(201).json(category);
});

app.put('/api/admin/categories/:id', (req, res) => {
  const db = readDb();
  const category = db.categories.find((c) => c.id === Number(req.params.id));
  if (!category) return res.status(404).json({ error: '找不到分類' });
  if (req.body.name) category.name = req.body.name;
  writeDb(db);
  res.json(category);
});

app.delete('/api/admin/categories/:id', (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  db.categories = db.categories.filter((c) => c.id !== id);
  db.products.forEach((p) => {
    p.categoryIds = p.categoryIds.filter((cid) => cid !== id);
  });
  writeDb(db);
  res.json({ ok: true });
});

// 商品
function normalizeVariants(variants) {
  if (!Array.isArray(variants)) return null;
  const cleaned = variants
    .filter((v) => v && v.unit && v.price != null)
    .map((v) => ({ unit: String(v.unit), price: Number(v.price), stock: Math.max(0, Number(v.stock) || 0) }));
  return cleaned.length > 0 ? cleaned : null;
}

app.post('/api/admin/products', (req, res) => {
  const { name, emoji, image, categoryIds, description, variants, allowPreorder, preorderDate, excludeFreeShipping, active } =
    req.body || {};
  const cleanVariants = normalizeVariants(variants);
  if (!name || !cleanVariants) {
    return res.status(400).json({ error: '名稱為必填，且至少要有一個規格（單位＋價格）' });
  }
  const db = readDb();
  const product = {
    id: db.nextProductId++,
    name,
    emoji: emoji || '🍎',
    image: image || '',
    categoryIds: Array.isArray(categoryIds) ? categoryIds.map(Number) : [],
    description: description || '',
    variants: cleanVariants,
    allowPreorder: Boolean(allowPreorder),
    preorderDate: preorderDate || '',
    excludeFreeShipping: Boolean(excludeFreeShipping),
    active: active !== false,
  };
  db.products.push(product);
  writeDb(db);
  res.status(201).json(product);
});

app.put('/api/admin/products/:id', (req, res) => {
  const db = readDb();
  const product = db.products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: '找不到商品' });

  const body = req.body || {};
  if (body.name != null) product.name = body.name;
  if (body.emoji != null) product.emoji = body.emoji;
  if (body.image != null) product.image = body.image;
  if (Array.isArray(body.categoryIds)) product.categoryIds = body.categoryIds.map(Number);
  if (body.description != null) product.description = body.description;
  if (body.variants != null) {
    const cleanVariants = normalizeVariants(body.variants);
    if (!cleanVariants) return res.status(400).json({ error: '至少要有一個規格（單位＋價格）' });
    product.variants = cleanVariants;
  }
  if (body.allowPreorder != null) product.allowPreorder = Boolean(body.allowPreorder);
  if (body.preorderDate != null) product.preorderDate = body.preorderDate;
  if (body.excludeFreeShipping != null) product.excludeFreeShipping = Boolean(body.excludeFreeShipping);
  if (body.active != null) product.active = Boolean(body.active);
  writeDb(db);
  res.json(product);
});

app.delete('/api/admin/products/:id', (req, res) => {
  const db = readDb();
  const index = db.products.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: '找不到商品' });
  db.products.splice(index, 1);
  writeDb(db);
  res.json({ ok: true });
});

// 訂單
app.get('/api/admin/orders', (req, res) => {
  const db = readDb();
  let orders = [...db.orders].sort((a, b) => b.id - a.id);
  if (req.query.status) orders = orders.filter((o) => o.status === req.query.status);
  if (req.query.method) orders = orders.filter((o) => o.delivery.method === req.query.method);
  res.json(orders);
});

// 給後台輪詢用：只回最新訂單 id
app.get('/api/admin/orders/latest-id', (req, res) => {
  const db = readDb();
  res.json({ latestId: db.orders.length ? Math.max(...db.orders.map((o) => o.id)) : 0 });
});

app.put('/api/admin/orders/:id', (req, res) => {
  const db = readDb();
  const order = db.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: '找不到訂單' });
  const allowed = ['pending', 'shipped', 'completed', 'cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: '狀態不正確' });
  order.status = req.body.status;
  writeDb(db);
  res.json(order);
});

// 匯出 CSV（Excel 可直接開啟）。?date=YYYY-MM-DD 篩日期、?method=pickup|delivery 篩配送方式
app.get('/api/admin/orders/export', (req, res) => {
  const db = readDb();
  let orders = [...db.orders].sort((a, b) => a.id - b.id);

  if (req.query.date) {
    orders = orders.filter((o) => {
      const d = o.delivery.method === 'pickup' ? o.delivery.pickupDate : o.createdAt.slice(0, 10);
      return d === req.query.date;
    });
  }
  if (req.query.method) orders = orders.filter((o) => o.delivery.method === req.query.method);

  const STATUS = { pending: '待出貨', shipped: '已出貨', completed: '已完成', cancelled: '已取消' };
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['單號', '下單時間', '配送方式', '自取日期/收件地址', '時間區段', '姓名', '電話', '商品明細', '小計', '運費', '總金額', '狀態', '備註'],
    ...orders.map((o) => [
      o.orderNo,
      new Date(o.createdAt).toLocaleString('zh-TW'),
      o.delivery.method === 'pickup' ? '自取' : '宅配',
      o.delivery.method === 'pickup' ? o.delivery.pickupDate : o.delivery.address,
      o.delivery.method === 'pickup' ? o.delivery.pickupTime : '',
      o.customer.name,
      o.customer.phone,
      o.items.map((i) => `${i.name}(${i.unit})x${i.qty}${i.preorder ? '[預購]' : ''}`).join('；'),
      o.subtotal,
      o.shippingFee,
      o.total,
      STATUS[o.status],
      o.note,
    ]),
  ];
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n'); // BOM 讓 Excel 正確顯示中文

  const filename = `orders${req.query.date ? '-' + req.query.date : ''}${req.query.method ? '-' + req.query.method : ''}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// 舊版靜態頁網址導向 Vue Router
app.get('/cart.html', (req, res) => res.redirect('/cart'));
app.get('/admin.html', (req, res) => res.redirect('/admin'));

// 正式環境：由 Express 提供 Vue 打包後的 SPA
const DIST_PATH = path.join(__dirname, 'dist');
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  app.use(express.static(DIST_PATH));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🍉 水果商城已啟動`);
  if (isProd) {
    console.log(`   前台  http://localhost:${PORT}`);
    console.log(`   後台  http://localhost:${PORT}/admin`);
  } else {
    console.log(`   API   http://localhost:${PORT}`);
    console.log(`   前台請用 Vite（npm run dev）→ http://localhost:5173`);
  }
});
