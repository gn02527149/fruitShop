import { createRouter, createWebHistory } from 'vue-router';
import ShopView from './views/ShopView.vue';
import CartView from './views/CartView.vue';
import AdminView from './views/AdminView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: ShopView, meta: { title: '鮮果市集 — 產地直送好水果' } },
    { path: '/cart', component: CartView, meta: { title: '購物車 — 鮮果市集' } },
    { path: '/admin', component: AdminView, meta: { title: '後台管理 — 鮮果市集' } },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.afterEach((to) => {
  document.title = to.meta.title || '鮮果市集';
});

export default router;
