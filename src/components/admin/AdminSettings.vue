<template>
  <section>
    <div class="panel" style="max-width:560px">
      <h2>運費與商店設定</h2>
      <div class="two-col">
        <div class="form-group"><label>免運門檻（元）</label><input v-model="form.freeShippingThreshold" type="number" min="0" /></div>
        <div class="form-group"><label>未達門檻運費（元）</label><input v-model="form.shippingFee" type="number" min="0" /></div>
      </div>
      <div class="form-group">
        <label>自取時間區段（每行一個）</label>
        <textarea v-model="form.pickupTimeSlots" rows="4"></textarea>
      </div>
      <div class="form-group">
        <label>匯款資訊（顯示於訂單成立頁）</label>
        <textarea v-model="form.bankInfo" rows="5"></textarea>
      </div>
      <button @click="saveSettings">儲存設定</button>
    </div>
  </section>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { api } from '@/lib/api';
import { useToast } from '@/composables/useToast';

const props = defineProps({
  settings: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['reload']);
const { showToast } = useToast();

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
    form.bankInfo = s.bankInfo || '';
  },
  { immediate: true, deep: true }
);

async function saveSettings() {
  await api('/api/admin/settings', {
    method: 'PUT',
    body: {
      freeShippingThreshold: form.freeShippingThreshold,
      shippingFee: form.shippingFee,
      pickupTimeSlots: form.pickupTimeSlots.split('\n').map((s) => s.trim()).filter(Boolean),
      bankInfo: form.bankInfo,
    },
  });
  showToast('設定已儲存', 2200);
  emit('reload');
}
</script>
