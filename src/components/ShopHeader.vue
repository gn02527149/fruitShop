<template>
  <header>
    <router-link class="logo" to="/">🍉 鮮果市集</router-link>
    <nav>
      <router-link to="/">商品</router-link>
      <router-link to="/cart">🛒 購物車 <span class="cart-badge">{{ count }}</span></router-link>
    </nav>
  </header>
</template>

<script setup>
import { useCart } from '@/composables/useCart';

const { count } = useCart();
</script>
