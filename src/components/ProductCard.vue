<template>
  <div class="card">
    <div class="badges">
      <span v-if="state === 'soldout'" class="badge badge-soldout">已售完</span>
      <span v-if="state === 'preorder'" class="badge badge-preorder">開放預購</span>
      <span v-if="product.excludeFreeShipping" class="badge badge-nofree">不計免運</span>
    </div>
    <div class="thumb">
      <img v-if="product.image" :src="product.image" :alt="product.name" />
      <template v-else>{{ product.emoji }}</template>
    </div>
    <div class="body">
      <div class="name">{{ product.name }}</div>
      <div class="desc">{{ product.description }}</div>
      <div class="price">
        NT$ {{ variant.price }}
        <small v-if="variant.stock > 0">/ {{ variant.unit }}　庫存 {{ variant.stock }}</small>
        <small v-else-if="product.allowPreorder">/ {{ variant.unit }}　預計 {{ product.preorderDate || '待定' }} 到貨</small>
        <small v-else>/ {{ variant.unit }}</small>
      </div>
      <div class="row">
        <select v-model.number="variantIndex">
          <option v-for="(v, i) in product.variants" :key="v.unit" :value="i">{{ v.unit }}</option>
        </select>
        <input v-model.number="qty" type="number" min="1" />
      </div>
      <button
        :class="{ 'btn-orange': variant.stock === 0 && product.allowPreorder }"
        :disabled="variant.stock === 0 && !product.allowPreorder"
        @click="addToCart"
      >
        {{ buttonLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useCart } from '@/composables/useCart';
import { useToast } from '@/composables/useToast';
import { productState } from '@/lib/api';

const props = defineProps({
  product: { type: Object, required: true },
});

const { add } = useCart();
const { showToast } = useToast();

const variantIndex = ref(0);
const qty = ref(1);

const variant = computed(() => props.product.variants[variantIndex.value]);
const state = computed(() => productState(props.product));

const buttonLabel = computed(() => {
  if (variant.value.stock > 0) return '加入購物車';
  if (props.product.allowPreorder) return '預購';
  return '已售完';
});

function addToCart() {
  const amount = Math.max(1, Number(qty.value) || 1);
  add(props.product.id, variant.value.unit, amount);
  showToast(
    variant.value.stock === 0
      ? `已將「${props.product.name}（${variant.value.unit}）」加入預購`
      : `已將「${props.product.name}（${variant.value.unit}）」×${amount} 加入購物車`
  );
}
</script>
