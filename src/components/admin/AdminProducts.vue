<template>
  <section>
    <form v-if="editorOpen" ref="editor" class="panel product-editor" @submit.prevent="saveProduct">
      <div class="product-editor-heading">
        <h2>{{ editingId ? '編輯商品' : '新增商品' }}</h2>
        <span v-if="editingId">#{{ editingId }}</span>
      </div>
      <div class="product-basics">
        <div class="image-tools">
          <div class="img-preview">
            <img v-if="form.image" :src="form.image" alt="商品照片預覽" />
            <span v-else aria-hidden="true">{{ form.emoji || '🍎' }}</span>
          </div>
          <label class="image-picker">
            <span>選擇照片</span>
            <input ref="fileInput" type="file" accept="image/*" @change="onImagePick" />
          </label>
          <button v-if="form.image" class="btn-sm btn-secondary" type="button" @click="clearImage">清除照片</button>
        </div>
        <div class="product-basics-fields">
          <div class="two-col field-columns">
            <div class="form-group">
              <label for="catalog-product-name">品名 *</label>
              <input id="catalog-product-name" ref="nameInput" v-model="form.name" required />
            </div>
            <div class="form-group">
              <label for="catalog-product-emoji">無照片時顯示的 Emoji</label>
              <input id="catalog-product-emoji" v-model="form.emoji" placeholder="🍎" />
            </div>
          </div>
          <div class="form-group">
            <label for="catalog-product-description">商品描述</label>
            <textarea id="catalog-product-description" v-model="form.description" rows="5" aria-describedby="catalog-description-help" placeholder="例如：口感、產地特色與保存方式"></textarea>
            <p id="catalog-description-help" class="admin-help">可直接貼上多行文字，段落會顯示於商店的商品介紹。</p>
          </div>
          <fieldset class="product-fieldset">
            <legend>商品分類</legend>
            <div v-if="categories.length" class="checkbox-row">
              <label v-for="cat in categories" :key="cat.id">
                <input v-model="form.categoryIds" type="checkbox" :value="cat.id" /> {{ cat.name }}
              </label>
            </div>
            <p v-else class="admin-help">請先到「分類管理」新增分類。</p>
          </fieldset>
        </div>
      </div>

      <fieldset class="product-fieldset product-specs">
        <legend>規格與庫存 *</legend>
        <div v-for="(row, i) in form.variants" :key="i" class="variant-row">
          <label>
            <span>規格</span>
            <input v-model="row.unit" placeholder="例：一盒" />
          </label>
          <label>
            <span>價格（元）</span>
            <input v-model="row.price" type="number" min="0" step="any" />
          </label>
          <label>
            <span>庫存</span>
            <input v-model="row.stock" type="number" min="0" step="any" />
          </label>
          <button class="btn-danger btn-sm" type="button" :aria-label="`刪除第 ${i + 1} 個規格`" @click="form.variants.splice(i, 1)">移除</button>
        </div>
        <button class="btn-sm btn-outline" type="button" @click="form.variants.push(emptyVariant())">＋ 新增規格</button>
      </fieldset>

      <fieldset class="product-fieldset selling-options">
        <legend>上架與配送</legend>
        <div class="checkbox-row">
          <label><input v-model="form.active" type="checkbox" /> 上架</label>
          <label><input v-model="form.allowPreorder" type="checkbox" /> 售完可預購</label>
          <label><input v-model="form.excludeFreeShipping" type="checkbox" /> 不列入免運門檻</label>
          <label class="preorder-date">預購到貨日 <input v-model="form.preorderDate" type="date" /></label>
        </div>
      </fieldset>

      <div class="admin-actions">
        <button type="submit" :disabled="saving">{{ saving ? '儲存中…' : '儲存商品' }}</button>
        <button class="btn-secondary" type="button" :disabled="saving" @click="resetForm">取消</button>
      </div>
    </form>

    <div class="panel table-panel">
      <div class="records-heading">
        <div class="product-list-title">
          <h2>商品列表</h2>
          <span class="records-count">共 {{ products.length }} 件商品</span>
        </div>
        <button class="btn-sm" type="button" :disabled="editorOpen" @click="openEditor()">＋ 新增商品</button>
      </div>
      <table class="catalog-table">
        <thead>
          <tr><th scope="col">商品</th><th scope="col">分類</th><th scope="col">規格與庫存</th><th scope="col">狀態</th><th scope="col">操作</th></tr>
        </thead>
        <tbody>
          <tr v-if="products.length === 0"><td colspan="5" class="empty">尚無商品</td></tr>
          <tr v-for="product in products" :key="product.id">
            <td>
              <div class="catalog-product">
                <div class="catalog-thumbnail" aria-hidden="true">
                  <img v-if="productImage(product)" :src="productImage(product)" alt="" loading="lazy" />
                  <span v-else>{{ product.emoji }}</span>
                </div>
                <div>
                  <strong>{{ product.name }}</strong>
                  <small>#{{ product.id }}</small>
                </div>
              </div>
            </td>
            <td data-label="分類">{{ categoryNames(product) }}</td>
            <td data-label="規格與庫存">
              <div class="catalog-variants">
                <span v-for="(variant, index) in product.variants" :key="index">
                  {{ variant.unit }} · NT$ {{ variant.price?.toLocaleString('zh-TW') ?? '—' }}
                  <small :class="{ 'sold-out': variant.stock === 0 }">庫存 {{ variant.stock }}</small>
                </span>
              </div>
            </td>
            <td data-label="狀態">
              <div class="catalog-status">
                <span class="tag" :class="product.active ? 'tag-completed' : 'tag-off'">{{ product.active ? '上架中' : '已下架' }}</span>
                <span v-if="product.allowPreorder" class="tag tag-pending">可預購</span>
                <span v-if="product.excludeFreeShipping" class="tag tag-pickup">不計免運</span>
                <small v-if="product.allowPreorder && product.preorderDate">{{ product.preorderDate }} 到貨</small>
              </div>
            </td>
            <td>
              <div class="admin-actions">
                <button class="btn-sm btn-outline" type="button" :disabled="saving" :aria-label="`編輯 ${product.name}`" @click="openEditor(product)">編輯</button>
                <button class="btn-danger btn-sm" type="button" :disabled="saving" :aria-label="`刪除 ${product.name}`" @click="deleteProduct(product)">刪除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { nextTick, reactive, ref } from 'vue';
import { api } from '@/lib/api';
import { productImage } from '@/lib/productImage';
import { useToast } from '@/composables/useToast';

const props = defineProps({
  products: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
});
const emit = defineEmits(['reload']);
const { showToast } = useToast();

const editor = ref(null);
const editorOpen = ref(false);
const fileInput = ref(null);
const nameInput = ref(null);
const editingId = ref(null);
const saving = ref(false);

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
    emoji: src.emoji || '',
    description: src.description || '',
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

async function openEditor(product) {
  editingId.value = product?.id ?? null;
  assignForm(product ?? blankForm());
  editorOpen.value = true;
  await nextTick();
  if (fileInput.value) fileInput.value.value = '';
  editor.value?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  nameInput.value?.focus({ preventScroll: true });
}

function resetForm() {
  editingId.value = null;
  editorOpen.value = false;
  assignForm(blankForm());
}

async function saveProduct() {
  if (saving.value) return;
  const variants = form.variants.filter((v) => v.unit && v.price !== '');
  if (!form.name.trim() || variants.length === 0) {
    showToast('品名為必填，且至少要有一個規格（單位＋價格）', 2200);
    return;
  }
  const body = {
    name: form.name.trim(),
    emoji: form.emoji.trim(),
    image: form.image,
    description: form.description,
    categoryIds: form.categoryIds,
    variants,
    allowPreorder: form.allowPreorder,
    preorderDate: form.preorderDate,
    excludeFreeShipping: form.excludeFreeShipping,
    active: form.active,
  };
  saving.value = true;
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
  } finally {
    saving.value = false;
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


<style scoped>
.product-editor { scroll-margin-top: 92px; }
.product-editor-heading { display: flex; align-items: baseline; gap: 9px; margin-bottom: 16px; }
.product-editor-heading h2 { margin: 0; }
.product-editor-heading span { color: var(--admin-muted); font-size: 13px; }
.product-basics { display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 20px; }
.image-tools { display: grid; justify-items: start; gap: 8px; align-content: start; }
.image-tools .img-preview { width: 100%; height: auto; aspect-ratio: 1; }
.image-picker { position: relative; color: var(--admin-ink); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; font-size: 13px; }
.image-picker input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.image-picker:focus-within { outline: 2px solid var(--admin-ink); outline-offset: 3px; border-radius: 3px; }
.field-columns { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
.product-fieldset { min-width: 0; border: 0; padding: 0; }
.product-fieldset legend { font-size: 14px; font-weight: 700; color: var(--admin-ink); margin-bottom: 8px; }
.product-specs, .selling-options { margin: 21px 0; }
.variant-row { align-items: end; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto; }
.variant-row label span { display: block; margin-bottom: 3px; color: var(--admin-muted); font-size: 12px; }
.variant-row button { min-height: 38px; }
.checkbox-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 17px; }
.checkbox-row label { display: flex; align-items: center; gap: 5px; font-size: 14px; overflow-wrap: anywhere; }
.preorder-date input { width: auto; max-width: 100%; padding: 3px 7px; }
.product-list-title { display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px 12px; }
.catalog-table td { vertical-align: middle; overflow-wrap: anywhere; }
.catalog-product { display: flex; align-items: center; gap: 10px; min-width: 132px; }
.catalog-product small, .catalog-status small { display: block; color: var(--admin-muted); font-size: 12px; }
.catalog-thumbnail { width: 44px; height: 44px; display: grid; place-items: center; flex: 0 0 44px; border-radius: 8px; overflow: hidden; background: #eff3e9; font-size: 23px; }
.catalog-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
.catalog-variants { display: grid; gap: 2px; font-size: 13px; }
.catalog-variants small { margin-left: 4px; color: var(--admin-muted); }
.catalog-variants .sold-out { color: #a64c2f; }
.catalog-status { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.catalog-table .admin-actions { min-width: 104px; }

@media (max-width: 690px) {
  .catalog-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .catalog-table, .catalog-table tbody { display: block; }
  .catalog-table tr { display: grid; gap: 8px; padding: 13px 16px; }
  .catalog-table tr + tr { border-top: 1px solid var(--admin-rule); }
  .catalog-table tr td { border: 0; padding: 0; min-width: 0; }
  .catalog-table td[data-label] { display: grid; grid-template-columns: 69px minmax(0, 1fr); gap: 8px; }
  .catalog-table td[data-label]::before { content: attr(data-label); color: var(--admin-muted); font-size: 12px; }
  .catalog-table .empty { padding-block: 18px; }
  .catalog-table .admin-actions { margin-top: 3px; }
}
@media (max-width: 540px) {
  .product-basics { grid-template-columns: minmax(0, 1fr); gap: 15px; }
  .image-tools { grid-template-columns: 66px auto auto; justify-content: start; align-items: center; }
  .field-columns { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .variant-row { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: end; }
  .variant-row button { justify-self: start; }
}
</style>
