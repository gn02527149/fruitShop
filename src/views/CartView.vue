<template>
  <ShopHeader :free-shipping-threshold="freeShippingThreshold" />
  <main class="checkout-page">
    <nav class="checkout-breadcrumb" aria-label="頁面位置">
      <router-link to="/">鮮果市集</router-link>
      <span aria-hidden="true"> / </span>
      <span aria-current="page">購物車</span>
    </nav>
    <div class="checkout-heading">
      <h1>購物車與結帳</h1>
      <router-link class="back-to-shop" to="/">← 繼續選購</router-link>
    </div>

    <section v-if="doneOrder" class="checkout-card order-success" aria-labelledby="success-title">
      <div class="status-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4 10-10" /></svg>
      </div>
      <h2 id="success-title" ref="successTitle" tabindex="-1">訂單已成立</h2>
      <p>請保留訂單編號，後續可使用下單電話查詢進度。</p>
      <dl class="order-facts">
        <div><dt>訂單編號</dt><dd>{{ doneOrder.orderNo }}</dd></div>
        <div><dt>訂單金額</dt><dd>{{ money(doneOrder.total) }}</dd></div>
      </dl>
      <div v-if="doneOrder.bankInfo" class="payment-details">
        <h3>匯款轉帳資訊</h3>
        <p class="pasted-text multiline-text">{{ doneOrder.bankInfo }}</p>
      </div>
      <p v-if="doneOrder.note" class="success-note"><strong>訂單備註</strong><span class="pasted-text multiline-text">{{ doneOrder.note }}</span></p>
      <div class="success-actions">
        <router-link class="checkout-action" to="/">繼續選購</router-link>
        <button type="button" class="checkout-action action-outline" @click="openLookup(doneOrder)">查詢這筆訂單</button>
      </div>
    </section>

    <section v-else-if="loading" class="checkout-card cart-state" aria-live="polite">正在載入購物車…</section>
    <section v-else-if="loadError" class="checkout-card cart-state">
      <h2>購物車暫時無法讀取</h2>
      <p role="alert">{{ loadError }}</p>
      <button type="button" class="checkout-action" @click="loadShop">重新載入</button>
    </section>
    <section v-else-if="lines.length === 0" class="checkout-card cart-state">
      <div class="status-mark" aria-hidden="true">
        <ShopIcon name="bag" />
      </div>
      <h2>購物車還是空的</h2>
      <p>挑幾樣喜歡的鮮果，到這裡就能確認商品與配送方式。</p>
      <router-link class="checkout-action" to="/">去挑水果</router-link>
    </section>

    <form v-else class="checkout-layout" @submit.prevent="checkout">
      <div class="checkout-sections">
        <section class="checkout-card" aria-labelledby="cart-items-title">
          <div class="section-heading">
            <h2 id="cart-items-title">選購清單</h2>
            <span>{{ itemCount }} 件商品</span>
          </div>
          <ul class="cart-lines">
            <li v-for="line in lines" :key="line.productId + '-' + line.unit" class="cart-line">
              <div class="line-thumb">
                <img v-if="line.image" :src="line.image" alt="" />
                <span v-else aria-hidden="true">{{ line.product.emoji }}</span>
              </div>
              <div class="line-info">
                <h3>{{ line.product.name }}</h3>
                <p>{{ line.unit }} <span aria-hidden="true">·</span> {{ money(line.variant.price) }}</p>
                <div v-if="line.qty > line.variant.stock || line.product.excludeFreeShipping" class="line-labels">
                  <span v-if="line.qty > line.variant.stock && line.product.allowPreorder">含預購</span>
                  <span v-else-if="line.qty > line.variant.stock">庫存不足</span>
                  <span v-if="line.product.excludeFreeShipping">不計入免運</span>
                </div>
              </div>
              <div class="line-quantity">
                <button type="button" :aria-label="`減少 ${line.product.name}（${line.unit}）數量`" :disabled="submitting" @click="changeQty(line, line.qty - 1)">−</button>
                <span :aria-label="`數量 ${line.qty}`">{{ line.qty }}</span>
                <button type="button" :aria-label="`增加 ${line.product.name}（${line.unit}）數量`" :disabled="submitting" @click="changeQty(line, line.qty + 1)">+</button>
              </div>
              <div class="line-total">
                <strong>{{ money(line.variant.price * line.qty) }}</strong>
                <button type="button" :aria-label="`移除 ${line.product.name}（${line.unit}）`" :disabled="submitting" @click="remove(line.productId, line.unit)">移除</button>
              </div>
            </li>
          </ul>
        </section>

        <section class="checkout-card" aria-labelledby="delivery-title">
          <div class="section-heading"><h2 id="delivery-title">配送方式</h2></div>
          <div class="delivery-options" role="group" aria-labelledby="delivery-title">
            <label :class="{ chosen: method === 'pickup' }">
              <input v-model="method" type="radio" name="fulfillment" value="pickup" />
              <ShopIcon name="store" />
              <span><strong>到店自取</strong><small>選擇日期及時段</small></span>
            </label>
            <label :class="{ chosen: method === 'delivery' }">
              <input v-model="method" type="radio" name="fulfillment" value="delivery" />
              <ShopIcon name="truck" />
              <span><strong>宅配 / 當日快遞</strong><small>送到指定地址</small></span>
            </label>
          </div>
          <p v-if="preorderHint" class="checkout-notice">{{ preorderHint }}</p>
          <div v-if="method === 'pickup'" class="checkout-fields">
            <label for="pickup-date">自取日期
              <input id="pickup-date" v-model="pickupDate" type="date" :min="minPickupDate" required />
            </label>
            <label for="pickup-time">時間區段
              <select id="pickup-time" v-model="pickupTime" required>
                <option value="" disabled>請選擇自取時段</option>
                <option v-for="slot in pickupSlots" :key="slot" :value="slot">{{ slot }}</option>
              </select>
            </label>
          </div>
          <label v-else class="checkout-field" for="delivery-address">收件地址
            <textarea id="delivery-address" v-model="address" autocomplete="street-address" rows="2" wrap="soft" placeholder="縣市、區、路名與門牌" required></textarea>
          </label>
        </section>

        <section class="checkout-card contact-card" aria-labelledby="contact-title">
          <div class="section-heading"><h2 id="contact-title">聯絡資訊</h2></div>
          <div class="checkout-fields">
            <label for="customer-name">姓名
              <input id="customer-name" v-model="customerName" autocomplete="name" placeholder="請輸入姓名" required />
            </label>
            <label for="customer-phone">電話
              <input id="customer-phone" v-model="customerPhone" type="tel" autocomplete="tel" placeholder="0912-345-678" required />
            </label>
          </div>
          <label class="checkout-field" for="checkout-note">訂單備註 <small>選填</small>
            <textarea id="checkout-note" v-model="note" rows="4" wrap="soft" :maxlength="noteLimit" aria-describedby="note-help" placeholder="例如：匯款帳號後五碼 12345&#10;水果希望分裝成兩袋，謝謝！"></textarea>
          </label>
          <div id="note-help" class="field-help"><span>可直接貼上多行文字，換行會保留。</span><span>{{ note.length }} / {{ noteLimit }}</span></div>
        </section>
      </div>

      <aside class="checkout-card purchase-summary" aria-labelledby="summary-title">
        <div class="section-heading"><h2 id="summary-title">訂單摘要</h2></div>
        <dl class="price-breakdown">
          <div><dt>商品小計</dt><dd>{{ money(subtotal) }}</dd></div>
          <div><dt>配送費用</dt><dd>{{ shippingLabel }}</dd></div>
          <div class="price-total"><dt>應付金額</dt><dd>{{ money(subtotal + shippingFee) }}</dd></div>
        </dl>
        <div v-if="method === 'delivery'" class="shipping-progress" aria-live="polite">
          <p v-if="freeShippingOk">已達 {{ money(freeShippingThreshold) }} 免運門檻</p>
          <p v-else>再選購 {{ money(freeShippingThreshold - eligible) }} 即可免運</p>
          <div class="shipping-track" aria-hidden="true"><span :style="{ width: shippingProgress + '%' }"></span></div>
          <small>不計入免運的商品除外</small>
        </div>
        <div class="payment-summary">
          <h3>付款方式</h3>
          <strong>銀行匯款</strong>
          <p>可先匯款並填寫帳號後五碼，或於下單後告知。</p>
          <details v-if="shop.settings.bankInfo" class="bank-disclosure">
            <summary>查看匯款資訊</summary>
            <p class="pasted-text multiline-text">{{ shop.settings.bankInfo }}</p>
          </details>
        </div>
        <p v-if="checkoutError" class="checkout-error" role="alert">{{ checkoutError }}</p>
        <button type="submit" class="checkout-action place-order" :disabled="submitting">{{ submitting ? '正在送出…' : '送出訂單' }}</button>
      </aside>
    </form>

    <details id="order-lookup" ref="lookupPanel" class="checkout-card lookup-card">
      <summary>
        <span class="lookup-icon"><ShopIcon name="receipt" /></span>
        <span class="lookup-heading"><strong>查詢訂單</strong><small>使用訂單編號與下單電話查詢進度</small></span>
        <ShopIcon class="lookup-chevron" name="chevron-down" />
      </summary>
      <form class="lookup-form" @submit.prevent="lookupOrder">
        <div class="checkout-fields">
          <label for="lookup-number">訂單編號
            <input id="lookup-number" ref="lookupNumberField" v-model="lookupNumber" placeholder="FG260706-003" autocapitalize="characters" :spellcheck="false" required />
          </label>
          <label for="lookup-phone">下單電話
            <input id="lookup-phone" v-model="lookupPhone" type="tel" placeholder="請輸入下單時的電話" required />
          </label>
        </div>
        <button type="submit" class="checkout-action action-outline" :disabled="lookingUp">{{ lookingUp ? '查詢中…' : '查詢' }}</button>
      </form>
      <p v-if="lookupError" class="checkout-error" role="alert">{{ lookupError }}</p>
      <div v-if="foundOrder" class="lookup-result" aria-live="polite">
        <div class="lookup-result-heading"><strong>{{ foundOrder.orderNo }}</strong><span>{{ orderStatuses[foundOrder.status] || foundOrder.status }}</span></div>
        <div v-if="foundOrder.delivery.method === 'pickup'" class="pasted-text multiline-text">到店自取　{{ foundOrder.delivery.pickupDate }} {{ foundOrder.delivery.pickupTime }}</div>
        <div v-else class="pasted-text multiline-text">宅配　{{ foundOrder.delivery.address }}</div>
        <ul class="lookup-order-lines">
          <li v-for="item in foundOrder.items" :key="item.productId + '-' + item.unit"><span>{{ item.name }}（{{ item.unit }}）× {{ item.qty }}</span><span>{{ money(item.price * item.qty) }}</span></li>
        </ul>
        <p v-if="foundOrder.note" class="success-note"><strong>訂單備註</strong><span class="pasted-text multiline-text">{{ foundOrder.note }}</span></p>
        <p class="lookup-total">訂單金額 <strong>{{ money(foundOrder.total) }}</strong></p>
      </div>
    </details>
  </main>
  <ShopFooter />
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ShopHeader from '@/components/ShopHeader.vue';
import ShopFooter from '@/components/ShopFooter.vue';
import ShopIcon from '@/components/ShopIcon.vue';
import { useCart } from '@/composables/useCart';
import { useToast } from '@/composables/useToast';
import { api, todayISO } from '@/lib/api';
import { productImage } from '@/lib/productImage';

const route = useRoute();
const { items, setQty, remove, clear } = useCart();
const { showToast } = useToast();
const amountFormatter = new Intl.NumberFormat('zh-TW');
const noteLimit = 500;
const orderStatuses = { pending: '待處理', shipped: '已出貨', completed: '已完成', cancelled: '已取消' };

const shop = ref({ products: [], settings: {} });
const loading = ref(true);
const loadError = ref('');
const method = ref('pickup');
const pickupDate = ref(todayISO());
const pickupTime = ref('');
const address = ref('');
const customerName = ref('');
const customerPhone = ref('');
const note = ref('');
const submitting = ref(false);
const checkoutError = ref('');
const doneOrder = ref(null);
const successTitle = ref(null);
const lookupPanel = ref(null);
const lookupNumberField = ref(null);
const lookupNumber = ref('');
const lookupPhone = ref('');
const lookupError = ref('');
const lookingUp = ref(false);
const foundOrder = ref(null);

const pickupSlots = computed(() => shop.value.settings.pickupTimeSlots || []);

function money(amount) {
  return `NT$ ${amountFormatter.format(amount)}`;
}

function findVariant(productId, unit) {
  const product = shop.value.products.find((p) => p.id === productId);
  const variant = product?.variants.find((v) => v.unit === unit);
  return variant ? { product, variant, image: productImage(product) } : null;
}

const lines = computed(() =>
  items.value
    .map((item) => ({ ...item, ...findVariant(item.productId, item.unit) }))
    .filter((item) => item.variant)
);
const itemCount = computed(() => lines.value.reduce((count, line) => count + line.qty, 0));
const preorderLines = computed(() => lines.value.filter((line) => line.qty > line.variant.stock && line.product.allowPreorder));
const latestPreorderDate = computed(() =>
  preorderLines.value.reduce((latest, line) => ((line.product.preorderDate || '') > latest ? line.product.preorderDate : latest), '')
);
const minPickupDate = computed(() => {
  const today = todayISO();
  return latestPreorderDate.value > today ? latestPreorderDate.value : today;
});
const preorderHint = computed(() => {
  if (preorderLines.value.length === 0) return '';
  const date = latestPreorderDate.value;
  if (method.value === 'pickup') {
    return date
      ? `訂單含預購商品，預計 ${date} 到貨。最快可於當天自取。`
      : '訂單含預購商品，門市會在到貨後通知取貨。';
  }
  return date
    ? `訂單含預購商品，預計 ${date} 到貨後安排配送。`
    : '訂單含預購商品，到貨後會依序安排配送。';
});

const subtotal = computed(() => lines.value.reduce((amount, line) => amount + line.variant.price * line.qty, 0));
const eligible = computed(() =>
  lines.value.reduce((amount, line) => amount + (line.product.excludeFreeShipping ? 0 : line.variant.price * line.qty), 0)
);
const freeShippingThreshold = computed(() => shop.value.settings.freeShippingThreshold || 0);
const freeShippingOk = computed(() => eligible.value >= freeShippingThreshold.value);
const shippingProgress = computed(() => freeShippingOk.value ? 100 : Math.round(eligible.value / freeShippingThreshold.value * 100));
const shippingFee = computed(() => method.value === 'delivery' && !freeShippingOk.value ? shop.value.settings.shippingFee : 0);
const shippingLabel = computed(() => {
  if (method.value === 'pickup') return '自取免運';
  return shippingFee.value === 0 ? '免運費' : money(shippingFee.value);
});

watch(minPickupDate, (min) => {
  if (pickupDate.value < min) pickupDate.value = min;
});

function changeQty(line, qty) {
  if (qty > line.qty && qty > line.variant.stock && !line.product.allowPreorder) {
    showToast(`「${line.product.name}（${line.unit}）」庫存只剩 ${line.variant.stock}`);
    return;
  }
  setQty(line.productId, line.unit, qty);
}

async function checkout() {
  if (submitting.value) return;
  checkoutError.value = '';
  const name = customerName.value.trim();
  const phone = customerPhone.value.trim();
  if (!name || !phone) {
    checkoutError.value = '請填寫姓名與電話。';
    return;
  }

  const delivery = { method: method.value };
  if (method.value === 'pickup') {
    delivery.pickupDate = pickupDate.value;
    delivery.pickupTime = pickupTime.value;
  } else {
    delivery.address = address.value.trim();
    if (!delivery.address) {
      checkoutError.value = '請填寫收件地址。';
      return;
    }
  }

  submitting.value = true;
  try {
    doneOrder.value = await api('/api/orders', {
      method: 'POST',
      body: { customer: { name, phone }, delivery, note: note.value, items: items.value },
    });
    clear();
    await nextTick();
    successTitle.value?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  } catch (err) {
    checkoutError.value = err.message || '訂單暫時無法送出，請再試一次。';
  } finally {
    submitting.value = false;
  }
}

async function loadShop() {
  loading.value = true;
  loadError.value = '';
  try {
    shop.value = await api('/api/shop');
    pickupTime.value = pickupSlots.value[0] || '';
  } catch (err) {
    loadError.value = err.message || '請稍後再試。';
  } finally {
    loading.value = false;
  }
}

function openLookup(order) {
  if (order) {
    lookupNumber.value = order.orderNo;
    lookupPhone.value = order.customer.phone;
    lookupError.value = '';
    foundOrder.value = null;
  }
  lookupPanel.value.open = true;
  if (order) {
    lookupPanel.value.scrollIntoView({ block: 'start' });
    lookupNumberField.value?.focus({ preventScroll: true });
  }
}

async function lookupOrder() {
  if (lookingUp.value) return;
  lookupError.value = '';
  foundOrder.value = null;
  const number = lookupNumber.value.trim().toUpperCase();
  const phone = lookupPhone.value.trim();
  if (!number || !phone) {
    lookupError.value = '請填寫訂單編號與下單電話。';
    return;
  }

  lookingUp.value = true;
  try {
    const params = new URLSearchParams({ phone });
    foundOrder.value = await api(`/api/orders/${encodeURIComponent(number)}?${params}`);
  } catch (err) {
    lookupError.value = err.message || '訂單暫時無法查詢，請再試一次。';
  } finally {
    lookingUp.value = false;
  }
}

watch(() => route.hash, (hash) => {
  if (hash === '#order-lookup') openLookup();
}, { flush: 'post' });

onMounted(async () => {
  if (route.hash === '#order-lookup') openLookup();
  await loadShop();
  await nextTick();
  if (route.hash === '#order-lookup' && lookupPanel.value?.open) {
    lookupPanel.value.scrollIntoView({ block: 'start' });
  }
});
</script>

<style scoped>
.checkout-page {
  --checkout-ink: var(--green);
  --checkout-muted: var(--muted);
  --checkout-line: var(--line);
  --checkout-surface: var(--card);
  --checkout-accent: #edf2e4;
  width: min(100%, 1220px);
  max-width: none;
  margin: 0 auto;
  padding: 30px 24px 64px;
  color: var(--checkout-ink);
}

.checkout-breadcrumb {
  display: flex;
  align-items: center;
  gap: 11px;
  color: var(--checkout-muted);
  font-size: .86rem;
  margin-bottom: 8px;
}

.checkout-breadcrumb a:hover,
.back-to-shop:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.checkout-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 20px;
  margin-bottom: 26px;
}

.checkout-heading h1 {
  font-family: var(--store-serif);
  font-size: clamp(1.9rem, 4vw, 2.65rem);
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: .035em;
}

.back-to-shop {
  font-size: .88rem;
  font-weight: 700;
  white-space: nowrap;
}

.checkout-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(310px, 355px);
  align-items: start;
  gap: 24px;
}

.checkout-sections {
  display: grid;
  min-width: 0;
  gap: 18px;
}

.checkout-card {
  min-width: 0;
  padding: 24px;
  background: var(--checkout-surface);
  border: 1px solid var(--checkout-line);
  border-radius: 18px;
  box-shadow: 0 3px 13px rgb(36 62 36 / 4%);
}

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}

.section-heading h2,
.lookup-heading strong {
  font-size: 1.2rem;
  line-height: 1.4;
  font-weight: 800;
}

.section-heading span,
.lookup-heading small {
  color: var(--checkout-muted);
  font-size: .83rem;
}

.cart-lines { list-style: none; }

.cart-line {
  display: grid;
  grid-template-columns: 69px minmax(0, 1fr) auto minmax(78px, auto);
  align-items: center;
  gap: 14px;
  border-top: 1px solid var(--checkout-line);
  padding: 14px 0;
}

.cart-line:last-child { padding-bottom: 0; }

.line-thumb {
  display: grid;
  place-items: center;
  width: 69px;
  aspect-ratio: 1;
  background: #f0efe1;
  border-radius: 11px;
  overflow: hidden;
  font-size: 2rem;
}

.line-thumb img { width: 100%; height: 100%; object-fit: cover; }
.line-info { min-width: 0; overflow-wrap: anywhere; }
.line-info h3 { font-size: .98rem; font-weight: 750; }
.line-info p { font-size: .82rem; color: var(--checkout-muted); }
.line-info p span { margin-inline: 2px; }

.line-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 4px;
}

.line-labels span {
  border-radius: 5px;
  padding: 1px 6px;
  background: #f4ead8;
  color: #745221;
  font-size: .7rem;
  font-weight: 650;
}

.line-quantity {
  display: inline-grid;
  grid-template-columns: 33px minmax(32px, auto) 33px;
  align-items: center;
  min-width: 0;
  text-align: center;
  border: 1px solid var(--checkout-line);
  border-radius: 9px;
  color: var(--checkout-ink);
  font-weight: 700;
  font-size: .88rem;
  font-variant-numeric: tabular-nums;
}

.line-quantity button {
  padding: 4px 0;
  min-height: 35px;
  color: inherit;
  background: transparent;
  border-radius: 7px;
  font-size: 1.04rem;
}

.line-quantity button:enabled:hover { background: var(--checkout-accent); }

.line-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
  text-align: right;
  font-size: .88rem;
  white-space: nowrap;
}

.line-total button {
  margin: 0 -5px -4px 0;
  padding: 4px 5px;
  background: transparent;
  color: var(--checkout-muted);
  border-radius: 5px;
  font-size: .78rem;
  font-weight: 500;
}

.line-total button:enabled:hover { color: #934830; text-decoration: underline; }
.line-quantity button:disabled,
.line-total button:disabled { opacity: .55; }

.delivery-options,
.checkout-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.delivery-options { margin-bottom: 15px; }

.delivery-options label {
  position: relative;
  display: flex;
  gap: 9px;
  align-items: center;
  min-height: 67px;
  padding: 9px 12px 9px 38px;
  border: 1px solid var(--checkout-line);
  border-radius: 11px;
  cursor: pointer;
}

.delivery-options label.chosen {
  border-color: #688365;
  background: var(--checkout-accent);
}

.delivery-options label:hover { border-color: #688365; }

.delivery-options input {
  position: absolute;
  inset-inline-start: 12px;
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--checkout-ink);
}

.delivery-options svg { width: 22px; height: 22px; flex: none; }
.delivery-options strong { display: block; font-size: .9rem; }
.delivery-options small { display: block; color: var(--checkout-muted); font-size: .75rem; }

.checkout-field,
.checkout-fields label {
  min-width: 0;
  display: block;
  font-size: .88rem;
  font-weight: 680;
}

.checkout-field small {
  margin-inline-start: 4px;
  color: var(--checkout-muted);
  font-size: .75rem;
  font-weight: 500;
}

.checkout-field textarea,
.checkout-fields input,
.checkout-fields select {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 43px;
  margin-top: 6px;
  padding: 9px 12px;
  border: 1px solid #cbd3c6;
  border-radius: 9px;
  background: #fff;
  color: var(--checkout-ink);
  font: inherit;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
}

.checkout-field textarea {
  resize: vertical;
  overflow-wrap: anywhere;
}

.checkout-field textarea:focus,
.checkout-fields input:focus,
.checkout-fields select:focus {
  border-color: #597555;
  box-shadow: 0 0 0 3px rgb(89 117 85 / 15%);
}

.checkout-page input::placeholder,
.checkout-page textarea::placeholder { color: #717a6e; }
.contact-card .checkout-field { margin-top: 14px; }

.field-help {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-top: 5px;
  color: var(--checkout-muted);
  font-size: .8rem;
}

.field-help span:last-child { white-space: nowrap; font-variant-numeric: tabular-nums; }

.checkout-notice {
  margin-bottom: 14px;
  padding: 9px 12px;
  background: #fbf1db;
  color: #6e501c;
  border-radius: 8px;
  font-size: .84rem;
}

.purchase-summary { position: sticky; top: 94px; }

.price-breakdown > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 4px 0;
  font-size: .91rem;
}

.price-breakdown dt { color: var(--checkout-muted); }
.price-breakdown dd { font-weight: 710; white-space: nowrap; }

.price-breakdown .price-total {
  margin-top: 8px;
  padding: 12px 0 8px;
  border-top: 1px solid var(--checkout-line);
}

.price-total dt { color: var(--checkout-ink); font-weight: 750; }
.price-total dd { font-size: 1.55rem; font-weight: 800; }

.shipping-progress {
  margin-block: 4px 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--checkout-accent);
  font-size: .84rem;
  font-weight: 600;
}

.shipping-progress small { font-size: .73rem; font-weight: 500; }
.shipping-track { height: 5px; margin-block: 6px 2px; background: #d6dfcb; border-radius: 10px; }
.shipping-track span { display: block; min-width: 0; height: 100%; background: #66865f; border-radius: inherit; }

.payment-summary {
  padding-top: 13px;
  margin-bottom: 18px;
  border-top: 1px solid var(--checkout-line);
  font-size: .86rem;
}

.payment-summary h3 {
  margin-bottom: 4px;
  color: var(--checkout-muted);
  font-size: .8rem;
  font-weight: 650;
}

.payment-summary p { color: var(--checkout-muted); }

.bank-disclosure { margin-top: 9px; }
.bank-disclosure summary { cursor: pointer; font-weight: 700; }

.bank-disclosure p,
.payment-details,
.lookup-result {
  padding: 13px 15px;
  background: #f1f3e9;
  border: 1px solid #dce3d2;
  border-radius: 11px;
}

.bank-disclosure p { margin-top: 8px; }
.pasted-text { line-height: 1.7; }

.checkout-action {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 44px;
  padding: 9px 18px;
  background: var(--checkout-ink);
  color: #fff;
  border: 1px solid var(--checkout-ink);
  border-radius: 9px;
  font-size: .9rem;
  font-weight: 750;
  cursor: pointer;
}

.checkout-action:hover { background: #325e48; filter: none; }
.checkout-action:disabled { opacity: .58; cursor: wait; }
.checkout-action:focus-visible { outline: 2px solid var(--checkout-ink); outline-offset: 3px; }
.action-outline { background: transparent; color: var(--checkout-ink); border-color: #91a08f; }
.action-outline:hover { background: var(--checkout-accent); }
.place-order { width: 100%; }

.checkout-error {
  padding: 8px 10px;
  margin-bottom: 10px;
  background: #faede7;
  color: #88422e;
  border-radius: 8px;
  font-size: .85rem;
  overflow-wrap: anywhere;
}

.cart-state,
.order-success {
  padding-block: clamp(24px, 5vw, 50px);
  text-align: center;
}

.cart-state h2,
.order-success h2 { font-size: 1.5rem; font-weight: 800; }
.cart-state p,
.order-success > p { color: var(--checkout-muted); overflow-wrap: anywhere; }
.cart-state .checkout-action { margin-top: 15px; }

.status-mark {
  display: grid;
  place-items: center;
  width: 55px;
  height: 55px;
  margin: 0 auto 11px;
  color: var(--checkout-ink);
  background: #e4edca;
  border-radius: 50%;
}

.status-mark svg {
  width: 28px;
  height: 28px;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.order-facts {
  display: flex;
  justify-content: center;
  gap: 10px 25px;
  flex-wrap: wrap;
  padding: 12px;
  margin-top: 12px;
}

.order-facts dt { color: var(--checkout-muted); font-size: .83rem; }
.order-facts dd { font-size: 1.12rem; font-weight: 800; overflow-wrap: anywhere; }

.payment-details,
.order-success .success-note {
  max-width: 460px;
  margin: 10px auto 0;
  text-align: start;
  font-size: .9rem;
}

.payment-details h3 { margin-bottom: 4px; font-size: .9rem; }

.success-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 17px;
}

.lookup-card {
  max-width: 100%;
  margin-top: 20px;
  padding-block: 15px;
  scroll-margin-top: 95px;
}

.lookup-card summary {
  display: flex;
  gap: 11px;
  align-items: center;
  list-style: none;
  cursor: pointer;
}

.lookup-card summary::-webkit-details-marker { display: none; }
.lookup-icon {
  display: grid;
  place-items: center;
  width: 41px;
  height: 41px;
  background: var(--checkout-accent);
  border-radius: 10px;
  flex: none;
}

.lookup-icon svg { width: 22px; height: 22px; }
.lookup-heading { flex: auto; }
.lookup-heading small { display: block; }
.lookup-chevron { width: 19px; height: 19px; flex: none; transition: transform .15s; }
.lookup-card[open] .lookup-chevron { transform: rotate(180deg); }

.lookup-form {
  display: grid;
  grid-template-columns: minmax(0, 560px) auto;
  align-items: end;
  justify-content: start;
  gap: 12px;
  margin-top: 16px;
}

.lookup-card .checkout-error,
.lookup-result { max-width: 650px; margin-top: 12px; }
.lookup-result { font-size: .87rem; }

.lookup-result-heading,
.lookup-order-lines li,
.lookup-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  overflow-wrap: anywhere;
}

.lookup-result-heading span {
  white-space: nowrap;
  background: #dfeacb;
  border-radius: 6px;
  padding: 2px 7px;
  font-size: .76rem;
  font-weight: 700;
}

.lookup-order-lines { list-style: none; margin: 8px 0; }
.lookup-order-lines li span:last-child { white-space: nowrap; }
.success-note strong,
.success-note span { display: block; }
.success-note strong { margin-bottom: 2px; }
.lookup-total { border-top: 1px solid #dce3d2; margin-top: 8px; padding-top: 8px; }

@media (max-width: 900px) {
  .checkout-layout { grid-template-columns: minmax(0, 1fr) minmax(270px, 300px); gap: 14px; }
  .checkout-card { padding-inline: 18px; }
  .cart-line { grid-template-columns: 55px minmax(0, 1fr) auto minmax(65px, auto); gap: 9px; }
  .line-thumb { width: 55px; }
  .line-quantity { grid-template-columns: 29px minmax(22px, auto) 29px; }
  .delivery-options label { gap: 6px; padding-left: 32px; }
  .delivery-options input { inset-inline-start: 9px; }
  .delivery-options svg { width: 19px; height: 19px; }
}

@media (max-width: 760px) {
  .checkout-page { padding: 24px 18px 46px; }
  .checkout-layout { grid-template-columns: minmax(0, 1fr); }
  .checkout-sections { gap: 14px; }
  .purchase-summary { position: static; }
  .lookup-card { scroll-margin-top: 78px; }
}

@media (max-width: 440px) {
  .checkout-page { padding-inline: 13px; }
  .checkout-heading { margin-bottom: 17px; }
  .checkout-card { padding-inline: 14px; border-radius: 14px; }
  .cart-line { grid-template-columns: 49px minmax(0, 1fr) auto; }
  .line-thumb { grid-column: 1; grid-row: 1; align-self: start; width: 49px; }
  .line-info { grid-column: 2 / -1; grid-row: 1; align-self: start; }
  .line-quantity { grid-column: 2; justify-self: start; }
  .line-total { grid-column: 3; flex-direction: row; align-items: center; gap: 5px; }
  .line-total button { margin: 0 -5px 0 0; }
  .delivery-options label { min-height: 60px; padding-left: 29px; }
  .delivery-options input { inset-inline-start: 8px; width: 13px; height: 13px; }
  .delivery-options svg { display: none; }
  .checkout-fields { gap: 10px; }
  .checkout-field textarea,
  .checkout-fields input,
  .checkout-fields select { padding-inline: 8px; }
  .lookup-form { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 345px) {
  .checkout-fields { grid-template-columns: minmax(0, 1fr); }
}
</style>
