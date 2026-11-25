<template>
  <div role="status" class="toast" :class="{ show: toast.visible }">{{ toast.message }}</div>
</template>

<script setup>
import { useToast } from '@/composables/useToast';

const { toast } = useToast();
</script>
