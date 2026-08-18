<template>
  <section>
    <div class="panel">
      <h2>{{ editingId ? `編輯商品 #${editingId}｜${form.name}` : '新增商品' }}</h2>
      <div class="flex-gap">
        <div>
          <div class="img-preview">
            <img v-if="form.image" :src="form.image" alt="預覽" />
            <template v-else>{{ form.emoji || '🍎' }}</template>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            style="margin-top:8px; font-size:12px; width:150px"
            @change="onImagePick"
          />
          <button class="btn-sm btn-secondary" style="margin-top:6px" @click="clearImage">清除照片</button>
        </div>
        <div style="flex:1; min-width:280px">
          <div class="two-col" style="grid-template-columns:2fr 1fr">
            <div class="form-group"><label>品名 *</label><input v-model="form.name" /></div>
            <div class="form-group"><label>Emoji（沒照片時顯示）</label><input v-model="form.emoji" placeholder="🍎" /></div>
          </div>
          <div class="form-group"><label>描述</label><textarea v-model="form.description" rows="2"></textarea></div>
          <div class="form-group">
            <label>分類（可複選）</label>
            <div v-if="categories.length" style="display:flex; gap:14px; flex-wrap:wrap; font-size:14px">
              <label v-for="cat in categories" :key="cat.id">
                <input v-model="form.categoryIds" type="checkbox" :value="cat.id" /> {{ cat.name }}
              </label>
            </div>
            <span v-else style="color:var(--muted)">尚無分類，請先到「分類管理」新增</span>
          </div>
        </div>
      </div>

      <div class="form-group" style="margin-top:6px">
        <label>規格與庫存 *（例如：一斤 / 一箱 / 一粒，各自定價與庫存）</label>
        <div v-for="(row, i) in form.variants" :key="i" class="variant-row">
          <input v-model="row.unit" placeholder="單位（一斤 / 一箱 / 一粒）" />
          <input v-model="row.price" type="number" min="0" placeholder="價格" />
          <input v-model="row.stock" type="number" min="0" placeholder="庫存" />
          <button class="btn-danger btn-sm" @click="form.variants.splice(i, 1)">刪</button>
        </div>
        <button class="btn-sm btn-outline" @click="form.variants.push(emptyVariant())">＋ 新增規格</button>
      </div>

      <div style="display:flex; gap:22px; flex-wrap:wrap; margin:10px 0 16px; font-size:14px">
        <label><input v-model="form.allowPreorder" type="checkbox" /> 售完可預購（庫存 0 仍可下單）</label>
        <label>預購預計到貨日 <input v-model="form.preorderDate" type="date" style="width:auto; padding:4px 8px" /></label>
        <label><input v-model="form.excludeFreeShipping" type="checkbox" /> 促銷品：不列入免運門檻</label>
        <label><input v-model="form.active" type="checkbox" /> 上架</label>
      </div>

      <button @click="saveProduct">儲存商品</button>
      <button v-if="editingId" class="btn-secondary" @click="resetForm">取消編輯</button>
    </div>

    <div class="panel table-panel">
      <table>
        <thead>
          <tr><th>ID</th><th>商品</th><th>分類</th><th>規格 / 價格 / 庫存</th><th>標記</th><th>狀態</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td>{{ p.id }}</td>
            <td>
              <img
                v-if="p.image"
                :src="p.image"
                :alt="p.name"
                style="width:36px;height:36px;border-radius:8px;object-fit:cover;vertical-align:middle"
              />
              <template v-else>{{ p.emoji }}</template>
              {{ p.name }}
            </td>
            <td>{{ categoryNames(p) }}</td>
            <td>
              <template v-for="(v, i) in p.variants" :key="v.unit">
                {{ v.unit }}：NT${{ v.price }}（庫存 <b :style="{ color: v.stock === 0 ? 'var(--red)' : '' }">{{ v.stock }}</b>）
                <br v-if="i < p.variants.length - 1" />
              </template>
            </td>
            <td>
              <span v-if="p.allowPreorder" class="tag tag-pending">可預購{{ p.preorderDate ? '｜' + p.preorderDate + ' 到貨' : '' }}</span>
              <span v-if="p.excludeFreeShipping" class="tag tag-pickup">不計免運</span>
            </td>
            <td><span class="tag" :class="p.active ? 'tag-completed' : 'tag-off'">{{ p.active ? '上架中' : '已下架' }}</span></td>
            <td style="white-space:nowrap">
              <button class="btn-sm" @click="editProduct(p)">編輯</button>
              <button class="btn-danger btn-sm" @click="deleteProduct(p)">刪除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { api } from '@/lib/api';
import { useToast } from '@/composables/useToast';

const props = defineProps({
  products: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
});
const emit = defineEmits(['reload']);
const { showToast } = useToast();

const fileInput = ref(null);
const editingId = ref(null);

function emptyVariant() {
  return { unit: '', price: '', stock: 0 };
}

function blankForm() {
  return {
    name: '',
    emoji: '',
    description: '',
    image: '',
    categoryIds: [],
    variants: [emptyVariant()],
    allowPreorder: false,
    preorderDate: '',
    excludeFreeShipping: false,
    active: true,
  };
}

const form = reactive(blankForm());

function assignForm(src) {
  Object.assign(form, {
    name: src.name,
    emoji: src.emoji,
    description: src.description,
    image: src.image || '',
    categoryIds: [...(src.categoryIds || [])],
    variants: src.variants.map((v) => ({ ...v })),
    allowPreorder: src.allowPreorder,
    preorderDate: src.preorderDate || '',
    excludeFreeShipping: src.excludeFreeShipping,
    active: src.active,
  });
}

function categoryNames(product) {
  return product.categoryIds
    .map((id) => (props.categories.find((c) => c.id === id) || {}).name)
    .filter(Boolean)
    .join('、') || '—';
}

function onImagePick(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    showToast('圖片請小於 3MB', 2200);
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    form.image = reader.result;
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  form.image = '';
  if (fileInput.value) fileInput.value.value = '';
}

function editProduct(product) {
  editingId.value = product.id;
  assignForm(product);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  editingId.value = null;
  assignForm(blankForm());
  if (fileInput.value) fileInput.value.value = '';
}

async function saveProduct() {
  const variants = form.variants.filter((v) => v.unit && v.price !== '');
  if (!form.name.trim() || variants.length === 0) {
    showToast('品名為必填，且至少要有一個規格（單位＋價格）', 2200);
    return;
  }
  const body = {
    name: form.name.trim(),
    emoji: form.emoji.trim(),
    image: form.image,
    description: form.description.trim(),
    categoryIds: form.categoryIds,
    variants,
    allowPreorder: form.allowPreorder,
    preorderDate: form.preorderDate,
    excludeFreeShipping: form.excludeFreeShipping,
    active: form.active,
  };
  try {
    await api(editingId.value ? `/api/admin/products/${editingId.value}` : '/api/admin/products', {
      method: editingId.value ? 'PUT' : 'POST',
      body,
    });
    showToast(editingId.value ? '商品已更新' : '商品已新增', 2200);
    resetForm();
    emit('reload');
  } catch (err) {
    showToast(err.message || '儲存失敗', 2200);
  }
}

async function deleteProduct(product) {
  if (!confirm(`確定要刪除「${product.name}」嗎？`)) return;
  try {
    await api(`/api/admin/products/${product.id}`, { method: 'DELETE' });
    showToast('商品已刪除', 2200);
    if (editingId.value === product.id) resetForm();
    emit('reload');
  } catch {
    showToast('刪除失敗', 2200);
  }
}
</script>
