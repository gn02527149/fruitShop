const KEY = 'fruit-cart-v2';

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || '請求失敗');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body !== 'string' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options = { ...options, body: JSON.stringify(options.body) };
  }
  return fetch(url, { credentials: 'include', ...options, headers }).then(parse);
}

export function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function saveCart(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function productState(product) {
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  if (totalStock > 0) return 'normal';
  return product.allowPreorder ? 'preorder' : 'soldout';
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
