<template>
  <div v-if="freeShippingThreshold > 0" class="store-announcement">
    <ShopIcon name="truck" />
    宅配滿 NT$ {{ Number(freeShippingThreshold).toLocaleString('zh-TW') }} 免運
  </div>
  <header class="store-header">
    <div class="store-container store-header-inner">
      <RouterLink class="store-brand" to="/">
        <span class="store-brand-mark"><ShopIcon name="leaf" /></span>
        鮮果市集
      </RouterLink>
      <nav class="store-nav" aria-label="商店導覽">
        <RouterLink class="store-nav-link" to="/">逛市集</RouterLink>
        <RouterLink v-slot="{ href, navigate }" to="/cart#order-lookup" custom>
          <a class="store-nav-link" :href="href" :aria-current="isOrderLookup ? 'location' : undefined" @click="navigate">訂單查詢</a>
        </RouterLink>
      </nav>
      <RouterLink v-slot="{ href, navigate, isExactActive }" to="/cart" custom>
        <a class="store-bag" :href="href" :aria-current="isExactActive && !isOrderLookup ? 'page' : undefined" :aria-label="`購物車，共 ${count} 件商品`" @click="navigate">
          <ShopIcon name="bag" />
          <span>購物車</span>
          <span class="store-bag-count">{{ count }}</span>
        </a>
      </RouterLink>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ShopIcon from '@/components/ShopIcon.vue';
import { useCart } from '@/composables/useCart';

defineProps({ freeShippingThreshold: { type: Number, default: 0 } });
const route = useRoute();
const { count } = useCart();
const isOrderLookup = computed(() => route.path === '/cart' && route.hash === '#order-lookup');
</script>
