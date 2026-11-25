<template>
  <section>
    <div class="panel orders-toolbar">
      <div class="order-filters">
        <div>
          <label for="order-status-filter">訂單狀態</label>
          <select id="order-status-filter" v-model="filterStatus">
            <option value="">全部狀態</option>
            <option v-for="(label, value) in STATUS_LABEL" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
        <div>
          <label for="order-delivery-filter">配送方式</label>
          <select id="order-delivery-filter" v-model="filterMethod">
            <option value="">全部方式</option>
            <option value="pickup">自取</option>
            <option value="delivery">宅配</option>
          </select>
        </div>
      </div>
      <div class="admin-actions order-exports">
        <button class="btn-sm btn-outline" type="button" @click="exportCsv('pickup')">匯出今日自取</button>
        <button class="btn-sm btn-outline" type="button" @click="exportCsv('delivery')">匯出今日宅配</button>
        <button class="btn-sm btn-outline" type="button" @click="exportCsv('')">匯出全部訂單</button>
      </div>
    </div>
    <div class="panel table-panel">
      <div class="records-heading">
        <h2>訂單列表</h2>
        <span class="records-count">共 {{ orders.length }} 筆訂單</span>
      </div>
      <table class="orders-table">
        <thead>
          <tr><th scope="col">訂單</th><th scope="col">配送</th><th scope="col">顧客</th><th scope="col">品項與備註</th><th scope="col">金額</th><th scope="col">狀態</th></tr>
        </thead>
        <tbody>
          <tr v-if="orders.length === 0">
            <td colspan="6" class="empty">沒有符合條件的訂單</td>
          </tr>
          <tr v-for="order in orders" :key="order.id">
            <td>
              <strong class="order-number">{{ order.orderNo }}</strong>
              <time class="order-secondary" :datetime="order.createdAt">{{ formatTime(order.createdAt) }}</time>
            </td>
            <td data-label="配送">
              <div>
                <template v-if="order.delivery.method === 'pickup'">
                  <span class="tag tag-pickup">自取</span>
                  <small class="order-secondary">{{ order.delivery.pickupDate }}<br />{{ order.delivery.pickupTime }}</small>
                </template>
                <template v-else>
                  <span class="tag tag-delivery">宅配</span>
                  <small class="order-secondary order-address admin-multiline">{{ order.delivery.address }}</small>
                </template>
              </div>
            </td>
            <td data-label="顧客">
              <div>
                <div>{{ order.customer.name }}</div>
                <small class="order-secondary order-phone">{{ order.customer.phone }}</small>
              </div>
            </td>
            <td data-label="品項">
              <div>
                <ul class="order-items">
                  <li v-for="(item, index) in order.items" :key="index">
                    {{ item.name }}（{{ item.unit }}）×{{ item.qty }}
                    <span v-if="item.preorder" class="tag tag-pending">預購</span>
                  </li>
                </ul>
                <div v-if="order.note" class="order-note">
                  <strong>訂單備註</strong>
                  <p class="admin-multiline">{{ order.note }}</p>
                </div>
              </div>
            </td>
            <td data-label="金額">
              <div>
                <strong class="order-total">NT$ {{ order.total?.toLocaleString('zh-TW') ?? '—' }}</strong>
                <small v-if="order.shippingFee" class="order-secondary">含運 {{ order.shippingFee }}</small>
              </div>
            </td>
            <td data-label="狀態">
              <div class="order-status">
                <span class="tag" :class="'tag-' + order.status">{{ STATUS_LABEL[order.status] }}</span>
                <select :value="order.status" :aria-label="`更新 ${order.orderNo} 狀態`" @change="updateStatus(order.id, $event.target.value)">
                  <option v-for="(label, value) in STATUS_LABEL" :key="value" :value="value">{{ label }}</option>
                </select>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue';
import { api, todayISO } from '@/lib/api';
import { useToast } from '@/composables/useToast';

const props = defineProps({
  reloadKey: { type: Number, default: 0 },
});

const STATUS_LABEL = {
  pending: '待出貨',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
};

const { showToast } = useToast();
const orders = ref([]);
const filterStatus = ref('');
const filterMethod = ref('');

async function loadOrders() {
  try {
    const params = new URLSearchParams();
    if (filterStatus.value) params.set('status', filterStatus.value);
    if (filterMethod.value) params.set('method', filterMethod.value);
    orders.value = await api('/api/admin/orders?' + params);
  } catch (err) {
    showToast(err.message || '訂單載入失敗', 2200);
  }
}

async function updateStatus(id, status) {
  try {
    await api(`/api/admin/orders/${id}`, { method: 'PUT', body: { status } });
    showToast(`已更新為「${STATUS_LABEL[status]}」`, 2200);
    await loadOrders();
  } catch {
    showToast('更新失敗', 2200);
  }
}

function exportCsv(method) {
  const params = new URLSearchParams();
  if (method) {
    params.set('method', method);
    params.set('date', todayISO());
  }
  location.href = '/api/admin/orders/export?' + params;
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('zh-TW', { hour12: false });
}

watch([filterStatus, filterMethod, () => props.reloadKey], loadOrders, { immediate: true });
</script>


<style scoped>
.orders-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 14px; }
.order-filters { display: grid; grid-template-columns: repeat(2, minmax(0, 140px)); gap: 10px; }
.order-filters label { display: block; margin-bottom: 4px; color: var(--admin-muted); font-size: 13px; font-weight: 700; }
.order-exports button { min-height: 34px; white-space: nowrap; }
.orders-table td { overflow-wrap: anywhere; }
.order-number { color: var(--admin-ink); }
.order-secondary { display: block; margin-top: 4px; color: var(--admin-muted); font-size: 12px; }
.order-address { max-width: 24ch; }
.order-phone { white-space: nowrap; }
.order-items { display: grid; gap: 4px; list-style: none; }
.order-note { margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: #fff6e5; color: #6c502f; font-size: 13px; }
.order-note strong { display: block; margin-bottom: 3px; color: #784d28; font-size: 12px; }
.order-note p { max-width: 36ch; }
.order-total { white-space: nowrap; }
.order-status { display: grid; justify-items: start; gap: 7px; }
.order-status select { min-width: 92px; max-width: 126px; padding: 5px 8px; font-size: 13px; }

@media (max-width: 1000px) {
  .orders-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .orders-table, .orders-table tbody { display: block; }
  .orders-table tr { display: grid; gap: 10px; padding: 14px 17px; }
  .orders-table tr + tr { border-top: 1px solid var(--admin-rule); }
  .orders-table tr td { min-width: 0; padding: 0; border: 0; }
  .orders-table td[data-label] { display: grid; grid-template-columns: 47px minmax(0, 1fr); gap: 8px; }
  .orders-table td[data-label]::before { content: attr(data-label); color: var(--admin-muted); font-size: 12px; }
  .orders-table .empty { padding-block: 18px; }
  .order-status { display: flex; flex-wrap: wrap; align-items: center; }
  .order-note { width: fit-content; max-width: 100%; }
}
</style>
