<template>
  <section>
    <div class="panel toolbar">
      <select v-model="filterStatus" style="max-width:140px">
        <option value="">全部狀態</option>
        <option value="pending">待出貨</option>
        <option value="shipped">已出貨</option>
        <option value="completed">已完成</option>
        <option value="cancelled">已取消</option>
      </select>
      <select v-model="filterMethod" style="max-width:140px">
        <option value="">全部配送方式</option>
        <option value="pickup">自取</option>
        <option value="delivery">宅配</option>
      </select>
      <span style="flex:1"></span>
      <button class="btn-sm btn-outline" @click="exportCsv('pickup')">📋 匯出今日自取</button>
      <button class="btn-sm btn-outline" @click="exportCsv('delivery')">🚚 匯出今日宅配</button>
      <button class="btn-sm btn-outline" @click="exportCsv('')">📦 匯出全部訂單</button>
    </div>
    <div class="panel table-panel">
      <table>
        <thead>
          <tr><th>單號</th><th>時間</th><th>配送</th><th>客戶</th><th>內容</th><th>金額</th><th>狀態</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-if="orders.length === 0">
            <td colspan="8" class="empty">沒有符合條件的訂單</td>
          </tr>
          <tr v-for="order in orders" :key="order.id">
            <td><b>{{ order.orderNo }}</b></td>
            <td style="white-space:nowrap">{{ formatTime(order.createdAt) }}</td>
            <td>
              <template v-if="order.delivery.method === 'pickup'">
                <span class="tag tag-pickup">自取</span><br>
                <small>{{ order.delivery.pickupDate }}<br>{{ order.delivery.pickupTime }}</small>
              </template>
              <template v-else>
                <span class="tag tag-delivery">宅配</span><br>
                <small>{{ order.delivery.address }}</small>
              </template>
            </td>
            <td>
              {{ order.customer.name }}<br>
              <small style="color:var(--muted)">{{ order.customer.phone }}</small>
            </td>
            <td>
              <template v-for="(item, i) in order.items" :key="i">
                {{ item.name }}（{{ item.unit }}）×{{ item.qty }}
                <span v-if="item.preorder" class="badge badge-preorder">預購</span>
                <br />
              </template>
              <small v-if="order.note" style="color:var(--orange)">📝 {{ order.note }}</small>
            </td>
            <td style="white-space:nowrap">
              NT$ {{ order.total }}
              <br v-if="order.shippingFee" />
              <small v-if="order.shippingFee" style="color:var(--muted)">含運 {{ order.shippingFee }}</small>
            </td>
            <td><span class="tag" :class="'tag-' + order.status">{{ STATUS_LABEL[order.status] }}</span></td>
            <td>
              <select :value="order.status" @change="updateStatus(order.id, $event.target.value)">
                <option v-for="(label, value) in STATUS_LABEL" :key="value" :value="value">{{ label }}</option>
              </select>
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
