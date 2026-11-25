<template>
  <div class="admin-shell">
    <header class="admin-topbar">
      <div class="admin-topbar-inner">
        <router-link class="admin-brand" to="/admin" aria-label="鮮果市集管理後台">
          <span class="admin-brand-mark" aria-hidden="true">鮮</span>
          鮮果市集<span class="admin-brand-divider" aria-hidden="true"></span><span class="admin-brand-label">管理後台</span>
        </router-link>
        <nav class="admin-topbar-actions" aria-label="管理員操作">
          <router-link to="/">回到商店 <span aria-hidden="true">↗</span></router-link>
          <button v-if="loggedIn" class="admin-logout" type="button" @click="logout">登出</button>
        </nav>
      </div>
    </header>

    <main v-if="!loggedIn" class="admin-auth">
      <div class="auth-panel">
        <form v-if="showLoginForm" @submit.prevent="login">
          <h1>後台登入</h1>
          <div class="form-group">
            <label for="admin-login-username">帳號</label>
            <input id="admin-login-username" v-model="loginUsername" autocomplete="username" required />
          </div>
          <div class="form-group">
            <label for="admin-login-password">密碼</label>
            <input id="admin-login-password" v-model="loginPassword" type="password" autocomplete="current-password" required />
          </div>
          <div v-if="loginError" class="form-error" role="alert">帳號或密碼錯誤</div>
          <button class="auth-submit" type="submit">登入</button>
          <button class="auth-link" type="button" @click="showLoginForm = false">忘記密碼？</button>
        </form>
        <form v-else @submit.prevent="resetPasswordSubmit">
          <h1>重設密碼</h1>
          <div class="form-group">
            <label for="admin-reset-username">帳號</label>
            <input id="admin-reset-username" v-model="resetUsername" autocomplete="username" required />
          </div>
          <div class="form-group">
            <label for="admin-reset-password">新密碼（至少 4 個字元）</label>
            <input id="admin-reset-password" v-model="resetPassword" type="password" autocomplete="new-password" minlength="4" required />
          </div>
          <div class="form-group">
            <label for="admin-reset-confirm">確認新密碼</label>
            <input id="admin-reset-confirm" v-model="resetPassword2" type="password" autocomplete="new-password" minlength="4" required />
          </div>
          <div v-if="resetError" class="form-error" role="alert">{{ resetError }}</div>
          <button class="auth-submit" type="submit">重設並回到登入</button>
          <button class="auth-link" type="button" @click="showLoginForm = true">回登入</button>
        </form>
      </div>
    </main>

    <main v-else class="admin-workspace">
      <nav class="admin-menu" aria-label="管理功能">
        <button
          v-for="item in menu"
          :key="item.id"
          type="button"
          :class="{ active: tab === item.id }"
          :aria-current="tab === item.id ? 'page' : undefined"
          @click="item.id === 'orders' ? switchToOrders() : tab = item.id"
        >
          {{ item.label }}
          <span v-if="item.id === 'orders' && hasNewOrder" class="admin-new-order">新</span>
        </button>
      </nav>

      <div class="admin-content">
        <div class="admin-page-heading">
          <h1>{{ menu.find((item) => item.id === tab)?.label }}</h1>
        </div>
        <AdminProducts
          v-show="tab === 'products'"
          :products="data.products"
          :categories="data.categories"
          @reload="loadData"
        />
        <AdminCategories
          v-show="tab === 'categories'"
          :products="data.products"
          :categories="data.categories"
          @reload="loadData"
        />
        <AdminOrders v-if="tab === 'orders'" :reload-key="ordersReloadKey" />
        <AdminSettings v-show="tab === 'settings'" :settings="data.settings" @reload="loadData" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { api } from '@/lib/api';
import { useToast } from '@/composables/useToast';
import AdminProducts from '@/components/admin/AdminProducts.vue';
import AdminCategories from '@/components/admin/AdminCategories.vue';
import AdminOrders from '@/components/admin/AdminOrders.vue';
import AdminSettings from '@/components/admin/AdminSettings.vue';

const { showToast } = useToast();

const menu = [
  { id: 'products', label: '商品管理' },
  { id: 'categories', label: '分類管理' },
  { id: 'orders', label: '訂單管理' },
  { id: 'settings', label: '運費與設定' },
];

const loggedIn = ref(false);
const showLoginForm = ref(true);
const loginUsername = ref('');
const loginPassword = ref('');
const loginError = ref(false);
const resetUsername = ref('');
const resetPassword = ref('');
const resetPassword2 = ref('');
const resetError = ref('');
const tab = ref('products');
const hasNewOrder = ref(false);
const ordersReloadKey = ref(0);
const data = reactive({ products: [], categories: [], settings: {} });

let knownLatestId = null;
let pollTimer;

async function loadData() {
  try {
    const result = await api('/api/admin/data');
    data.products = result.products;
    data.categories = result.categories;
    data.settings = result.settings;
    loggedIn.value = true;
  } catch (err) {
    if (err.status === 401) {
      loggedIn.value = false;
      return;
    }
    showToast(err.message || '載入失敗');
  }
}

async function login() {
  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: {
        username: loginUsername.value.trim(),
        password: loginPassword.value,
      },
    });
    loginError.value = false;
    loginPassword.value = '';
    await loadData();
  } catch {
    loginError.value = true;
  }
}

async function resetPasswordSubmit() {
  if (resetPassword.value !== resetPassword2.value) {
    resetError.value = '兩次輸入的密碼不一致';
    return;
  }
  try {
    await api('/api/admin/reset-password', {
      method: 'POST',
      body: {
        username: resetUsername.value.trim(),
        newPassword: resetPassword.value,
      },
    });
    resetError.value = '';
    resetUsername.value = '';
    resetPassword.value = '';
    resetPassword2.value = '';
    showLoginForm.value = true;
    showToast('密碼已重設，請用新密碼登入', 2200);
  } catch (err) {
    resetError.value = err.message || '重設失敗';
  }
}

async function logout() {
  await api('/api/admin/logout', { method: 'POST' });
  loggedIn.value = false;
  showLoginForm.value = true;
}

function switchToOrders() {
  tab.value = 'orders';
  hasNewOrder.value = false;
  ordersReloadKey.value += 1;
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* ignore */
  }
}

async function pollNewOrders() {
  try {
    const res = await fetch('/api/admin/orders/latest-id', { credentials: 'include' });
    if (!res.ok) return;
    const { latestId } = await res.json();
    if (knownLatestId !== null && latestId > knownLatestId) {
      showToast('🔔 有新訂單進來了！', 2200);
      beep();
      hasNewOrder.value = true;
      if (tab.value === 'orders') ordersReloadKey.value += 1;
    }
    knownLatestId = latestId;
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  loadData();
  pollNewOrders();
  pollTimer = setInterval(pollNewOrders, 15000);
});

onUnmounted(() => {
  clearInterval(pollTimer);
});
</script>


<style scoped>
.admin-shell {
  --admin-ink: #254737;
  --admin-muted: #646d60;
  --admin-rule: #e8e6db;
  --admin-tint: #ecf2e8;
  --admin-bg: #f7f6ef;
  min-height: 100dvh;
  background: var(--admin-bg);
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: block;
  padding: 0;
  background: var(--admin-ink);
  color: white;
  box-shadow: none;
}

.admin-topbar-inner {
  min-height: 69px;
  width: min(100% - 48px, 1410px);
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.admin-brand, .admin-topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-brand { white-space: nowrap; font-size: 17px; font-weight: 800; }
.admin-brand-mark {
  display: grid;
  place-items: center;
  border-radius: 50%;
  width: 34px;
  height: 34px;
  background: #e4eecf;
  color: var(--admin-ink);
  font-size: 17px;
}
.admin-brand-divider { height: 17px; width: 1px; background: #ffffff44; }
.admin-brand-label { color: #dce8de; font-size: 13px; font-weight: 500; }
.admin-topbar-actions { gap: 6px; white-space: nowrap; }
.admin-topbar-actions a, .admin-logout {
  padding: 7px 10px;
  border-radius: 8px;
  color: #f6f8f1;
  font-size: 13px;
  font-weight: 600;
}
.admin-logout { border: 1px solid #ffffff55; background: transparent; }
.admin-topbar-actions a:hover, .admin-logout:hover { background: #ffffff1a; }

.admin-auth {
  margin: 0 auto;
  width: min(100%, 486px);
  padding: clamp(42px, 10vh, 120px) 22px 48px;
}
.auth-panel {
  padding: clamp(24px, 5vw, 38px);
  border: 1px solid var(--admin-rule);
  border-radius: 19px;
  background: #fff;
  box-shadow: 0 14px 38px #25473711;
}
.auth-panel h1 { margin-bottom: 24px; color: var(--admin-ink); font-size: 28px; }
.auth-panel .form-group { margin-bottom: 17px; }
.auth-panel .form-error { margin: 0 0 10px; }
.auth-submit { margin-top: 8px; width: 100%; min-height: 44px; }
.auth-link {
  display: block;
  margin: 14px 0 0 auto;
  padding: 5px 0;
  background: transparent;
  color: var(--admin-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
  font-size: 13px;
}

.admin-workspace {
  width: min(100%, 1458px);
  max-width: none;
  margin: 0 auto;
  padding: 34px 24px 56px;
  display: grid;
  grid-template-columns: 182px minmax(0, 1fr);
  align-items: start;
  gap: 29px;
}

.admin-menu {
  position: sticky;
  top: 103px;
  display: grid;
  gap: 3px;
  padding: 8px;
  border: 1px solid var(--admin-rule);
  border-radius: 13px;
  background: #fff;
}
.admin-menu button {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: space-between;
  text-align: left;
  white-space: nowrap;
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--admin-muted);
  background: transparent;
}
.admin-menu button:hover, .admin-menu button.active { background: var(--admin-tint); color: var(--admin-ink); }
.admin-menu button.active { font-weight: 800; }
.admin-new-order { color: #7a4617; background: #fde6b9; border-radius: 999px; padding: 1px 7px; font-size: 11px; }
.admin-content { min-width: 0; }
.admin-page-heading { margin-bottom: 19px; }
.admin-page-heading h1 { color: var(--admin-ink); font-size: clamp(25px, 3vw, 33px); line-height: 1.25; }

.admin-content :deep(.panel) {
  border: 1px solid var(--admin-rule);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 3px 10px #25473708;
}
.admin-content :deep(.panel:not(.table-panel)) { padding: clamp(16px, 3vw, 25px); }
.admin-content :deep(h2) { color: var(--admin-ink); }
.admin-content :deep(table th) { background: #f2f5ed; color: var(--admin-ink); }
.admin-content :deep(table td) { border-color: var(--admin-rule); }
.admin-content :deep(table tbody tr:hover) { background: #fafbf7; }
.admin-shell :deep(textarea) { display: block; resize: vertical; min-height: 108px; line-height: 1.65; }
.admin-shell :deep(.admin-multiline) { white-space: pre-wrap; overflow-wrap: anywhere; }
.admin-shell :deep(.admin-help) { margin-top: 5px; font-size: 12px; color: var(--admin-muted); }
.admin-shell :deep(.admin-actions) { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
.admin-content :deep(.records-heading) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--admin-rule);
}
.admin-content :deep(.records-heading h2) { margin: 0; }
.admin-content :deep(.records-count) { color: var(--admin-muted); font-size: 13px; }

@media (max-width: 850px) {
  .admin-workspace { grid-template-columns: minmax(0, 1fr); padding-top: 20px; gap: 21px; }
  .admin-menu { position: static; display: flex; flex-wrap: wrap; }
}
@media (max-width: 540px) {
  .admin-topbar-inner { min-height: 58px; width: calc(100% - 28px); gap: 7px; }
  .admin-brand { gap: 7px; font-size: 14px; }
  .admin-brand-mark { width: 28px; height: 28px; font-size: 14px; }
  .admin-brand-divider { display: none; }
  .admin-brand-label { font-size: 11px; }
  .admin-topbar-actions { gap: 2px; }
  .admin-topbar-actions a, .admin-logout { padding: 5px 6px; font-size: 12px; }
  .admin-workspace { padding-inline: 14px; }
  .admin-menu { padding: 5px; }
  .admin-menu button { flex: 1 0 auto; justify-content: center; padding: 8px 6px; font-size: 12px; }
}
</style>
