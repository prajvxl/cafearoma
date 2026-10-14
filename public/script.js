/**
 * Cafe Aroma REST API — Multi-Dashboard System (Admin & User Portals)
 * Full Authentication Flow with Access Control & Protected Pages
 * College Mini Project (Practical 8)
 */

const BASE = '/api';

// ============================================================================
// APPLICATION STATE
// ============================================================================

const state = {
  // Authentication: null by default! No protected pages visible before login.
  currentUser: null,
  activeDashboard: null, // 'admin' | 'user'
  activeTab: null,

  // API Data
  cafe: null,
  locations: [],
  menu: [],
  orders: [],
  reviews: [],
  customers: [],

  // Shopping Cart (User Portal)
  cart: [],

  // Search & Filters
  adminMenuFilterCat: 'All',
  adminMenuSearchTerm: '',
  adminOrderFilterStatus: 'All',
  adminOrderSearchTerm: '',
  customerSearchTerm: '',
  userMenuFilterCat: 'All',
  userMenuSearchTerm: '',

  // Analytics
  chartView: 'category',
  chartInstance: null,

  // Logger
  logs: [],
};

// ============================================================================
// API UTILITIES & LOGGER
// ============================================================================

function logCall(method, url, status) {
  const logItem = {
    id: Date.now() + Math.random(),
    time: new Date().toLocaleTimeString(),
    method,
    url,
    status,
  };
  state.logs.unshift(logItem);
  renderApiLog();
}

async function apiCall(method, url, body) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    logCall(method, url, res.status);

    let data = null;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    }

    if (!res.ok) {
      const errMsg = (data && (data.error || data.message)) || `HTTP Error ${res.status}`;
      throw new Error(errMsg);
    }
    return data;
  } catch (err) {
    console.error(`API Call failed: ${method} ${url}`, err);
    throw err;
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================================
// DATA FETCHERS
// ============================================================================

async function fetchAllData() {
  try {
    const [cafe, locations, menu, orders, reviews] = await Promise.all([
      apiCall('GET', `${BASE}/cafe`),
      apiCall('GET', `${BASE}/locations`),
      apiCall('GET', `${BASE}/menu`),
      apiCall('GET', `${BASE}/orders`),
      apiCall('GET', `${BASE}/reviews`),
    ]);

    state.cafe = cafe;
    state.locations = locations || [];
    state.menu = menu || [];
    state.orders = orders || [];
    state.reviews = reviews || [];

    renderCafeProfile();
    populateFormDropdowns();

    // If user is admin, also fetch customers
    if (state.currentUser && state.currentUser.role === 'admin') {
      refreshCustomers();
    }
  } catch (err) {
    console.error('Initial data fetch error:', err);
  }
}

async function refreshCustomers() {
  try {
    state.customers = await apiCall('GET', `${BASE}/auth/users`);
    renderCustomersTable();
  } catch (e) {
    console.error('Failed to load customers', e);
  }
}

// ============================================================================
// AUTHENTICATION FLOW & ACCESS CONTROL
// ============================================================================

function showAuthScreen() {
  document.getElementById('appLayout').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  state.currentUser = null;
  state.activeDashboard = null;
  state.activeTab = null;
  state.cart = [];

  // Reset forms
  document.getElementById('portalLoginForm')?.reset();
  document.getElementById('portalRegisterForm')?.reset();
  const alertEl = document.getElementById('authAlertMessage');
  if (alertEl) alertEl.style.display = 'none';

  setAuthTab('login');
}

function showDashboard(user) {
  state.currentUser = user;
  state.activeDashboard = user.role;

  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appLayout').style.display = 'flex';

  // Update User Identity Elements
  const isAdm = user.role === 'admin';
  const sidebarUserName = document.getElementById('sidebarUserName');
  const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
  const sidebarUserRolePill = document.getElementById('sidebarUserRolePill');
  const sidebarRoleBadge = document.getElementById('sidebarRoleBadge');
  const activeDashboardBadge = document.getElementById('activeDashboardBadge');

  const navUserName = document.getElementById('navUserName');
  const navUserAvatar = document.getElementById('navUserAvatar');
  const adminNavbarActions = document.getElementById('adminNavbarActions');
  const btnNavbarCart = document.getElementById('btnNavbarCart');
  const btnAdminAddOutlet = document.getElementById('btnAdminAddOutlet');

  if (sidebarUserName) sidebarUserName.textContent = user.name;
  if (sidebarUserAvatar) sidebarUserAvatar.textContent = isAdm ? '🛡️' : '☕';
  if (sidebarUserRolePill) sidebarUserRolePill.textContent = isAdm ? 'Administrator' : 'Customer Account';
  if (sidebarRoleBadge) sidebarRoleBadge.textContent = isAdm ? 'Admin Portal' : 'Customer Portal';
  if (activeDashboardBadge) activeDashboardBadge.textContent = isAdm ? 'Admin Dashboard' : 'Customer Portal';

  if (navUserName) navUserName.textContent = user.name;
  if (navUserAvatar) navUserAvatar.textContent = isAdm ? '🛡️' : '☕';

  if (adminNavbarActions) adminNavbarActions.style.display = isAdm ? 'flex' : 'none';
  if (btnNavbarCart) btnNavbarCart.style.display = isAdm ? 'none' : 'inline-flex';
  if (btnAdminAddOutlet) btnAdminAddOutlet.style.display = isAdm ? 'inline-flex' : 'none';

  const userGreetingChip = document.getElementById('userGreetingChip');
  if (userGreetingChip) userGreetingChip.textContent = `Welcome, ${user.name}!`;

  // Render navigation & switch to entry tab
  renderSidebarNav();

  if (isAdm) {
    refreshCustomers();
    renderAdminStats();
    renderRecentOrders();
    renderAdminOrdersTable();
    renderAdminMenuGrid();
    switchTab('admin-dashboard');
  } else {
    renderUserMenuGrid();
    renderUserOrders();
    updateCartBadge();
    switchTab('user-menu');
  }

  renderLocationsGrid();
  renderReviewsGrid();
}

function logout() {
  localStorage.removeItem('cafe_aroma_user');
  showAuthScreen();
  showToast('You have been signed out successfully.');
}

// 1-Click Evaluation Sign In (Viva / Project Evaluation)
async function triggerDemoLogin(role) {
  const creds =
    role === 'admin'
      ? { email: 'admin@cafearoma.com', password: 'admin' }
      : { email: 'rahul@gmail.com', password: 'user' };

  const alertEl = document.getElementById('authAlertMessage');
  if (alertEl) alertEl.style.display = 'none';

  try {
    const res = await apiCall('POST', `${BASE}/auth/login`, creds);
    localStorage.setItem('cafe_aroma_user', JSON.stringify(res.user));
    showDashboard(res.user);
    showToast(`Signed in as ${res.user.name} (${res.user.role})`);
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = 'Demo login failed: ' + err.message;
      alertEl.style.display = 'block';
    }
  }
}

function setAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('btnTabLogin')?.classList.toggle('active', isLogin);
  document.getElementById('btnTabRegister')?.classList.toggle('active', !isLogin);
  document.getElementById('portalLoginForm')?.classList.toggle('active', isLogin);
  document.getElementById('portalRegisterForm')?.classList.toggle('active', !isLogin);

  const alertEl = document.getElementById('authAlertMessage');
  if (alertEl) alertEl.style.display = 'none';
}

// Login Form Submit Handler
document.getElementById('portalLoginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('portalLoginEmail').value.trim();
  const password = document.getElementById('portalLoginPassword').value;
  const alertEl = document.getElementById('authAlertMessage');

  try {
    const res = await apiCall('POST', `${BASE}/auth/login`, { email, password });
    localStorage.setItem('cafe_aroma_user', JSON.stringify(res.user));
    showDashboard(res.user);
    showToast(`Welcome, ${res.user.name}!`);
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message;
      alertEl.style.display = 'block';
    }
  }
});

// Register Form Submit Handler
document.getElementById('portalRegisterForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('portalRegName').value.trim();
  const email = document.getElementById('portalRegEmail').value.trim();
  const phone = document.getElementById('portalRegPhone').value.trim();
  const password = document.getElementById('portalRegPassword').value;
  const alertEl = document.getElementById('authAlertMessage');

  try {
    const res = await apiCall('POST', `${BASE}/auth/register`, { name, email, phone, password });
    localStorage.setItem('cafe_aroma_user', JSON.stringify(res.user));
    showDashboard(res.user);
    showToast(`Account created! Welcome, ${res.user.name}`);
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message;
      alertEl.style.display = 'block';
    }
  }
});

// ============================================================================
// ACCESS CONTROL & TAB NAVIGATION
// ============================================================================

function switchTab(tabId) {
  // Guard 1: Require authentication for all views
  if (!state.currentUser) {
    showAuthScreen();
    return;
  }

  // Guard 2: Prevent regular customers from opening admin-only views
  const isCustomer = state.currentUser.role === 'user';
  const isAdminOnlyTab = tabId.startsWith('admin-') || tabId === 'apilog';

  if (isCustomer && isAdminOnlyTab) {
    showToast('Access Denied: Administrator privileges required', 'error');
    switchTab('user-menu');
    return;
  }

  state.activeTab = tabId;

  // Update active sidebar nav button
  document.querySelectorAll('#sidebarNav .nav-item').forEach((btn) => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Switch visible section
  document.querySelectorAll('.tab-view').forEach((view) => {
    view.classList.remove('active');
  });

  const target = document.getElementById(`view-${tabId}`);
  if (target) target.classList.add('active');

  // Update header titles
  const headerTitle = document.getElementById('pageHeaderTitle');
  const titles = {
    'admin-dashboard': 'Admin Dashboard Overview',
    'admin-menu': 'Menu Management (Admin)',
    'admin-orders': 'Order Dispatch Management',
    'admin-customers': 'Customer Directory & Analytics',
    'user-menu': 'Browse Cafe Menu',
    'user-orders': 'My Orders & Live Pickup Tracking',
    locations: 'Pickup Outlets & Locations',
    reviews: 'Customer Reviews & Feedback',
    apilog: 'REST API Requisition Log',
  };

  if (headerTitle && titles[tabId]) {
    headerTitle.textContent = titles[tabId];
  }

  // Close mobile sidebar if open
  if (window.innerWidth <= 992) {
    document.getElementById('sidebar')?.classList.remove('open');
  }

  // Render chart if entering dashboard
  if (tabId === 'admin-dashboard') {
    setTimeout(renderChart, 100);
  }
}

function renderSidebarNav() {
  const nav = document.getElementById('sidebarNav');
  if (!nav || !state.currentUser) return;

  const isAdm = state.currentUser.role === 'admin';

  if (isAdm) {
    nav.innerHTML = `
      <button class="nav-item ${state.activeTab === 'admin-dashboard' ? 'active' : ''}" data-tab="admin-dashboard">
        <span class="nav-icon">📊</span>
        <span class="nav-text">Overview</span>
      </button>
      <button class="nav-item ${state.activeTab === 'admin-menu' ? 'active' : ''}" data-tab="admin-menu">
        <span class="nav-icon">☕</span>
        <span class="nav-text">Menu Items</span>
        <span class="nav-count">${state.menu.length}</span>
      </button>
      <button class="nav-item ${state.activeTab === 'admin-orders' ? 'active' : ''}" data-tab="admin-orders">
        <span class="nav-icon">📋</span>
        <span class="nav-text">All Orders</span>
        <span class="nav-count">${state.orders.length}</span>
      </button>
      <button class="nav-item ${state.activeTab === 'admin-customers' ? 'active' : ''}" data-tab="admin-customers">
        <span class="nav-icon">👥</span>
        <span class="nav-text">Customers</span>
        <span class="nav-count">${state.customers.length}</span>
      </button>
      <button class="nav-item ${state.activeTab === 'locations' ? 'active' : ''}" data-tab="locations">
        <span class="nav-icon">📍</span>
        <span class="nav-text">Locations</span>
      </button>
      <button class="nav-item ${state.activeTab === 'reviews' ? 'active' : ''}" data-tab="reviews">
        <span class="nav-icon">💬</span>
        <span class="nav-text">Reviews</span>
      </button>
      <button class="nav-item ${state.activeTab === 'apilog' ? 'active' : ''}" data-tab="apilog">
        <span class="nav-icon">⚡</span>
        <span class="nav-text">API Live Log</span>
        <span class="nav-count log-pill">${state.logs.length}</span>
      </button>
    `;
  } else {
    // Customer navigation
    const userOrdersCount = state.orders.filter(
      (o) =>
        o.userId === state.currentUser.id ||
        (o.userEmail && o.userEmail.toLowerCase() === state.currentUser.email.toLowerCase()) ||
        (o.customerName && o.customerName.toLowerCase() === state.currentUser.name.toLowerCase())
    ).length;

    nav.innerHTML = `
      <button class="nav-item ${state.activeTab === 'user-menu' ? 'active' : ''}" data-tab="user-menu">
        <span class="nav-icon">☕</span>
        <span class="nav-text">Explore Menu</span>
        <span class="nav-count">${state.menu.length}</span>
      </button>
      <button class="nav-item" onclick="openCartDrawer()">
        <span class="nav-icon">🛒</span>
        <span class="nav-text">My Cart</span>
        <span class="nav-count" id="sidebarCartCount">${state.cart.reduce((a, c) => a + c.quantity, 0)}</span>
      </button>
      <button class="nav-item ${state.activeTab === 'user-orders' ? 'active' : ''}" data-tab="user-orders">
        <span class="nav-icon">📦</span>
        <span class="nav-text">My Orders</span>
        <span class="nav-count">${userOrdersCount}</span>
      </button>
      <button class="nav-item ${state.activeTab === 'locations' ? 'active' : ''}" data-tab="locations">
        <span class="nav-icon">📍</span>
        <span class="nav-text">Pickup Outlets</span>
      </button>
      <button class="nav-item ${state.activeTab === 'reviews' ? 'active' : ''}" data-tab="reviews">
        <span class="nav-icon">⭐</span>
        <span class="nav-text">Reviews</span>
      </button>
    `;
  }

  nav.querySelectorAll('.nav-item[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });
}

// ============================================================================
// CAFE PROFILE & LOCATIONS
// ============================================================================

function renderCafeProfile() {
  if (!state.cafe) return;
  const { name, statement, rating, location } = state.cafe;

  const brandCafeName = document.getElementById('brandCafeName');
  const heroCafeName = document.getElementById('heroCafeName');
  const heroCafeStatement = document.getElementById('heroCafeStatement');
  const heroRating = document.getElementById('heroRating');
  const heroLocation = document.getElementById('heroLocation');
  const navbarLocationName = document.getElementById('navbarLocationName');

  if (brandCafeName) brandCafeName.textContent = name;
  if (heroCafeName) heroCafeName.textContent = `Welcome to ${name}`;
  if (heroCafeStatement) heroCafeStatement.textContent = statement;
  if (heroRating) heroRating.textContent = Number(rating).toFixed(1);
  if (heroLocation) heroLocation.textContent = location;
  if (navbarLocationName) navbarLocationName.textContent = `${location} (${state.locations.length} Outlets)`;
}

function getLocationName(locId) {
  const loc = state.locations.find((l) => l.id === Number(locId));
  return loc ? loc.name.replace('Cafe Aroma - ', '') : 'Main Branch';
}

// ============================================================================
// ADMIN DASHBOARD FEATURES
// ============================================================================

function renderAdminStats() {
  const totalOrders = state.orders.length;
  const pendingOrders = state.orders.filter((o) => (o.status || '').toLowerCase() === 'pending').length;
  const completedOrders = state.orders.filter((o) => (o.status || '').toLowerCase() === 'completed').length;
  const totalRevenue = state.orders.reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
  const totalMenuItems = state.menu.length;
  const categories = new Set(state.menu.map((m) => m.category)).size;
  const totalCustomers = state.customers.length;

  const statTotalOrders = document.getElementById('statTotalOrders');
  const statPendingOrders = document.getElementById('statPendingOrders');
  const statTotalRevenue = document.getElementById('statTotalRevenue');
  const statCompletedOrders = document.getElementById('statCompletedOrders');
  const statMenuItems = document.getElementById('statMenuItems');
  const statCategoriesCount = document.getElementById('statCategoriesCount');
  const statTotalCustomers = document.getElementById('statTotalCustomers');

  if (statTotalOrders) statTotalOrders.textContent = totalOrders;
  if (statPendingOrders) statPendingOrders.textContent = `${pendingOrders} Pending`;
  if (statTotalRevenue) statTotalRevenue.textContent = `₹${totalRevenue.toLocaleString()}`;
  if (statCompletedOrders) statCompletedOrders.textContent = `${completedOrders} Completed`;
  if (statMenuItems) statMenuItems.textContent = totalMenuItems;
  if (statCategoriesCount) statCategoriesCount.textContent = `${categories} Categories`;
  if (statTotalCustomers) statTotalCustomers.textContent = totalCustomers;
}

function renderRecentOrders() {
  const tbody = document.getElementById('recentOrdersTableBody');
  if (!tbody) return;

  if (state.orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No orders placed yet.</td></tr>`;
    return;
  }

  const recent = [...state.orders].reverse().slice(0, 5);

  tbody.innerHTML = recent
    .map((o) => {
      const statusClass = `badge-${(o.status || 'pending').toLowerCase()}`;
      const isPending = (o.status || 'pending').toLowerCase() === 'pending';
      const isRejected = (o.status || '').toLowerCase() === 'cancelled';
      const isOnline = (o.paymentMethod || '').toLowerCase() === 'online';

      const decisionCell = isPending
        ? `<div class="decision-btns-inline">
            <button class="btn-decision-accept" onclick="adminAcceptOrder(${o.id})" title="Accept order">✓ Accept</button>
            <button class="btn-decision-reject" onclick="adminRejectOrder(${o.id})" title="Reject order">✕ Reject</button>
           </div>`
        : isRejected
        ? `<span class="decision-badge badge-rejected">✕ Rejected</span>`
        : `<span class="decision-badge badge-accepted">✓ Accepted</span>`;

      return `
      <tr>
        <td><span class="order-id">#${o.id}</span></td>
        <td class="customer-cell">
          <strong>${escapeHtml(o.customerName)}</strong>
          <div class="table-subtext">📞 ${escapeHtml(o.phone || '+91 98201 22222')}</div>
        </td>
        <td><strong>${escapeHtml(o.item)}</strong></td>
        <td>
          <div title="${escapeHtml(o.deliveryAddress || '')}">
            <span>📍 ${escapeHtml(getLocationName(o.locationId))}</span>
            <div class="table-subtext">${escapeHtml(o.orderType || 'Pickup')}: ${escapeHtml((o.deliveryAddress || '').slice(0, 22))}${o.deliveryAddress && o.deliveryAddress.length > 22 ? '...' : ''}</div>
          </div>
        </td>
        <td class="amount-cell">
          <strong>₹${Number(o.amount || 0).toLocaleString()}</strong>
          <div class="table-subtext">
            <span class="pay-chip ${isOnline ? 'pay-chip-online' : 'pay-chip-cod'}">${escapeHtml(o.paymentMethod || 'COD')}</span>
            <small>(${escapeHtml(o.paymentStatus || 'Pending')})</small>
          </div>
        </td>
        <td>${escapeHtml(o.time || '-')}</td>
        <td><span class="badge-status ${statusClass}">${escapeHtml(o.status || 'Pending')}</span></td>
        <td>${decisionCell}</td>
        <td>
          <select class="status-select" onchange="adminUpdateOrderStatus(${o.id}, this.value)">
            <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
            <option value="Ready" ${o.status === 'Ready' ? 'selected' : ''}>Ready</option>
            <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `;
    })
    .join('');
}

function renderAdminOrdersTable() {
  const tbody = document.getElementById('adminOrdersTableBody');
  if (!tbody) return;

  let items = [...state.orders];

  if (state.adminOrderFilterStatus && state.adminOrderFilterStatus !== 'All') {
    items = items.filter((o) => (o.status || 'Pending').toLowerCase() === state.adminOrderFilterStatus.toLowerCase());
  }

  if (state.adminOrderSearchTerm) {
    const q = state.adminOrderSearchTerm.toLowerCase();
    items = items.filter(
      (o) =>
        o.customerName.toLowerCase().includes(q) ||
        (o.phone && o.phone.toLowerCase().includes(q)) ||
        (o.item && o.item.toLowerCase().includes(q)) ||
        (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q)) ||
        String(o.id).includes(q)
    );
  }

  const countAll = state.orders.length;
  const countPending = state.orders.filter((o) => (o.status || '').toLowerCase() === 'pending').length;
  const countPreparing = state.orders.filter((o) => (o.status || '').toLowerCase() === 'preparing').length;
  const countReady = state.orders.filter((o) => (o.status || '').toLowerCase() === 'ready').length;
  const countCompleted = state.orders.filter((o) => (o.status || '').toLowerCase() === 'completed').length;

  document.getElementById('countAdminFilterAll').textContent = countAll;
  document.getElementById('countAdminFilterPending').textContent = countPending;
  document.getElementById('countAdminFilterPreparing').textContent = countPreparing;
  document.getElementById('countAdminFilterReady').textContent = countReady;
  document.getElementById('countAdminFilterCompleted').textContent = countCompleted;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No orders match filter criteria.</td></tr>`;
    return;
  }

  const sorted = [...items].reverse();

  tbody.innerHTML = sorted
    .map((o) => {
      const statusClass = `badge-${(o.status || 'pending').toLowerCase()}`;
      const isPending = (o.status || 'pending').toLowerCase() === 'pending';
      const isRejected = (o.status || '').toLowerCase() === 'cancelled';
      const isOnline = (o.paymentMethod || '').toLowerCase() === 'online';

      const decisionCell = isPending
        ? `<div class="decision-btns-inline">
            <button class="btn-decision-accept" onclick="adminAcceptOrder(${o.id})" title="Accept & Start Preparing">✓ Accept</button>
            <button class="btn-decision-reject" onclick="adminRejectOrder(${o.id})" title="Reject & Cancel">✕ Reject</button>
           </div>`
        : isRejected
        ? `<span class="decision-badge badge-rejected">✕ Rejected</span>`
        : `<span class="decision-badge badge-accepted">✓ Accepted</span>`;

      return `
      <tr>
        <td><span class="order-id">#${o.id}</span></td>
        <td class="customer-cell">
          <strong>${escapeHtml(o.customerName)}</strong>
          <div class="table-subtext">📞 ${escapeHtml(o.phone || '+91 98201 22222')}</div>
        </td>
        <td>
          <strong>${escapeHtml(o.item)}</strong>
          ${o.locationNote ? `<div class="table-subtext"><em>Note: ${escapeHtml(o.locationNote)}</em></div>` : ''}
        </td>
        <td>
          <div title="${escapeHtml(o.deliveryAddress || '')}">
            <span>📍 ${escapeHtml(getLocationName(o.locationId))}</span>
            <div class="table-subtext">${escapeHtml(o.orderType || 'Pickup')}: ${escapeHtml((o.deliveryAddress || '').slice(0, 24))}${o.deliveryAddress && o.deliveryAddress.length > 24 ? '...' : ''}</div>
          </div>
        </td>
        <td class="amount-cell">
          <strong>₹${Number(o.amount || 0).toLocaleString()}</strong>
          <div class="table-subtext">
            <span class="pay-chip ${isOnline ? 'pay-chip-online' : 'pay-chip-cod'}">${escapeHtml(o.paymentMethod || 'COD')}</span>
            <small>(${escapeHtml(o.paymentStatus || 'Pending')})</small>
          </div>
        </td>
        <td>${escapeHtml(o.time || '-')}</td>
        <td><span class="badge-status ${statusClass}">${escapeHtml(o.status || 'Pending')}</span></td>
        <td>${decisionCell}</td>
        <td>
          <div class="table-action-group">
            <select class="status-select" onchange="adminUpdateOrderStatus(${o.id}, this.value)">
              <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
              <option value="Ready" ${o.status === 'Ready' ? 'selected' : ''}>Ready</option>
              <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
              <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <button class="btn-table-del" onclick="adminDeleteOrder(${o.id})" title="Delete order record">✕</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join('');
}

async function adminAcceptOrder(id) {
  try {
    const updated = await apiCall('PUT', `${BASE}/orders/${id}`, { status: 'Preparing' });
    const order = state.orders.find((o) => o.id === id);
    if (order) order.status = 'Preparing';

    renderAdminOrdersTable();
    renderRecentOrders();
    renderAdminStats();
    renderChart();
    showToast(`Order #${id} accepted! Status moved to Preparing.`);
  } catch (err) {
    showToast('Failed to accept order: ' + err.message, 'error');
  }
}

async function adminRejectOrder(id) {
  if (!confirm(`Are you sure you want to reject Order #${id}?`)) return;

  try {
    const updated = await apiCall('PUT', `${BASE}/orders/${id}`, { status: 'Cancelled' });
    const order = state.orders.find((o) => o.id === id);
    if (order) order.status = 'Cancelled';

    renderAdminOrdersTable();
    renderRecentOrders();
    renderAdminStats();
    renderChart();
    showToast(`Order #${id} rejected and marked as Cancelled.`, 'error');
  } catch (err) {
    showToast('Failed to reject order: ' + err.message, 'error');
  }
}

async function adminUpdateOrderStatus(id, newStatus) {
  try {
    const updated = await apiCall('PUT', `${BASE}/orders/${id}`, { status: newStatus });
    const order = state.orders.find((o) => o.id === id);
    if (order) order.status = newStatus;

    renderAdminOrdersTable();
    renderRecentOrders();
    renderAdminStats();
    renderChart();
    showToast(`Order #${id} status updated to "${newStatus}"`);
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

async function adminDeleteOrder(id) {
  if (!confirm(`Are you sure you want to delete Order #${id}?`)) return;

  try {
    await apiCall('DELETE', `${BASE}/orders/${id}`);
    state.orders = state.orders.filter((o) => o.id !== id);
    renderAdminOrdersTable();
    renderRecentOrders();
    renderAdminStats();
    renderChart();
    renderSidebarNav();
    showToast(`Order #${id} deleted`);
  } catch (err) {
    showToast('Failed to delete order: ' + err.message, 'error');
  }
}

document.querySelectorAll('#adminOrderStatusFilters .pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#adminOrderStatusFilters .pill').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    state.adminOrderFilterStatus = btn.getAttribute('data-status');
    renderAdminOrdersTable();
  });
});

document.getElementById('adminOrderSearchInput')?.addEventListener('input', (e) => {
  state.adminOrderSearchTerm = e.target.value.trim();
  renderAdminOrdersTable();
});

// Admin Chart Rendering
function renderChart() {
  const canvas = document.getElementById('salesChart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  let labels = [];
  let dataPoints = [];
  let chartColors = ['#C88A58', '#46281B', '#D97706', '#8C6A56', '#573727'];

  if (state.chartView === 'category') {
    const catCounts = {};
    state.menu.forEach((m) => {
      catCounts[m.category] = 0;
    });

    state.orders.forEach((o) => {
      const match = state.menu.find((m) => m.name.toLowerCase() === (o.item || '').toLowerCase());
      const cat = match ? match.category : 'Hot Coffee';
      catCounts[cat] = (catCounts[cat] || 0) + (Number(o.amount) || 180);
    });

    labels = Object.keys(catCounts);
    dataPoints = Object.values(catCounts);
  } else {
    const statusCounts = { Pending: 0, Preparing: 0, Ready: 0, Completed: 0, Cancelled: 0 };
    state.orders.forEach((o) => {
      const s = o.status || 'Pending';
      if (statusCounts[s] !== undefined) statusCounts[s]++;
      else statusCounts['Pending']++;
    });

    labels = Object.keys(statusCounts);
    dataPoints = Object.values(statusCounts);
    chartColors = ['#F59E0B', '#8B5CF6', '#0284C7', '#10B981', '#EF4444'];
  }

  const ctx = canvas.getContext('2d');
  state.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: state.chartView === 'category' ? 'Revenue by Category (₹)' : 'Order Count',
          data: dataPoints,
          backgroundColor: chartColors,
          borderRadius: 6,
          maxBarThickness: 45,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(238, 230, 222, 0.6)' },
          ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#705B4E' },
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#705B4E' },
        },
      },
    },
  });
}

document.getElementById('btnChartCategory')?.addEventListener('click', () => {
  state.chartView = 'category';
  document.getElementById('btnChartCategory').classList.add('active');
  document.getElementById('btnChartStatus').classList.remove('active');
  renderChart();
});

document.getElementById('btnChartStatus')?.addEventListener('click', () => {
  state.chartView = 'status';
  document.getElementById('btnChartStatus').classList.add('active');
  document.getElementById('btnChartCategory').classList.remove('active');
  renderChart();
});

// Admin Customers Directory
function renderCustomersTable() {
  const tbody = document.getElementById('customersTableBody');
  if (!tbody) return;

  let customers = [...state.customers];

  if (state.customerSearchTerm) {
    const q = state.customerSearchTerm.toLowerCase();
    customers = customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }

  if (customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No customers found.</td></tr>`;
    return;
  }

  tbody.innerHTML = customers
    .map(
      (c) => `
    <tr>
      <td><span class="order-id">#${c.id}</span></td>
      <td class="customer-cell"><strong>${escapeHtml(c.name)}</strong></td>
      <td>${escapeHtml(c.email)}</td>
      <td>${escapeHtml(c.phone)}</td>
      <td>${escapeHtml(c.joinedDate || '2026-02-01')}</td>
      <td><strong class="text-accent">${c.totalOrders} Orders</strong></td>
      <td class="amount-cell">₹${Number(c.totalSpent).toLocaleString()}</td>
      <td class="text-muted">${escapeHtml(c.lastOrder)}</td>
    </tr>
  `
    )
    .join('');
}

document.getElementById('customerSearchInput')?.addEventListener('input', (e) => {
  state.customerSearchTerm = e.target.value.trim();
  renderCustomersTable();
});

// Admin Menu Management Grid
function renderAdminMenuGrid() {
  const container = document.getElementById('adminMenuCardsGrid');
  if (!container) return;

  let items = [...state.menu];

  if (state.adminMenuFilterCat && state.adminMenuFilterCat !== 'All') {
    items = items.filter((m) => m.category.toLowerCase() === state.adminMenuFilterCat.toLowerCase());
  }

  if (state.adminMenuSearchTerm) {
    const q = state.adminMenuSearchTerm.toLowerCase();
    items = items.filter((m) => m.name.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q)));
  }

  if (items.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; background: #FFF; border-radius: 12px; border: 1px solid var(--border-subtle);"><p style="font-weight: 600; color: var(--color-roast-800);">No items match this filter.</p></div>`;
    return;
  }

  const defaultImg = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80';

  container.innerHTML = items
    .map((item) => {
      const isAvailable = item.available !== false;
      const stockBadge = isAvailable
        ? `<span class="menu-stock-chip stock-in">In Stock</span>`
        : `<span class="menu-stock-chip stock-out">Out of Stock</span>`;

      return `
      <div class="menu-card" id="menu-card-${item.id}">
        <div class="menu-card-img-wrap">
          <img src="${escapeHtml(item.image || defaultImg)}" alt="${escapeHtml(item.name)}" class="menu-card-img" onerror="this.src='${defaultImg}'" />
          <span class="menu-cat-chip">${escapeHtml(item.category)}</span>
          ${stockBadge}
        </div>
        <div class="menu-card-body">
          <h4 class="menu-item-title">${escapeHtml(item.name)}</h4>
          <p class="menu-item-desc">${escapeHtml(item.description || 'Prepared fresh daily.')}</p>
          <div class="menu-card-footer">
            <span class="menu-price">₹${item.price}</span>
            <div class="menu-card-actions">
              <button class="btn-card-action" onclick="toggleItemStock(${item.id})">
                ${isAvailable ? 'Mark Out' : 'Mark In'}
              </button>
              <button class="btn-card-action" onclick="openEditMenuModal(${item.id})">Edit</button>
              <button class="btn-card-action btn-card-del" onclick="deleteMenuItem(${item.id})">✕</button>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join('');
}

document.querySelectorAll('#adminCategoryPills .pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#adminCategoryPills .pill').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    state.adminMenuFilterCat = btn.getAttribute('data-cat');
    renderAdminMenuGrid();
  });
});

document.getElementById('adminMenuSearchInput')?.addEventListener('input', (e) => {
  state.adminMenuSearchTerm = e.target.value.trim();
  renderAdminMenuGrid();
});

async function toggleItemStock(id) {
  const item = state.menu.find((m) => m.id === id);
  if (!item) return;

  const newStatus = !(item.available !== false);
  try {
    const updated = await apiCall('PUT', `${BASE}/menu/${id}`, { available: newStatus });
    item.available = updated.available;
    renderAdminMenuGrid();
    renderUserMenuGrid();
    showToast(`Stock updated for "${item.name}"`);
  } catch (err) {
    showToast('Failed to update stock: ' + err.message, 'error');
  }
}

async function deleteMenuItem(id) {
  const item = state.menu.find((m) => m.id === id);
  if (!confirm(`Delete "${item?.name}" from menu?`)) return;

  try {
    await apiCall('DELETE', `${BASE}/menu/${id}`);
    state.menu = state.menu.filter((m) => m.id !== id);
    renderAdminMenuGrid();
    renderUserMenuGrid();
    renderAdminStats();
    renderChart();
    renderSidebarNav();
    showToast('Item deleted successfully');
  } catch (err) {
    showToast('Failed to delete item: ' + err.message, 'error');
  }
}

// ============================================================================
// USER / CUSTOMER FEATURES (MENU, CART, ORDER TRACKER)
// ============================================================================

function renderUserMenuGrid() {
  const container = document.getElementById('userMenuCardsGrid');
  if (!container) return;

  let items = [...state.menu];

  if (state.userMenuFilterCat && state.userMenuFilterCat !== 'All') {
    items = items.filter((m) => m.category.toLowerCase() === state.userMenuFilterCat.toLowerCase());
  }

  if (state.userMenuSearchTerm) {
    const q = state.userMenuSearchTerm.toLowerCase();
    items = items.filter((m) => m.name.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q)));
  }

  if (items.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; background: #FFF; border-radius: 12px; border: 1px solid var(--border-subtle);"><p style="font-weight: 600; color: var(--color-roast-800);">No menu items found for your search.</p></div>`;
    return;
  }

  const defaultImg = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80';

  container.innerHTML = items
    .map((item) => {
      const isAvailable = item.available !== false;
      const stockBadge = isAvailable
        ? `<span class="menu-stock-chip stock-in">Available</span>`
        : `<span class="menu-stock-chip stock-out">Sold Out</span>`;

      return `
      <div class="menu-card">
        <div class="menu-card-img-wrap">
          <img src="${escapeHtml(item.image || defaultImg)}" alt="${escapeHtml(item.name)}" class="menu-card-img" onerror="this.src='${defaultImg}'" />
          <span class="menu-cat-chip">${escapeHtml(item.category)}</span>
          ${stockBadge}
        </div>
        <div class="menu-card-body">
          <h4 class="menu-item-title">${escapeHtml(item.name)}</h4>
          <p class="menu-item-desc">${escapeHtml(item.description || 'Specialty roasted craft beverage.')}</p>
          <div class="menu-card-footer">
            <span class="menu-price">₹${item.price}</span>
            <button class="btn-add-cart" ${!isAvailable ? 'disabled' : ''} onclick="addToCart(${item.id})">
              <span>🛒</span> Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join('');
}

document.querySelectorAll('#userCategoryPills .pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#userCategoryPills .pill').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    state.userMenuFilterCat = btn.getAttribute('data-cat');
    renderUserMenuGrid();
  });
});

document.getElementById('userMenuSearchInput')?.addEventListener('input', (e) => {
  state.userMenuSearchTerm = e.target.value.trim();
  renderUserMenuGrid();
});

// Cart Logic
function addToCart(itemId) {
  const item = state.menu.find((m) => m.id === itemId);
  if (!item || item.available === false) return;

  const existing = state.cart.find((c) => c.id === itemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image,
    });
  }

  updateCartBadge();
  showToast(`Added "${item.name}" to cart!`);
}

function updateCartQuantity(itemId, delta) {
  const idx = state.cart.findIndex((c) => c.id === itemId);
  if (idx === -1) return;

  state.cart[idx].quantity += delta;
  if (state.cart[idx].quantity <= 0) {
    state.cart.splice(idx, 1);
  }

  updateCartBadge();
  renderCartDrawer();
}

function removeCartItem(itemId) {
  state.cart = state.cart.filter((c) => c.id !== itemId);
  updateCartBadge();
  renderCartDrawer();
}

function updateCartBadge() {
  const totalQty = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  const navbarCartCount = document.getElementById('navbarCartCount');
  const userHeroCartCount = document.getElementById('userHeroCartCount');
  const cartDrawerCount = document.getElementById('cartDrawerCount');
  const sidebarCartCount = document.getElementById('sidebarCartCount');

  if (navbarCartCount) navbarCartCount.textContent = totalQty;
  if (userHeroCartCount) userHeroCartCount.textContent = totalQty;
  if (cartDrawerCount) cartDrawerCount.textContent = totalQty;
  if (sidebarCartCount) sidebarCartCount.textContent = totalQty;
}

function openCartDrawer() {
  renderCartDrawer();
  document.getElementById('cartDrawerOverlay')?.classList.add('open');
  document.getElementById('cartDrawer')?.classList.add('open');
}

function closeCartDrawer() {
  document.getElementById('cartDrawerOverlay')?.classList.remove('open');
  document.getElementById('cartDrawer')?.classList.remove('open');
}

function renderCartDrawer() {
  const container = document.getElementById('cartItemsContainer');
  const subtotalEl = document.getElementById('cartSubtotal');
  const taxEl = document.getElementById('cartTax');
  const grandTotalEl = document.getElementById('cartGrandTotal');
  const btnConfirm = document.getElementById('btnConfirmCartOrder');

  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-message">
        <span class="empty-icon">🛒</span>
        <h4>Your Cart is Empty</h4>
        <p>Explore our craft coffees and bakeries to add treats to your cart.</p>
        <button class="btn-primary" style="margin-top: 14px;" onclick="closeCartDrawer(); switchTab('user-menu');">
          Browse Menu
        </button>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '₹0';
    if (taxEl) taxEl.textContent = '₹0';
    if (grandTotalEl) grandTotalEl.textContent = '₹0';
    if (btnConfirm) btnConfirm.disabled = true;
    return;
  }

  if (btnConfirm) btnConfirm.disabled = false;

  container.innerHTML = state.cart
    .map(
      (item) => `
    <div class="cart-item-row">
      <div class="cart-item-info">
        <strong>${escapeHtml(item.name)}</strong>
        <span>₹${item.price} each</span>
      </div>
      <div class="cart-item-ctrls">
        <button class="btn-qty" onclick="updateCartQuantity(${item.id}, -1)">−</button>
        <span class="cart-qty-val">${item.quantity}</span>
        <button class="btn-qty" onclick="updateCartQuantity(${item.id}, 1)">+</button>
        <span class="cart-item-price">₹${item.price * item.quantity}</span>
        <button class="btn-cart-remove" onclick="removeCartItem(${item.id})" title="Remove item">✕</button>
      </div>
    </div>
  `
    )
    .join('');

  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const grandTotal = subtotal + tax;

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString()}`;
  if (taxEl) taxEl.textContent = `₹${tax.toLocaleString()}`;
  if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal.toLocaleString()}`;
}

// ============================================================================
// CHECKOUT FLOW & PAYMENT PREFERENCE SYSTEM
// ============================================================================

const checkoutState = {
  orderType: 'Delivery', // 'Delivery' | 'Pickup'
  paymentMethod: 'COD',  // 'COD' | 'Online'
  deliveryFee: 30,
};

function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('Your cart is empty. Please add items to proceed.', 'error');
    return;
  }

  // Pre-fill user information if available
  const nameInput = document.getElementById('checkoutName');
  const phoneInput = document.getElementById('checkoutPhone');
  const addressInput = document.getElementById('checkoutAddress');
  const branchSelect = document.getElementById('checkoutBranchSelect');

  if (nameInput && state.currentUser) {
    nameInput.value = state.currentUser.name || '';
  }
  if (phoneInput && state.currentUser) {
    phoneInput.value = state.currentUser.phone || '+91 98201 22222';
  }
  if (addressInput && !addressInput.value) {
    addressInput.value = 'Flat 402, Seawood Palms, Sector 15, Panvel';
  }

  // Populate branch outlets dropdown
  if (branchSelect) {
    branchSelect.innerHTML = state.locations
      .map((l) => `<option value="${l.id}">${escapeHtml(l.name)} (${escapeHtml(l.address)})</option>`)
      .join('');
  }

  // Set default fulfillment and payment choices
  updateCheckoutOrderType('Delivery');
  togglePaymentPreference('COD');

  // Render live bill summary
  renderCheckoutSummary();

  // Close cart drawer and open modal
  closeCartDrawer();
  document.getElementById('checkoutModal')?.classList.add('open');
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal')?.classList.remove('open');
}

function updateCheckoutOrderType(type) {
  checkoutState.orderType = type;
  checkoutState.deliveryFee = type === 'Delivery' ? 30 : 0;

  const optDelivery = document.getElementById('optionDeliveryLabel');
  const optPickup = document.getElementById('optionPickupLabel');
  const addressLabel = document.querySelector('label[for="checkoutAddress"]');
  const addressInput = document.getElementById('checkoutAddress');

  if (type === 'Delivery') {
    optDelivery?.classList.add('active');
    optPickup?.classList.remove('active');
    if (addressLabel) addressLabel.innerHTML = 'Delivery Address (Street, Building, Flat) <span class="required">*</span>';
    if (addressInput && addressInput.value.includes('Counter Pickup')) {
      addressInput.value = 'Flat 402, Seawood Palms, Sector 15, Panvel';
    }
  } else {
    optPickup?.classList.add('active');
    optDelivery?.classList.remove('active');
    if (addressLabel) addressLabel.innerHTML = 'Pickup Branch Counter <span class="required">*</span>';
    if (addressInput) addressInput.value = 'In-Store Counter Pickup at Selected Outlet';
  }

  renderCheckoutSummary();
}

function togglePaymentPreference(method) {
  checkoutState.paymentMethod = method;

  const codCard = document.getElementById('payMethodCodCard');
  const onlineCard = document.getElementById('payMethodOnlineCard');
  const notice = document.getElementById('onlinePaymentNotice');

  if (method === 'COD') {
    codCard?.classList.add('active');
    onlineCard?.classList.remove('active');
    if (notice) notice.style.display = 'none';
  } else {
    onlineCard?.classList.add('active');
    codCard?.classList.remove('active');
    if (notice) notice.style.display = 'block';
  }

  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const preview = document.getElementById('checkoutItemsPreview');
  const subtotalEl = document.getElementById('checkoutSubtotalDisplay');
  const gstEl = document.getElementById('checkoutGstDisplay');
  const feeLabelEl = document.getElementById('checkoutDeliveryFeeLabel');
  const feeDisplayEl = document.getElementById('checkoutDeliveryFeeDisplay');
  const grandTotalEl = document.getElementById('checkoutGrandTotalDisplay');

  if (!preview) return;

  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gst = Math.round(subtotal * 0.05);
  const deliveryFee = checkoutState.deliveryFee;
  const grandTotal = subtotal + gst + deliveryFee;

  preview.innerHTML = state.cart
    .map(
      (item) => `
    <div class="summary-item-line">
      <div class="summary-item-name">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="text-muted">× ${item.quantity}</span>
      </div>
      <div class="summary-item-price">₹${(item.price * item.quantity).toLocaleString()}</div>
    </div>
  `
    )
    .join('');

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString()}`;
  if (gstEl) gstEl.textContent = `₹${gst.toLocaleString()}`;
  if (feeLabelEl) feeLabelEl.textContent = checkoutState.orderType === 'Delivery' ? 'Delivery Fee' : 'Counter Pickup';
  if (feeDisplayEl) feeDisplayEl.textContent = checkoutState.orderType === 'Delivery' ? `₹${deliveryFee}` : 'FREE';
  if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal.toLocaleString()}`;
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  if (state.cart.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }

  const customerName = document.getElementById('checkoutName').value.trim();
  const phone = document.getElementById('checkoutPhone').value.trim();
  const deliveryAddress = document.getElementById('checkoutAddress').value.trim();
  const locationNote = document.getElementById('checkoutLocationNote').value.trim();
  const locationId = Number(document.getElementById('checkoutBranchSelect').value) || 1;
  const time = document.getElementById('checkoutTimePreference').value;
  const isOnlineVerified = document.getElementById('sandboxPaymentVerified')?.checked ?? true;

  if (!customerName) {
    showToast('Please enter your full name', 'error');
    return;
  }
  if (!phone || !/^\+?[\d\s\-()]{7,16}$/.test(phone)) {
    showToast('Please enter a valid phone number (at least 7 digits)', 'error');
    return;
  }
  if (!deliveryAddress) {
    showToast('Please provide a delivery address or pickup location', 'error');
    return;
  }

  // Calculate pricing
  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gst = Math.round(subtotal * 0.05);
  const deliveryFee = checkoutState.deliveryFee;
  const grandTotal = subtotal + gst + deliveryFee;

  // Ask for final confirmation
  const confirmMsg = `Confirm placing this order?\n\n• Customer: ${customerName}\n• Total Amount: ₹${grandTotal.toLocaleString()}\n• Payment Method: ${checkoutState.paymentMethod === 'Online' ? 'Online Payment (Sandbox)' : 'Cash on Delivery (COD)'}\n• Destination: ${deliveryAddress}`;
  if (!confirm(confirmMsg)) {
    return;
  }

  const payload = {
    customerName,
    phone,
    deliveryAddress,
    locationNote,
    locationId,
    orderType: checkoutState.orderType,
    items: state.cart.map((c) => ({ id: c.id, name: c.name, price: c.price, quantity: c.quantity })),
    paymentMethod: checkoutState.paymentMethod,
    onlinePaymentVerified: checkoutState.paymentMethod === 'Online' ? isOnlineVerified : false,
    time: `${checkoutState.orderType}: ${time}`,
    userId: state.currentUser ? state.currentUser.id : 2,
    userEmail: state.currentUser ? state.currentUser.email : 'customer@cafearoma.com',
  };

  const btnSubmit = document.getElementById('btnPlaceFinalOrder');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span>⏳</span> Submitting Order...';
  }

  try {
    const created = await apiCall('POST', `${BASE}/orders`, payload);

    // Save locally
    state.orders.push(created);
    state.cart = [];
    updateCartBadge();
    closeCheckoutModal();

    // Show Celebration Confirmation Modal
    showOrderSuccessModal(created);

    // Update background views
    renderAdminOrdersTable();
    renderRecentOrders();
    renderAdminStats();
    renderUserOrders();
    renderSidebarNav();
    refreshCustomers();

    showToast(`Order #${created.id} placed successfully!`);
  } catch (err) {
    showToast('Failed to place order: ' + err.message, 'error');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>✓</span> Confirm &amp; Place Order';
    }
  }
}

function showOrderSuccessModal(order) {
  const modal = document.getElementById('orderSuccessModal');
  if (!modal) return;

  const idEl = document.getElementById('successOrderId');
  const statusEl = document.getElementById('successOrderStatus');
  const itemsEl = document.getElementById('successOrderItems');
  const addrEl = document.getElementById('successOrderAddress');
  const payEl = document.getElementById('successPaymentSummary');
  const amountEl = document.getElementById('successOrderAmount');

  if (idEl) idEl.textContent = `#${order.id}`;
  if (statusEl) statusEl.textContent = `${order.status || 'Pending'} — Waiting for Kitchen Acceptance`;
  if (itemsEl) itemsEl.textContent = order.item || '-';
  if (addrEl) addrEl.textContent = `${order.deliveryAddress} (${order.orderType || 'Delivery'})`;
  if (payEl) payEl.textContent = `${order.paymentMethod || 'COD'} • ${order.paymentStatus || 'Pending'}`;
  if (amountEl) amountEl.textContent = `₹${Number(order.amount || 0).toLocaleString()} (incl. GST & delivery)`;

  modal.classList.add('open');
}

function closeOrderSuccessModal() {
  document.getElementById('orderSuccessModal')?.classList.remove('open');
}

function viewOrderLiveTracking() {
  closeOrderSuccessModal();
  switchTab('user-orders');
}

// ============================================================================
// USER DASHBOARD: MY ORDERS & LIVE STEPPER TRACKER
// ============================================================================

function renderUserOrders() {
  const container = document.getElementById('userOrdersContainer');
  if (!container || !state.currentUser) return;

  const currentUserId = state.currentUser.id;
  const currentEmail = (state.currentUser.email || '').toLowerCase();
  const currentName = (state.currentUser.name || '').toLowerCase();

  // Filter orders strictly for this authenticated customer
  const userOrders = state.orders.filter(
    (o) =>
      o.userId === currentUserId ||
      (o.userEmail && o.userEmail.toLowerCase() === currentEmail) ||
      (o.customerName && o.customerName.toLowerCase() === currentName)
  );

  if (userOrders.length === 0) {
    container.innerHTML = `
      <div class="card text-center py-4">
        <span style="font-size: 3rem; display: block; margin-bottom: 10px;">☕</span>
        <h3>No Orders Placed Yet</h3>
        <p class="text-muted" style="margin-bottom: 18px;">You haven't placed any pickup or delivery orders yet. Explore our specialty menu to order fresh coffee!</p>
        <button class="btn-primary" onclick="switchTab('user-menu')">Browse Menu &amp; Order</button>
      </div>
    `;
    return;
  }

  const sorted = [...userOrders].reverse();

  container.innerHTML = sorted
    .map((o) => {
      const status = (o.status || 'Pending').toLowerCase();
      const isPending = status === 'pending';
      const isPreparing = status === 'preparing';
      const isReady = status === 'ready';
      const isCompleted = status === 'completed';
      const isCancelled = status === 'cancelled';

      const step1Class = isCancelled ? '' : isPending ? 'active' : 'completed';
      const step2Class = isCancelled ? '' : isPreparing ? 'active' : isReady || isCompleted ? 'completed' : '';
      const step3Class = isCancelled ? '' : isReady ? 'active' : isCompleted ? 'completed' : '';
      const step4Class = isCancelled ? '' : isCompleted ? 'completed active' : '';

      let progressPct = 0;
      if (isPending) progressPct = 12;
      else if (isPreparing) progressPct = 40;
      else if (isReady) progressPct = 75;
      else if (isCompleted) progressPct = 100;

      const outletName = getLocationName(o.locationId);
      const isOnline = (o.paymentMethod || '').toLowerCase() === 'online';

      return `
      <div class="order-tracker-card" id="user-order-${o.id}">
        <div class="order-card-top">
          <div class="order-card-meta">
            <h4>Order #${o.id}</h4>
            <p>
              📍 <strong>${escapeHtml(o.orderType || 'Pickup')}:</strong> ${escapeHtml(o.deliveryAddress || outletName)}
              ${o.phone ? ` • 📞 ${escapeHtml(o.phone)}` : ''}
            </p>
            <p class="order-outlet-line">Outlet: <strong>${escapeHtml(outletName)}</strong> • Preferred Time: <strong>${escapeHtml(o.time || 'Express')}</strong></p>
          </div>
          <div class="order-card-price">
            <span class="order-total-val">₹${Number(o.amount || 0).toLocaleString()}</span>
            <div style="margin-top: 4px;">
              <span class="badge-status badge-${status}">${escapeHtml(o.status || 'Pending')}</span>
            </div>
            <div style="margin-top: 6px;">
              <span class="pay-chip ${isOnline ? 'pay-chip-online' : 'pay-chip-cod'}">
                💳 ${escapeHtml(o.paymentMethod || 'COD')} (${escapeHtml(o.paymentStatus || 'Pending')})
              </span>
            </div>
          </div>
        </div>

        ${
          isCancelled
            ? `
          <div class="order-cancelled-alert">
            ✕ This order was cancelled / rejected by kitchen dispatch.
          </div>
        `
            : `
          <div class="stepper-container">
            <div class="stepper-track">
              <div class="stepper-track-progress" style="width: ${progressPct}%;"></div>
            </div>

            <div class="step-node ${step1Class}">
              <div class="step-circle">📝</div>
              <span class="step-label">1. Order Placed</span>
              <small class="step-sublabel">Pending Review</small>
            </div>

            <div class="step-node ${step2Class}">
              <div class="step-circle">☕</div>
              <span class="step-label">2. Kitchen Accepted</span>
              <small class="step-sublabel">Preparing Brews</small>
            </div>

            <div class="step-node ${step3Class}">
              <div class="step-circle">🛍️</div>
              <span class="step-label">3. Ready / Out</span>
              <small class="step-sublabel">Ready for Pickup</small>
            </div>

            <div class="step-node ${step4Class}">
              <div class="step-circle">✨</div>
              <span class="step-label">4. Fulfilled</span>
              <small class="step-sublabel">Delivered &amp; Done</small>
            </div>
          </div>
        `
        }

        <div class="order-card-bottom">
          <div class="order-items-snippet">
            <strong>Items:</strong> ${escapeHtml(o.item)}
            ${o.locationNote ? `<br><small class="text-muted">Landmark: ${escapeHtml(o.locationNote)}</small>` : ''}
          </div>
          ${
            isPending
              ? `<button class="btn-cancel-user-order" onclick="userCancelOrder(${o.id})">Cancel Order</button>`
              : `<span class="text-muted" style="font-size: 0.8rem;">${isCompleted ? '✓ Completed' : isCancelled ? 'Cancelled' : 'Kitchen Active'}</span>`
          }
        </div>
      </div>
    `;
    })
    .join('');
}

async function userCancelOrder(id) {
  if (!confirm(`Are you sure you want to cancel Order #${id}?`)) return;

  try {
    await apiCall('DELETE', `${BASE}/orders/${id}`);
    state.orders = state.orders.filter((o) => o.id !== id);
    renderUserOrders();
    renderSidebarNav();
    showToast(`Order #${id} has been cancelled`);
  } catch (err) {
    showToast('Failed to cancel order: ' + err.message, 'error');
  }
}

// ============================================================================
// MODALS & SHARED CONTROLS (MENU, LOCATIONS, REVIEWS)
// ============================================================================

function populateFormDropdowns() {
  const itemSelect = document.getElementById('orderItemSelect');
  const locSelect = document.getElementById('orderLocationSelect');
  const cartLocSelect = document.getElementById('cartLocationSelect');

  if (itemSelect) {
    const availableItems = state.menu.filter((m) => m.available !== false);
    itemSelect.innerHTML =
      `<option value="">-- Choose from Menu (${availableItems.length} available) --</option>` +
      availableItems
        .map((m) => `<option value="${escapeHtml(m.name)}" data-price="${m.price}">${escapeHtml(m.name)} (₹${m.price})</option>`)
        .join('');
  }

  const locationOptions = state.locations
    .map((l) => `<option value="${l.id}">${escapeHtml(l.name)} (${escapeHtml(l.address)})</option>`)
    .join('');

  if (locSelect) {
    locSelect.innerHTML = `<option value="">-- Choose Pickup Branch --</option>` + locationOptions;
  }
  if (cartLocSelect) {
    cartLocSelect.innerHTML = locationOptions;
  }
}

function openMenuModal() {
  const modal = document.getElementById('menuModal');
  const form = document.getElementById('menuItemForm');
  const title = document.getElementById('menuModalTitle');
  form?.reset();
  document.getElementById('menuItemId').value = '';
  document.getElementById('menuItemAvailable').checked = true;
  if (title) title.textContent = 'Add Menu Item';
  modal?.classList.add('open');
}

function openEditMenuModal(id) {
  const item = state.menu.find((m) => m.id === id);
  if (!item) return;

  const modal = document.getElementById('menuModal');
  const title = document.getElementById('menuModalTitle');
  if (title) title.textContent = 'Edit Menu Item';

  document.getElementById('menuItemId').value = item.id;
  document.getElementById('menuItemName').value = item.name;
  document.getElementById('menuItemCategory').value = item.category;
  document.getElementById('menuItemPrice').value = item.price;
  document.getElementById('menuItemDesc').value = item.description || '';
  document.getElementById('menuItemImage').value = item.image || '';
  document.getElementById('menuItemAvailable').checked = item.available !== false;

  modal?.classList.add('open');
}

function closeMenuModal() {
  document.getElementById('menuModal')?.classList.remove('open');
}

document.getElementById('menuItemForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('menuItemId').value;
  const name = document.getElementById('menuItemName').value.trim();
  const category = document.getElementById('menuItemCategory').value;
  const price = Number(document.getElementById('menuItemPrice').value);
  const description = document.getElementById('menuItemDesc').value.trim();
  const image = document.getElementById('menuItemImage').value.trim();
  const available = document.getElementById('menuItemAvailable').checked;

  const payload = { name, category, price, description, available };
  if (image) payload.image = image;

  try {
    if (id) {
      const updated = await apiCall('PUT', `${BASE}/menu/${id}`, payload);
      const idx = state.menu.findIndex((m) => m.id === Number(id));
      if (idx !== -1) state.menu[idx] = updated;
      showToast(`Updated "${name}"`);
    } else {
      const created = await apiCall('POST', `${BASE}/menu`, payload);
      state.menu.push(created);
      showToast(`Added "${name}" to menu`);
    }

    closeMenuModal();
    renderAdminMenuGrid();
    renderUserMenuGrid();
    renderAdminStats();
    renderChart();
    renderSidebarNav();
    populateFormDropdowns();
  } catch (err) {
    showToast('Failed to save menu item: ' + err.message, 'error');
  }
});

function openOrderModal() {
  const modal = document.getElementById('orderModal');
  document.getElementById('newOrderForm')?.reset();
  populateFormDropdowns();
  updateOrderPriceCalc();
  modal?.classList.add('open');
}

function closeOrderModal() {
  document.getElementById('orderModal')?.classList.remove('open');
}

function updateOrderPriceCalc() {
  const itemSelect = document.getElementById('orderItemSelect');
  const qtyInput = document.getElementById('orderQuantity');
  const calcDisplay = document.getElementById('orderPriceCalc');

  const selected = itemSelect?.options[itemSelect.selectedIndex];
  const unitPrice = selected ? Number(selected.getAttribute('data-price')) || 0 : 0;
  const qty = Number(qtyInput?.value) || 1;

  if (calcDisplay) calcDisplay.textContent = `₹${unitPrice * qty}`;
}

document.getElementById('orderItemSelect')?.addEventListener('change', updateOrderPriceCalc);
document.getElementById('orderQuantity')?.addEventListener('input', updateOrderPriceCalc);

document.getElementById('newOrderForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const customerName = document.getElementById('orderCustomerName').value.trim();
  const phone = document.getElementById('orderCustomerPhone')?.value.trim() || '+91 98201 00000';
  const itemSelect = document.getElementById('orderItemSelect');
  const item = itemSelect.value;
  const quantity = Number(document.getElementById('orderQuantity').value) || 1;
  const deliveryAddress = document.getElementById('orderDeliveryAddress')?.value.trim() || 'Counter Pickup';
  const locationId = Number(document.getElementById('orderLocationSelect').value);
  const paymentMethod = document.getElementById('orderPaymentMethod')?.value || 'COD';
  const time = document.getElementById('orderTimeInput').value.trim();

  const selected = itemSelect.options[itemSelect.selectedIndex];
  const unitPrice = selected ? Number(selected.getAttribute('data-price')) || 180 : 180;
  const amount = unitPrice * quantity;

  const payload = {
    customerName,
    phone,
    deliveryAddress,
    locationId,
    item,
    quantity,
    amount,
    paymentMethod,
    time,
    status: 'Pending',
  };

  try {
    const created = await apiCall('POST', `${BASE}/orders`, payload);
    state.orders.push(created);
    closeOrderModal();
    renderAdminOrdersTable();
    renderRecentOrders();
    renderAdminStats();
    renderChart();
    renderSidebarNav();
    refreshCustomers();
    showToast(`Order #${created.id} placed for ${customerName}`);
  } catch (err) {
    showToast('Failed to place order: ' + err.message, 'error');
  }
});

// Locations Grid & Modal
function renderLocationsGrid() {
  const grid = document.getElementById('locationsGrid');
  if (!grid) return;

  grid.innerHTML = state.locations
    .map(
      (l) => `
    <div class="location-card">
      <div class="loc-card-header">
        <h4 class="loc-title">${escapeHtml(l.name)}</h4>
        <span class="loc-rating-badge">★ ${Number(l.rating || 4.7).toFixed(1)}</span>
      </div>
      <p class="loc-address">📍 ${escapeHtml(l.address)}</p>
      <p class="loc-phone">📞 ${escapeHtml(l.phone || '+91 98200 12345')}</p>
    </div>
  `
    )
    .join('');
}

function openLocationModal() {
  document.getElementById('newLocationForm')?.reset();
  document.getElementById('locationModal')?.classList.add('open');
}

function closeLocationModal() {
  document.getElementById('locationModal')?.classList.remove('open');
}

document.getElementById('newLocationForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('locName').value.trim();
  const address = document.getElementById('locAddress').value.trim();
  const rating = Number(document.getElementById('locRating').value) || 4.8;
  const phone = document.getElementById('locPhone').value.trim() || '+91 98200 00000';

  try {
    const created = await apiCall('POST', `${BASE}/locations`, { name, address, rating, phone });
    state.locations.push(created);
    closeLocationModal();
    renderLocationsGrid();
    populateFormDropdowns();
    renderCafeProfile();
    showToast(`Added branch "${name}"`);
  } catch (err) {
    showToast('Failed to add outlet: ' + err.message, 'error');
  }
});

// Reviews Grid & Modal
function renderReviewsGrid() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  grid.innerHTML = state.reviews
    .map(
      (r) => `
    <div class="review-card">
      <div class="review-header">
        <span class="review-author">${escapeHtml(r.author)}</span>
        <span class="review-stars">${'★'.repeat(r.rating || 5)}</span>
      </div>
      <p class="review-comment">"${escapeHtml(r.comment)}"</p>
      <div class="review-footer">
        <span>Verified Patron</span>
        <span>${escapeHtml(r.date || 'Recent')}</span>
      </div>
    </div>
  `
    )
    .join('');
}

function openReviewModal() {
  document.getElementById('newReviewForm')?.reset();
  document.getElementById('reviewModal')?.classList.add('open');
}

function closeReviewModal() {
  document.getElementById('reviewModal')?.classList.remove('open');
}

document.getElementById('newReviewForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const author = document.getElementById('reviewAuthor').value.trim();
  const rating = Number(document.getElementById('reviewRating').value) || 5;
  const comment = document.getElementById('reviewComment').value.trim();

  try {
    const created = await apiCall('POST', `${BASE}/reviews`, { author, rating, comment, date: 'Just now' });
    state.reviews.unshift(created);
    closeReviewModal();
    renderReviewsGrid();
    showToast('Review submitted. Thank you!');
  } catch (err) {
    showToast('Failed to submit review: ' + err.message, 'error');
  }
});

// API Live Log
function renderApiLog() {
  const fullLogList = document.getElementById('fullLogList');
  if (!fullLogList) return;

  if (state.logs.length === 0) {
    fullLogList.innerHTML = `<li class="log-empty">No API calls recorded in this session yet.</li>`;
    return;
  }

  fullLogList.innerHTML = state.logs
    .map((item) => {
      const statusClass =
        item.status >= 200 && item.status < 300
          ? 'status-2xx'
          : item.status >= 400 && item.status < 500
          ? 'status-4xx'
          : 'status-5xx';
      return `
      <li class="log-item">
        <span class="log-time">[${item.time}]</span>
        <span class="log-method method-${item.method}">${item.method}</span>
        <span class="log-url">${escapeHtml(item.url)}</span>
        <span class="log-status ${statusClass}">HTTP ${item.status}</span>
      </li>
    `;
    })
    .join('');
}

document.getElementById('btnClearLog')?.addEventListener('click', () => {
  state.logs = [];
  renderApiLog();
  showToast('API log cleared');
});

// Navbar Quick Buttons
document.getElementById('btnQuickAddMenu')?.addEventListener('click', () => {
  switchTab('admin-menu');
  openMenuModal();
});

document.getElementById('btnQuickNewOrder')?.addEventListener('click', () => {
  openOrderModal();
});

// Mobile Sidebar
document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('open');
});

document.getElementById('closeSidebarBtn')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.remove('open');
});

// Close modals on backdrop click
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach((m) => m.classList.remove('open'));
    closeCartDrawer();
  }
});

// ============================================================================
// INITIALIZATION ON DOM READY
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await fetchAllData();

  // Check saved session in localStorage
  const saved = localStorage.getItem('cafe_aroma_user');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id && parsed.email) {
        // Verify with backend
        const verification = await apiCall('POST', `${BASE}/auth/verify`, {
          id: parsed.id,
          email: parsed.email,
        });

        if (verification && verification.valid) {
          showDashboard(verification.user);
          return;
        }
      }
    } catch (e) {
      console.warn('Session verification error:', e);
    }
    localStorage.removeItem('cafe_aroma_user');
  }

  // Not logged in -> Show ONLY the Authentication screen!
  showAuthScreen();
});
