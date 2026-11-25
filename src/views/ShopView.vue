<template>
  <ShopHeader :free-shipping-threshold="shop.settings.freeShippingThreshold" />
  <main class="store-main store-container">
    <section class="market-hero" aria-labelledby="market-title">
      <div class="market-hero-content">
        <h1 id="market-title">把當季鮮果，<br />帶上餐桌。</h1>
        <p>台灣在地鮮果、各國進口水果，一次挑齊。</p>
        <a class="market-cta" href="#products" @click.prevent="goToProducts">
          開始選購 <ShopIcon name="arrow-right" />
        </a>
      </div>
      <img
        class="market-hero-photo"
        :src="heroImage"
        alt="籐籃裡裝著芒果、葡萄、柑橘和草莓"
        fetchpriority="high"
        width="1400"
        height="1050"
      />
    </section>

    <div class="market-services" aria-label="購物服務">
      <div class="market-service">
        <span class="market-service-icon"><ShopIcon name="truck" /></span>
        <div><strong>宅配到府</strong><span>結帳時可查看運費</span></div>
      </div>
      <div class="market-service">
        <span class="market-service-icon"><ShopIcon name="store" /></span>
        <div><strong>到店自取</strong><span>可預約取貨時段</span></div>
      </div>
      <RouterLink class="market-service" to="/cart#order-lookup">
        <span class="market-service-icon"><ShopIcon name="receipt" /></span>
        <div><strong>訂單查詢</strong><span>查看訂單與出貨進度</span></div>
        <ShopIcon class="market-service-arrow" name="arrow-right" />
      </RouterLink>
    </div>

    <section id="products" class="market-products" aria-labelledby="products-title">
      <div class="market-section-header">
        <div>
          <h2 id="products-title" ref="productsTitle" tabindex="-1">今日鮮果</h2>
          <p v-if="loadState === 'ready'" role="status">{{ filteredProducts.length }} 項商品</p>
        </div>
        <div class="market-search" role="search">
          <ShopIcon name="search" />
          <input v-model="query" type="search" aria-label="搜尋水果" placeholder="搜尋水果" />
        </div>
      </div>
      <div v-if="loadState === 'ready'" class="market-categories" aria-label="商品分類">
        <button
          v-for="category in categoryTabs"
          :key="category.id"
          type="button"
          :aria-pressed="currentCategory === category.id"
          @click="currentCategory = category.id"
        >
          {{ category.name }}
        </button>
      </div>
      <div v-if="loadState === 'loading'" class="market-empty" role="status">正在載入商品…</div>
      <div v-else-if="loadState === 'error'" class="market-empty" role="alert">
        <p>目前無法載入商品</p>
        <button type="button" @click="loadShop">重新載入</button>
      </div>
      <div v-else-if="filteredProducts.length === 0" class="market-empty">
        <p>{{ query.trim() ? '沒有找到符合的商品' : '這個分類目前沒有商品' }}</p>
        <button v-if="query.trim() || currentCategory !== 0" type="button" @click="resetFilters">查看全部商品</button>
      </div>
      <div v-else class="market-grid">
        <ProductCard v-for="product in filteredProducts" :key="product.id" :product="product" />
      </div>
    </section>
  </main>
  <ShopFooter />
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import ShopHeader from '@/components/ShopHeader.vue';
import ShopFooter from '@/components/ShopFooter.vue';
import ShopIcon from '@/components/ShopIcon.vue';
import ProductCard from '@/components/ProductCard.vue';
import { api } from '@/lib/api';

const heroImage = `${import.meta.env.BASE_URL}images/market-hero.webp`;
const shop = ref({ categories: [], products: [], settings: {} });
const loadState = ref('loading');
const currentCategory = ref(0);
const query = ref('');
const productsTitle = ref(null);

const categoryTabs = computed(() => [{ id: 0, name: '全部商品' }, ...shop.value.categories]);

const filteredProducts = computed(() => {
  const term = query.value.trim().toLocaleLowerCase();
  return shop.value.products.filter((product) => {
    const matchesCategory = currentCategory.value === 0 || product.categoryIds.includes(currentCategory.value);
    return matchesCategory && `${product.name} ${product.description || ''}`.toLocaleLowerCase().includes(term);
  });
});

function resetFilters() {
  query.value = '';
  currentCategory.value = 0;
}

function goToProducts() {
  productsTitle.value?.focus({ preventScroll: true });
  document.getElementById('products')?.scrollIntoView();
}

async function loadShop() {
  loadState.value = 'loading';
  try {
    shop.value = await api('/api/shop');
    loadState.value = 'ready';
  } catch {
    loadState.value = 'error';
  }
}

onMounted(loadShop);
</script>
