<template>
  <ShopHeader />
  <main>
    <h1 class="page-title">今日鮮果</h1>
    <div class="category-bar">
      <button
        v-for="cat in categoryTabs"
        :key="cat.id"
        :class="{ active: currentCategory === cat.id }"
        @click="currentCategory = cat.id"
      >
        {{ cat.name }}
      </button>
    </div>
    <div v-if="filteredProducts.length === 0" class="empty">這個分類目前沒有商品</div>
    <div v-else class="product-grid">
      <ProductCard v-for="product in filteredProducts" :key="product.id" :product="product" />
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import ShopHeader from '@/components/ShopHeader.vue';
import ProductCard from '@/components/ProductCard.vue';
import { api } from '@/lib/api';

const shop = ref({ categories: [], products: [], settings: {} });
const currentCategory = ref(0);

const categoryTabs = computed(() => [{ id: 0, name: '全部' }, ...shop.value.categories]);

const filteredProducts = computed(() =>
  shop.value.products.filter(
    (p) => currentCategory.value === 0 || p.categoryIds.includes(currentCategory.value)
  )
);

onMounted(async () => {
  shop.value = await api('/api/shop');
});
</script>
