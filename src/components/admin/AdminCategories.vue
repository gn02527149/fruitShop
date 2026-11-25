<template>
  <section>
    <form class="panel" @submit.prevent="addCategory">
      <h2>新增分類</h2>
      <div class="category-form">
        <div class="form-group">
          <label for="new-category-name">分類名稱</label>
          <input id="new-category-name" v-model="newName" placeholder="例如：當季盛產" required />
        </div>
        <button type="submit" :disabled="pending">新增分類</button>
      </div>
    </form>
    <div class="panel table-panel">
      <div class="records-heading">
        <h2>分類列表</h2>
        <span class="records-count">共 {{ categories.length }} 個分類</span>
      </div>
      <table class="categories-table">
        <thead><tr><th scope="col">分類名稱</th><th scope="col">商品數</th><th scope="col">操作</th></tr></thead>
        <tbody>
          <tr v-if="categories.length === 0">
            <td colspan="3" class="empty">尚無分類</td>
          </tr>
          <tr v-for="category in categories" :key="category.id">
            <td>
              <form v-if="editingId === category.id" :id="`category-edit-${category.id}`" @submit.prevent="renameCategory(category)">
                <input v-model="editedName" :aria-label="`編輯 ${category.name} 的分類名稱`" required />
              </form>
              <template v-else>
                <strong>{{ category.name }}</strong>
                <small>#{{ category.id }}</small>
              </template>
            </td>
            <td>{{ products.filter((product) => product.categoryIds.includes(category.id)).length }}</td>
            <td>
              <div v-if="editingId === category.id" class="admin-actions">
                <button class="btn-sm" type="submit" :form="`category-edit-${category.id}`" :disabled="pending">儲存</button>
                <button class="btn-sm btn-secondary" type="button" :disabled="pending" @click="editingId = null">取消</button>
              </div>
              <div v-else class="admin-actions">
                <button class="btn-sm btn-outline" type="button" :disabled="pending" @click="startEditing(category)">改名</button>
                <button class="btn-danger btn-sm" type="button" :disabled="pending" @click="deleteCategory(category)">刪除</button>
              </div>
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
const editedName = ref('');
const editingId = ref(null);
const pending = ref(false);

async function addCategory() {
  if (pending.value) return;
  const name = newName.value.trim();
  if (!name) return;
  pending.value = true;
  try {
    await api('/api/admin/categories', { method: 'POST', body: { name } });
    newName.value = '';
    showToast('分類已新增', 2200);
    emit('reload');
  } catch (err) {
    showToast(err.message || '新增分類失敗', 2200);
  } finally {
    pending.value = false;
  }
}

function startEditing(category) {
  editingId.value = category.id;
  editedName.value = category.name;
}

async function renameCategory(category) {
  if (pending.value) return;
  const name = editedName.value.trim();
  if (!name) return;
  if (name === category.name) {
    editingId.value = null;
    return;
  }
  pending.value = true;
  try {
    await api(`/api/admin/categories/${category.id}`, { method: 'PUT', body: { name } });
    editingId.value = null;
    showToast('分類名稱已更新', 2200);
    emit('reload');
  } catch (err) {
    showToast(err.message || '更新分類失敗', 2200);
  } finally {
    pending.value = false;
  }
}

async function deleteCategory(category) {
  if (!confirm(`確定刪除分類「${category.name}」？（商品不會被刪除，只會移出此分類）`)) return;
  pending.value = true;
  try {
    await api(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
    showToast('分類已刪除', 2200);
    emit('reload');
  } catch (err) {
    showToast(err.message || '刪除分類失敗', 2200);
  } finally {
    pending.value = false;
  }
}
</script>

<style scoped>
.category-form { display: flex; gap: 9px; align-items: end; }
.category-form .form-group { margin: 0; width: min(100%, 340px); }
.category-form button { white-space: nowrap; min-height: 39px; }
.categories-table td { vertical-align: middle; overflow-wrap: anywhere; }
.categories-table td:first-child { width: 50%; }
.categories-table td:last-child { min-width: 118px; }
.categories-table small { display: block; margin-top: 2px; color: var(--admin-muted); }
.categories-table form { max-width: 250px; }
@media (max-width: 540px) {
  .categories-table th, .categories-table td { padding: 9px; }
  .categories-table td:last-child { min-width: 101px; }
  .categories-table .admin-actions { gap: 4px; }
  .categories-table .admin-actions button { padding-inline: 6px; }
}
</style>
