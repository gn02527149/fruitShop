<template>
  <section>
    <div class="panel">
      <h2>新增分類</h2>
      <div class="inline-form">
        <input v-model="newName" placeholder="例如：當季盛產、免運組合…" style="max-width:300px" @keydown.enter="addCategory" />
        <button @click="addCategory">新增</button>
      </div>
    </div>
    <div class="panel table-panel">
      <table>
        <thead><tr><th>ID</th><th>名稱</th><th>商品數</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-if="categories.length === 0">
            <td colspan="4" class="empty">尚無分類</td>
          </tr>
          <tr v-for="cat in categories" :key="cat.id">
            <td>{{ cat.id }}</td>
            <td>{{ cat.name }}</td>
            <td>{{ products.filter((p) => p.categoryIds.includes(cat.id)).length }}</td>
            <td>
              <button class="btn-sm" @click="renameCategory(cat)">改名</button>
              <button class="btn-danger btn-sm" @click="deleteCategory(cat)">刪除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '@/lib/api';
import { useToast } from '@/composables/useToast';

defineProps({
  products: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
});
const emit = defineEmits(['reload']);
const { showToast } = useToast();
const newName = ref('');

async function addCategory() {
  const name = newName.value.trim();
  if (!name) return;
  await api('/api/admin/categories', { method: 'POST', body: { name } });
  newName.value = '';
  showToast('分類已新增', 2200);
  emit('reload');
}

async function renameCategory(cat) {
  const name = prompt('分類名稱：', cat.name);
  if (!name || name === cat.name) return;
  await api(`/api/admin/categories/${cat.id}`, { method: 'PUT', body: { name } });
  emit('reload');
}

async function deleteCategory(cat) {
  if (!confirm(`確定刪除分類「${cat.name}」？（商品不會被刪除，只會移出此分類）`)) return;
  await api(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
  emit('reload');
}
</script>
