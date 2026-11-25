<template>
  <article class="market-card">
    <div class="market-card-media">
      <img v-if="image && !imageFailed" :src="image" :alt="product.name" loading="lazy" width="356" height="356" @error="imageFailed = true" />
      <span v-else class="market-card-emoji" aria-hidden="true">{{ product.emoji || '🍎' }}</span>
      <div v-if="state !== 'normal' || product.excludeFreeShipping" class="market-card-badges">
        <span v-if="state === 'soldout'" class="market-badge market-badge-soldout">已售完</span>
        <span v-else-if="state === 'preorder'" class="market-badge market-badge-preorder">開放預購</span>
        <span v-if="product.excludeFreeShipping" class="market-badge market-badge-excluded">不計免運</span>
      </div>
    </div>
    <div class="market-card-body">
      <h3>{{ product.name }}</h3>
      <div class="market-card-description">
        <template v-if="isLongDescription">
          <p v-if="!expanded" class="multiline-text">{{ preview }}</p>
          <p v-show="expanded" :id="`description-${product.id}`" class="multiline-text">{{ description }}</p>
          <button class="market-description-toggle" type="button" :aria-expanded="expanded" :aria-controls="`description-${product.id}`" @click="expanded = !expanded">
            {{ expanded ? '收合介紹' : '展開介紹' }} <ShopIcon name="chevron-down" />
          </button>
        </template>
        <p v-else-if="description" class="multiline-text">{{ description }}</p>
      </div>
      <div class="market-card-price">
        <strong><span>NT$</span> {{ Number(variant.price).toLocaleString('zh-TW') }}</strong>
        <span>/ {{ variant.unit }}</span>
      </div>
      <div class="market-card-stock">
        <span :class="['market-stock-dot', { 'is-preorder': isPreorder, 'is-sold-out': isSoldOut }]"></span>
        {{ stockLabel }}
      </div>
      <div class="market-card-controls">
        <select v-model.number="variantIndex" :aria-label="`${product.name}規格`" @change="qty = 1">
          <option v-for="(option, index) in product.variants" :key="option.unit" :value="index">{{ option.unit }}</option>
        </select>
        <div class="market-stepper" role="group" :aria-label="`${product.name}數量`">
          <button type="button" :disabled="unavailable || qty <= 1" :aria-label="`減少${product.name}數量`" @click="changeQty(-1)">
            <ShopIcon name="minus" />
          </button>
          <input
            v-model.number="qty"
            type="number"
            inputmode="numeric"
            min="1"
            :max="product.allowPreorder ? undefined : Math.max(1, remaining)"
            :disabled="unavailable"
            :aria-label="`${product.name}購買數量`"
            @blur="qty = normalizedQty"
          />
          <button type="button" :disabled="unavailable || (!product.allowPreorder && normalizedQty >= remaining)" :aria-label="`增加${product.name}數量`" @click="changeQty(1)">
            <ShopIcon name="plus" />
          </button>
        </div>
      </div>
      <button class="market-add" type="button" :class="{ 'is-preorder': isPreorder }" :disabled="unavailable" @click="addToCart">
        <ShopIcon v-if="!unavailable" name="bag" />
        {{ buttonLabel }}
      </button>
    </div>
  </article>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import ShopIcon from '@/components/ShopIcon.vue';
import { useCart } from '@/composables/useCart';
import { useToast } from '@/composables/useToast';
import { productState } from '@/lib/api';
import { productImage } from '@/lib/productImage';

const props = defineProps({
  product: { type: Object, required: true },
});

const { items, add } = useCart();
const { showToast } = useToast();
const variantIndex = ref(0);
const qty = ref(1);
const expanded = ref(false);
const imageFailed = ref(false);

const variant = computed(() => props.product.variants[variantIndex.value]);
const state = computed(() => productState(props.product));
const image = computed(() => productImage(props.product));
const description = computed(() => props.product.description || '');
const isLongDescription = computed(() => description.value.length > 64 || /\r?\n/.test(description.value.trim()));
const preview = computed(() => {
  const firstLine = description.value.trim().split(/\r?\n/, 1)[0];
  return `${[...firstLine].slice(0, 56).join('')}…`;
});

const remaining = computed(() => {
  const cartItem = items.value.find((item) => item.productId === props.product.id && item.unit === variant.value.unit);
  return Math.max(0, variant.value.stock - (cartItem?.qty || 0));
});

const normalizedQty = computed(() => {
  const amount = Math.max(1, Math.trunc(Number(qty.value) || 1));
  return props.product.allowPreorder ? amount : Math.min(amount, Math.max(1, remaining.value));
});
const isPreorder = computed(() => props.product.allowPreorder && normalizedQty.value > remaining.value);
const isSoldOut = computed(() => variant.value.stock === 0 && !props.product.allowPreorder);
const unavailable = computed(() => remaining.value === 0 && !props.product.allowPreorder);

const stockLabel = computed(() => {
  if (isSoldOut.value) return '此規格已售完';
  if (isPreorder.value) return props.product.preorderDate ? `預計 ${props.product.preorderDate} 到貨` : '預購到貨日待定';
  return `庫存 ${variant.value.stock}`;
});

const buttonLabel = computed(() => {
  if (isSoldOut.value) return '已售完';
  if (unavailable.value) return '已達庫存上限';
  return isPreorder.value ? '加入預購' : '加入購物車';
});

watch(image, () => { imageFailed.value = false; });

function changeQty(amount) {
  qty.value = normalizedQty.value + amount;
}

function addToCart() {
  if (unavailable.value) return;
  const amount = normalizedQty.value;
  const destination = isPreorder.value ? '預購' : '購物車';
  add(props.product.id, variant.value.unit, amount);
  qty.value = 1;
  showToast(`已將「${props.product.name}（${variant.value.unit}）」× ${amount} 加入${destination}`);
}
</script>
