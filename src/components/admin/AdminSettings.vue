<template>
  <section>
    <form class="settings-grid" @submit.prevent="saveSettings">
      <div class="panel settings-panel">
        <h2>配送與自取</h2>
        <div class="two-col">
          <div class="form-group">
            <label for="free-shipping-threshold">免運門檻（元）</label>
            <input id="free-shipping-threshold" v-model="form.freeShippingThreshold" type="number" min="0" step="any" />
          </div>
          <div class="form-group">
            <label for="shipping-fee">未達門檻運費（元）</label>
            <input id="shipping-fee" v-model="form.shippingFee" type="number" min="0" step="any" />
          </div>
        </div>
        <div class="form-group">
          <label for="pickup-time-slots">自取時段</label>
          <textarea id="pickup-time-slots" v-model="form.pickupTimeSlots" rows="4" aria-describedby="pickup-time-help" placeholder="10:00-12:00"></textarea>
          <p id="pickup-time-help" class="admin-help">每行一個時段，可一次貼上多行。</p>
        </div>
      </div>
      <div class="panel settings-panel">
        <h2>匯款資訊</h2>
        <div class="form-group">
          <label for="bank-information">付款說明</label>
          <textarea id="bank-information" v-model="form.bankInfo" rows="6" aria-describedby="bank-information-help" placeholder="可分行填寫銀行、帳號與匯款提醒"></textarea>
          <p id="bank-information-help" class="admin-help">顧客會在結帳及訂單成立時看到這段文字。</p>
        </div>
        <div v-if="form.bankInfo.trim()" class="bank-preview">
          <h3>顧客畫面預覽</h3>
          <div class="admin-multiline">{{ form.bankInfo }}</div>
        </div>
      </div>
      <div class="settings-actions">
        <button type="submit" :disabled="saving">{{ saving ? '儲存中…' : '儲存設定' }}</button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { api } from '@/lib/api';
import { useToast } from '@/composables/useToast';

const props = defineProps({
  settings: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['reload']);
const { showToast } = useToast();
const saving = ref(false);

const form = reactive({
  freeShippingThreshold: 0,
  shippingFee: 0,
  pickupTimeSlots: '',
  bankInfo: '',
});

watch(
  () => props.settings,
  (s) => {
    form.freeShippingThreshold = s.freeShippingThreshold ?? 0;
    form.shippingFee = s.shippingFee ?? 0;
    form.pickupTimeSlots = (s.pickupTimeSlots || []).join('\n');
    form.bankInfo = String(s.bankInfo ?? '');
  },
  { immediate: true, deep: true }
);

async function saveSettings() {
  if (saving.value) return;
  saving.value = true;
  try {
    await api('/api/admin/settings', {
      method: 'PUT',
      body: {
        freeShippingThreshold: form.freeShippingThreshold,
        shippingFee: form.shippingFee,
        pickupTimeSlots: form.pickupTimeSlots.split(/\r\n?|\n/).map((slot) => slot.trim()).filter(Boolean),
        bankInfo: form.bankInfo,
      },
    });
    showToast('設定已儲存', 2200);
    emit('reload');
  } catch (err) {
    showToast(err.message || '設定儲存失敗', 2200);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }
.settings-panel { min-width: 0; margin: 0; }
.settings-panel .two-col { row-gap: 0; }
.settings-panel .form-group:last-child { margin-bottom: 0; }
.settings-actions { grid-column: 1 / -1; }
.bank-preview { margin-top: 18px; padding: 14px 16px; border-radius: 10px; background: #f3f6ec; font-size: 14px; }
.bank-preview h3 { margin-bottom: 7px; color: var(--admin-ink); font-size: 13px; }
@media (max-width: 720px) { .settings-grid { grid-template-columns: 1fr; } }
</style>
