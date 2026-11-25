<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'leaf'">
      <path d="M20.7 3.6c-4.6 0-9 .7-11.9 3.6a6 6 0 0 0 8.5 8.5c2.9-2.9 3.4-7.5 3.4-12.1Z" />
      <path d="M4 20c2.8-3.6 6.3-6.9 10.6-10" />
    </template>
    <template v-else-if="name === 'bag'">
      <path d="M5 8h14l1.3 12H3.7L5 8Z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </template>
    <template v-else-if="name === 'truck'">
      <path d="M2 5h13v12H6m9-9h4l3 4v5h-3m-4 0h-4m-7 0H2V9m13 4h7" />
      <circle cx="8.5" cy="17.5" r="2" />
      <circle cx="17" cy="17.5" r="2" />
    </template>
    <template v-else-if="name === 'store'">
      <path d="M4 10v10h16V10M2 10l2-5h16l2 5M2 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M10 20v-5h4v5" />
    </template>
    <template v-else-if="name === 'receipt'">
      <path d="M5 3h14v18l-3.5-2-3.5 2-3.5-2L5 21V3Zm4 5h6m-6 4h6m-6 4h3" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4.5 4.5" />
    </template>
    <path v-else-if="name === 'arrow-right'" d="M4 12h15m-6-6 6 6-6 6" />
    <path v-else-if="name === 'chevron-down'" d="m6 9 6 6 6-6" />
    <path v-else-if="name === 'minus'" d="M5 12h14" />
    <path v-else-if="name === 'plus'" d="M5 12h14m-7-7v14" />
    <path v-else-if="name === 'close'" d="m6 6 12 12M18 6 6 18" />
  </svg>
</template>

<script setup>
defineProps({ name: { type: String, required: true } });
</script>
