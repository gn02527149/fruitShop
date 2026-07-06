// 購物車存在 localStorage，格式: [{ productId, unit, qty }]
// 同一商品的不同規格（一斤 / 一箱）視為不同項目
const Cart = {
  key: 'fruit-cart-v2',

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || [];
    } catch {
      return [];
    }
  },

  save(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
  },

  add(productId, unit, qty = 1) {
    const items = this.get();
    const existing = items.find((i) => i.productId === productId && i.unit === unit);
    if (existing) existing.qty += qty;
    else items.push({ productId, unit, qty });
    this.save(items);
  },

  setQty(productId, unit, qty) {
    let items = this.get();
    if (qty <= 0) {
      items = items.filter((i) => !(i.productId === productId && i.unit === unit));
    } else {
      const item = items.find((i) => i.productId === productId && i.unit === unit);
      if (item) item.qty = qty;
    }
    this.save(items);
  },

  remove(productId, unit) {
    this.save(this.get().filter((i) => !(i.productId === productId && i.unit === unit)));
  },

  clear() {
    localStorage.removeItem(this.key);
  },

  count() {
    return this.get().reduce((sum, i) => sum + i.qty, 0);
  },
};

function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (badge) badge.textContent = Cart.count();
}
