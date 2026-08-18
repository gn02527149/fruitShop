import { computed, reactive } from 'vue';
import { loadCart, saveCart } from '@/lib/api';

const CART_KEY = 'fruit-cart-v2';

const state = reactive({
  items: loadCart(),
});

function persist() {
  saveCart(state.items);
}

export function useCart() {
  const items = computed(() => state.items);
  const count = computed(() => state.items.reduce((sum, i) => sum + i.qty, 0));

  function add(productId, unit, qty = 1) {
    const existing = state.items.find((i) => i.productId === productId && i.unit === unit);
    if (existing) existing.qty += qty;
    else state.items.push({ productId, unit, qty });
    persist();
  }

  function setQty(productId, unit, qty) {
    if (qty <= 0) {
      const next = state.items.filter((i) => !(i.productId === productId && i.unit === unit));
      state.items.splice(0, state.items.length, ...next);
    } else {
      const item = state.items.find((i) => i.productId === productId && i.unit === unit);
      if (item) item.qty = qty;
    }
    persist();
  }

  function remove(productId, unit) {
    const next = state.items.filter((i) => !(i.productId === productId && i.unit === unit));
    state.items.splice(0, state.items.length, ...next);
    persist();
  }

  function clear() {
    state.items.splice(0, state.items.length);
    localStorage.removeItem(CART_KEY);
  }

  return { items, count, add, setQty, remove, clear };
}
