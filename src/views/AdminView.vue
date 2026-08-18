<template>
  <header class="admin">
    <router-link class="logo" to="/admin">⚙️ 鮮果市集後台</router-link>
    <nav>
      <router-link to="/">回前台</router-link>
      <button class="link" @click="logout">登出</button>
    </nav>
  </header>

  <div v-if="!loggedIn" class="login-overlay">
    <div class="panel" style="width:340px; margin:0">
      <div v-if="showLoginForm">
        <h2>🔐 後台登入</h2>
        <div class="form-group">
          <label>帳號</label>
          <input v-model="loginUsername" autocomplete="username" @keydown.enter="login" />
        </div>
        <div class="form-group">
          <label>密碼</label>
          <input
            v-model="loginPassword"
            type="password"
            autocomplete="current-password"
            @keydown.enter="login"
          />
        </div>
        <button style="width:100%" @click="login">登入</button>
        <div v-if="loginError" class="form-error">帳號或密碼錯誤</div>
        <div style="text-align:right; margin-top:10px">
          <button class="muted-link" @click="showLoginForm = false">忘記密碼？</button>
        </div>
      </div>
      <div v-else>
        <h2>🔑 重設密碼</h2>
        <div class="form-group">
          <label>帳號</label>
          <input v-model="resetUsername" />
        </div>
        <div class="form-group">
          <label>新密碼（至少 4 個字元）</label>
          <input v-model="resetPassword" type="password" />
        </div>
        <div class="form-group">
          <label>確認新密碼</label>
          <input v-model="resetPassword2" type="password" @keydown.enter="resetPasswordSubmit" />
        </div>
        <button style="width:100%" @click="resetPasswordSubmit">重設並回到登入</button>
        <div v-if="resetError" class="form-error">{{ resetError }}</div>
        <div style="text-align:right; margin-top:10px">
          <button class="muted-link" @click="showLoginForm = true">回登入</button>
        </div>
      </div>
    </div>
  </div>

  <main v-if="loggedIn">
    <div class="tabs">
      <button :class="{ active: tab === 'products' }" @click="tab = 'products'">商品管理</button>
      <button :class="{ active: tab === 'categories' }" @click="tab = 'categories'">分類管理</button>
      <button :class="{ active: tab === 'orders' }" @click="switchToOrders">
        訂單管理
        <span v-if="hasNewOrder" class="dot">新</span>
      </button>
      <button :class="{ active: tab === 'settings' }" @click="tab = 'settings'">運費與設定</button>
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
    <AdminOrders
      v-if="tab === 'orders'"
      :reload-key="ordersReloadKey"
    />
    <AdminSettings
      v-show="tab === 'settings'"
      :settings="data.settings"
      @reload="loadData"
    />
  </main>
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
