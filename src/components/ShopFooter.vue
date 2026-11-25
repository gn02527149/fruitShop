<template>
  <footer class="store-footer">
    <div class="store-container store-footer-inner">
      <RouterLink class="store-brand" to="/">
        <span class="store-brand-mark"><ShopIcon name="leaf" /></span>
        鮮果市集
      </RouterLink>
      <nav aria-label="頁尾導覽">
        <RouterLink to="/">逛市集</RouterLink>
        <RouterLink to="/cart">購物車</RouterLink>
        <RouterLink to="/cart#order-lookup">訂單查詢</RouterLink>
      </nav>
    </div>
  </footer>
</template>

<script setup>
import ShopIcon from '@/components/ShopIcon.vue';
</script>
