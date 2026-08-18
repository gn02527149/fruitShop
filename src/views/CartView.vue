<template>
  <ShopHeader />
  <main>
    <h1 class="page-title">🛒 購物車</h1>

    <div v-if="doneOrder" class="panel">
      <div style="text-align:center; padding:16px 0">
        <div style="font-size:44px">✅</div>
        <h2 style="margin:10px 0 4px">訂單成立！</h2>
        <div style="font-size:15px">
          訂單編號 <b style="color:var(--red)">{{ doneOrder.orderNo }}</b>，金額 <b>NT$ {{ doneOrder.total }}</b>
        </div>
        <div style="font-size:13px; color:var(--muted); margin-top:4px">
          請記下單號，方便後續查詢與對帳
        </div>
      </div>
      <div class="bank-box">{{ doneOrder.bankInfo }}</div>
      <div style="text-align:center; margin-top:16px">
        <router-link class="btn" to="/">繼續購物</router-link>
      </div>
    </div>

    <template v-else>
      <div class="panel">
        <div v-if="!loaded" class="empty">載入中…</div>
        <div v-else-if="lines.length === 0" class="empty">購物車是空的，去逛逛吧 🍊</div>
        <table v-else>
          <thead>
            <tr><th>商品</th><th>單價</th><th>數量</th><th>小計</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="line in lines" :key="line.productId + '-' + line.unit">
              <td>
                {{ line.product.emoji }} {{ line.product.name }}<br>
                <small style="color:var(--muted)">{{ line.unit }}</small>
                <span v-if="line.variant.stock === 0 && line.product.allowPreorder" class="badge badge-preorder">預購</span>
                <span v-if="line.product.excludeFreeShipping" class="badge badge-nofree">不計免運</span>
              </td>
              <td>NT$ {{ line.variant.price }}</td>
              <td>
                <span class="qty-control">
                  <button @click="changeQty(line, line.qty - 1)">−</button>
                  {{ line.qty }}
                  <button @click="changeQty(line, line.qty + 1)">＋</button>
                </span>
              </td>
              <td>NT$ {{ line.variant.price * line.qty }}</td>
              <td>
                <button class="btn-danger btn-sm" @click="remove(line.productId, line.unit)">移除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="lines.length > 0" class="panel">
        <h2>配送方式</h2>
        <div class="method-picker">
          <label :class="{ selected: method === 'pickup' }">
            <input v-model="method" type="radio" value="pickup" />
            🏪 到店自取
          </label>
          <label :class="{ selected: method === 'delivery' }">
            <input v-model="method" type="radio" value="delivery" />
            🚚 宅配 / 當日快遞
          </label>
        </div>

        <div v-if="freeShippingHint" class="free-shipping-hint" :class="{ ok: freeShippingOk }">
          {{ freeShippingHint }}
        </div>
        <div v-if="preorderHint" class="free-shipping-hint">{{ preorderHint }}</div>

        <div v-if="method === 'pickup'" class="two-col">
          <div class="form-group">
            <label>預計自取日期</label>
            <input v-model="pickupDate" type="date" :min="minPickupDate" />
          </div>
          <div class="form-group">
            <label>時間區段</label>
            <select v-model="pickupTime">
              <option v-for="slot in pickupSlots" :key="slot" :value="slot">{{ slot }}</option>
            </select>
          </div>
        </div>

        <div v-else class="form-group">
          <label>收件地址</label>
          <input v-model="address" placeholder="縣市、區、路名與門牌" />
        </div>

        <h2 style="margin-top:10px">聯絡資訊</h2>
        <div class="two-col">
          <div class="form-group">
            <label>姓名</label>
            <input v-model="customerName" placeholder="王小明" />
          </div>
          <div class="form-group">
            <label>電話</label>
            <input v-model="customerPhone" placeholder="0912-345-678" />
          </div>
        </div>
        <div class="form-group">
          <label>備註（選填）</label>
          <textarea v-model="note" rows="2" placeholder="例如：匯款帳號後五碼、水果熟度偏好…"></textarea>
        </div>

        <h2 style="margin-top:10px">付款方式</h2>
        <div style="font-size:14px; color:#5d665f">
          目前提供 <b>匯款轉帳</b>，帳號如下。可先完成匯款並將「帳號後五碼」填入上方備註，或下單後再告知。
        </div>
        <div class="bank-box" style="margin-bottom:14px">{{ shop.settings.bankInfo }}</div>

        <div>
          <div class="summary-row"><span>商品小計</span><span>NT$ {{ subtotal }}</span></div>
          <div class="summary-row">
            <span>運費</span>
            <span>{{ shippingLabel }}</span>
          </div>
          <div class="summary-row total"><span>合計</span><span>NT$ {{ subtotal + shippingFee }}</span></div>
        </div>
        <button style="width:100%; margin-top:14px; padding:13px" :disabled="submitting" @click="checkout">
          送出訂單
        </button>
      </div>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import ShopHeader from '@/components/ShopHeader.vue';
import { useCart } from '@/composables/useCart';
import { useToast } from '@/composables/useToast';
import { api, todayISO } from '@/lib/api';

const { items, setQty, remove, clear } = useCart();
const { showToast } = useToast();

const shop = ref({ products: [], settings: {} });
const loaded = ref(false);
const method = ref('pickup');
const pickupDate = ref(todayISO());
const pickupTime = ref('');
const address = ref('');
const customerName = ref('');
const customerPhone = ref('');
const note = ref('');
const submitting = ref(false);
const doneOrder = ref(null);

const pickupSlots = computed(() => shop.value.settings.pickupTimeSlots || []);

function findVariant(productId, unit) {
  const product = shop.value.products.find((p) => p.id === productId);
  if (!product) return null;
  const variant = product.variants.find((v) => v.unit === unit);
  return variant ? { product, variant } : null;
}

const lines = computed(() =>
  items.value
    .map((i) => ({ ...i, ...(findVariant(i.productId, i.unit) || {}) }))
    .filter((i) => i.product && i.variant)
);

const latestPreorderDate = computed(() =>
  lines.value
    .filter((l) => l.qty > l.variant.stock && l.product.allowPreorder)
    .reduce((max, l) => ((l.product.preorderDate || '') > max ? l.product.preorderDate : max), '')
);

const hasPreorder = computed(() =>
  lines.value.some((l) => l.qty > l.variant.stock && l.product.allowPreorder)
);

const minPickupDate = computed(() => {
  const today = todayISO();
  if (!hasPreorder.value) return today;
  return latestPreorderDate.value > today ? latestPreorderDate.value : today;
});

const preorderHint = computed(() => {
  if (!hasPreorder.value) return '';
  const arrive = latestPreorderDate.value;
  if (method.value === 'pickup') {
    return arrive
      ? `📦 訂單含預購商品，預計 ${arrive} 到貨，最快自取日為當天`
      : '📦 訂單含預購商品，到貨時間待定，門市到貨後會另行通知取貨';
  }
  return arrive
    ? `📦 訂單含預購商品，預計 ${arrive} 到貨後安排出貨`
    : '📦 訂單含預購商品，到貨後依序安排出貨';
});

const subtotal = computed(() => lines.value.reduce((s, l) => s + l.variant.price * l.qty, 0));
const eligible = computed(() =>
  lines.value.reduce((s, l) => s + (l.product.excludeFreeShipping ? 0 : l.variant.price * l.qty), 0)
);

const shippingFee = computed(() => {
  if (method.value !== 'delivery') return 0;
  const threshold = shop.value.settings.freeShippingThreshold;
  return eligible.value >= threshold ? 0 : shop.value.settings.shippingFee;
});

const shippingLabel = computed(() => {
  if (method.value === 'pickup') return '自取免運';
  return shippingFee.value === 0 ? '免運費' : 'NT$ ' + shippingFee.value;
});

const freeShippingOk = computed(
  () => method.value === 'delivery' && eligible.value >= shop.value.settings.freeShippingThreshold
);

const freeShippingHint = computed(() => {
  if (method.value !== 'delivery') return '';
  const threshold = shop.value.settings.freeShippingThreshold;
  if (eligible.value >= threshold) return `🎉 已達 NT$ ${threshold} 免運門檻，本單免運費！`;
  return `滿 NT$ ${threshold} 免運，還差 NT$ ${threshold - eligible.value}（特價促銷品不列入計算）`;
});

watch(minPickupDate, (min) => {
  if (pickupDate.value < min) pickupDate.value = min;
});

function changeQty(line, qty) {
  if (qty > line.variant.stock && !line.product.allowPreorder) {
    showToast(`「${line.product.name}（${line.unit}）」庫存只剩 ${line.variant.stock}`);
    return;
  }
  setQty(line.productId, line.unit, qty);
}

async function checkout() {
  const name = customerName.value.trim();
  const phone = customerPhone.value.trim();
  if (!name || !phone) {
    showToast('請填寫姓名與電話');
    return;
  }

  const delivery = { method: method.value };
  if (method.value === 'pickup') {
    delivery.pickupDate = pickupDate.value;
    delivery.pickupTime = pickupTime.value;
    if (!delivery.pickupDate) {
      showToast('請選擇自取日期');
      return;
    }
  } else {
    delivery.address = address.value.trim();
    if (!delivery.address) {
      showToast('請填寫收件地址');
      return;
    }
  }

  submitting.value = true;
  try {
    const data = await api('/api/orders', {
      method: 'POST',
      body: {
        customer: { name, phone },
        delivery,
        note: note.value.trim(),
        items: items.value,
      },
    });
    clear();
    doneOrder.value = data;
    window.scrollTo({ top: 0 });
  } catch (err) {
    showToast(err.message || '訂單送出失敗');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  shop.value = await api('/api/shop');
  pickupTime.value = pickupSlots.value[0] || '';
  loaded.value = true;
});
</script>
