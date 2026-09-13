/**
 * Sunny & Scramble — SPA Application (Vanilla JS ES6+)
 * 
 * Full client-side application with hash-based routing,
 * recreating all original React component functionality.
 */

// ═══════════════════════════════════════════════════════════════
// API HELPER
// ═══════════════════════════════════════════════════════════════
const API = {
    base: '',
    async request(url, options = {}) {
        const defaults = {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        };
        if (options.body instanceof FormData) {
            delete defaults.headers['Content-Type'];
        }
        const res = await fetch(`${this.base}${url}`, { ...defaults, ...options });
        if (res.status === 401 && !url.includes('auth.php')) {
            showLogin();
            throw new Error('Session expired');
        }
        return res;
    },
    async get(url) {
        const res = await this.request(url);
        return res.json();
    },
    async post(url, data) {
        const res = await this.request(url, {
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data)
        });
        return res.json();
    },
    async put(url, data) {
        const res = await this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async del(url) {
        const res = await this.request(url, { method: 'DELETE' });
        return res.json();
    }
};

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════
let currentUser = null;
let currentPage = '';

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════
const $ = (sel, parent = document) => parent.querySelector(sel);
const $$ = (sel, parent = document) => [...parent.querySelectorAll(sel)];
const el = (tag, attrs = {}, children = []) => {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'className') e.className = v;
        else if (k === 'innerHTML') e.innerHTML = v;
        else if (k === 'textContent') e.textContent = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
        else e.setAttribute(k, v);
    });
    children.forEach(c => { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
};

function formatCurrency(n) {
    return '₱' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(d) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString();
}
function formatDateTime(d) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}
function categoryEmoji(cat) {
    if (cat === 'Chicken') return '🍗';
    if (cat === 'Egg') return '🥚';
    return '📦';
}
function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}
function showAlert(type, msg, container) {
    const target = container || $('#page-content');
    const existing = target.querySelector('.alert');
    if (existing) existing.remove();
    const a = el('div', { className: `alert alert-${type}`, textContent: msg });
    target.prepend(a);
    setTimeout(() => a.remove(), 4000);
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
function showLogin() {
    currentUser = null;
    $('#login-screen').style.display = 'flex';
    $('#app-shell').style.display = 'none';
    $('#force-password-modal').style.display = 'none';
}

function showApp() {
    $('#login-screen').style.display = 'none';
    $('#app-shell').style.display = 'flex';
    updateSidebarUser();
    updateAdminNav();
    router();
}

function updateSidebarUser() {
    if (!currentUser) return;
    $('#sidebar-user-name').textContent = currentUser.fullName;
    $('#sidebar-user-role').textContent = currentUser.role;
    $('#sidebar-user-avatar').textContent = getInitials(currentUser.fullName);
}

function updateAdminNav() {
    const adminGroup = $('#nav-admin-group');
    if (!adminGroup) return;
    const adminRoles = ['superadmin', 'owner', 'admin'];
    adminGroup.style.display = adminRoles.includes(currentUser?.role) ? '' : 'none';
}

async function checkSession() {
    try {
        const data = await API.get('/api/auth.php?action=check');
        if (data.authenticated && data.user) {
            currentUser = data.user;
            if (currentUser.mustChangePassword) {
                $('#login-screen').style.display = 'none';
                $('#app-shell').style.display = 'none';
                $('#force-password-modal').style.display = 'flex';
            } else {
                showApp();
            }
        } else {
            showLogin();
        }
    } catch {
        showLogin();
    }
}

// Login form
document.addEventListener('DOMContentLoaded', () => {
    checkSession();

    $('#login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = $('#login-email').value.trim();
        const password = $('#login-password').value;
        const errEl = $('#login-error');
        const btn = $('#login-btn');
        const btnText = $('#login-btn-text');
        const spinner = $('#login-spinner');

        errEl.style.display = 'none';
        btn.disabled = true;
        btnText.textContent = 'Signing in...';
        spinner.style.display = 'inline-block';

        try {
            const data = await API.post('/api/auth.php?action=login', { email, password });
            if (data.user) {
                currentUser = data.user;
                if (currentUser.mustChangePassword) {
                    $('#login-screen').style.display = 'none';
                    $('#force-password-modal').style.display = 'flex';
                } else {
                    showApp();
                }
            } else {
                errEl.textContent = data.message || 'Login failed';
                errEl.style.display = 'block';
            }
        } catch (err) {
            errEl.textContent = 'Network error. Please try again.';
            errEl.style.display = 'block';
        }
        btn.disabled = false;
        btnText.textContent = 'Sign In';
        spinner.style.display = 'none';
    });

    // Force password change
    $('#force-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const np = $('#force-new-password').value;
        const cp = $('#force-confirm-password').value;
        const err = $('#force-pw-error');
        err.style.display = 'none';
        if (np !== cp) { err.textContent = 'Passwords do not match'; err.style.display = 'block'; return; }
        if (np.length < 6) { err.textContent = 'Password must be at least 6 characters'; err.style.display = 'block'; return; }
        try {
            const data = await API.put('/api/users.php?action=change-password', { newPassword: np });
            if (data.message && !data.message.includes('error')) {
                currentUser.mustChangePassword = false;
                $('#force-password-modal').style.display = 'none';
                showApp();
            } else {
                err.textContent = data.message || 'Failed'; err.style.display = 'block';
            }
        } catch { err.textContent = 'Network error'; err.style.display = 'block'; }
    });

    // Logout
    const doLogout = async () => {
        await API.post('/api/auth.php?action=logout', {});
        showLogin();
    };
    $('#logout-btn').addEventListener('click', doLogout);
    $('#mobile-logout-btn').addEventListener('click', doLogout);

    // Mobile sidebar toggle
    $('#mobile-menu-btn').addEventListener('click', () => {
        $('#sidebar').classList.add('open');
        $('#sidebar-overlay').classList.add('active');
    });
    $('#sidebar-overlay').addEventListener('click', () => {
        $('#sidebar').classList.remove('open');
        $('#sidebar-overlay').classList.remove('active');
    });

    // Nav items close mobile sidebar
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            $('#sidebar').classList.remove('open');
            $('#sidebar-overlay').classList.remove('active');
        });
    });

    // Hash change router
    window.addEventListener('hashchange', router);
});

// ═══════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════
function router() {
    const hash = location.hash.replace('#', '') || 'dashboard';
    currentPage = hash;

    // Update active nav
    $$('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === hash);
    });

    const content = $('#page-content');
    content.innerHTML = '';

    switch (hash) {
        case 'dashboard': renderDashboard(content); break;
        case 'sales': renderSales(content); break;
        case 'inventory': renderInventory(content); break;
        case 'deliveries': renderDeliveries(content); break;
        case 'transactions': renderTransactions(content); break;
        case 'spoilage': renderSpoilage(content); break;
        case 'suppliers': renderSuppliers(content); break;
        case 'users': renderUsers(content); break;
        case 'audit-logs': renderAuditLogs(content); break;
        case 'reports': renderReports(content); break;
        case 'settings': renderSettings(content); break;
        case 'xml-sync': renderXMLSync(content); break;
        default: content.innerHTML = '<p>Page not found</p>';
    }
}

// ═══════════════════════════════════════════════════════════════
// PAGINATION COMPONENT
// ═══════════════════════════════════════════════════════════════
function renderPagination(container, { currentPage: cp, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }) {
    const start = (cp - 1) * itemsPerPage + 1;
    const end = Math.min(cp * itemsPerPage, totalItems);

    const wrapper = el('div', { className: 'pagination' });

    const info = el('div', { className: 'pagination-info' });
    info.innerHTML = `Showing <b>${start}–${end}</b> of <b>${totalItems}</b>`;
    const perPageSel = el('select', { className: 'form-control', style: 'width:auto;padding:.25rem .5rem;font-size:.75rem;' });
    [5, 10, 25, 50].forEach(v => {
        const opt = el('option', { value: v, textContent: `${v} / page` });
        if (v === itemsPerPage) opt.selected = true;
        perPageSel.appendChild(opt);
    });
    perPageSel.addEventListener('change', () => onItemsPerPageChange(Number(perPageSel.value)));
    info.appendChild(perPageSel);

    const buttons = el('div', { className: 'pagination-buttons' });
    const prevBtn = el('button', { className: 'pagination-btn', innerHTML: '‹' });
    prevBtn.disabled = cp <= 1;
    prevBtn.addEventListener('click', () => onPageChange(cp - 1));
    buttons.appendChild(prevBtn);

    const maxVisible = 5;
    let startPage = Math.max(1, cp - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let i = startPage; i <= endPage; i++) {
        const btn = el('button', { className: `pagination-btn${i === cp ? ' active' : ''}`, textContent: i });
        btn.addEventListener('click', () => onPageChange(i));
        buttons.appendChild(btn);
    }

    const nextBtn = el('button', { className: 'pagination-btn', innerHTML: '›' });
    nextBtn.disabled = cp >= totalPages;
    nextBtn.addEventListener('click', () => onPageChange(cp + 1));
    buttons.appendChild(nextBtn);

    wrapper.appendChild(info);
    wrapper.appendChild(buttons);
    container.appendChild(wrapper);
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function renderDashboard(container) {
    // Header with period filter
    const header = el('div', { className: 'page-header' });
    const headerLeft = el('div', { className: 'page-header-left' });
    headerLeft.innerHTML = `<div class="page-header-icon" style="background:var(--amber-50);"><svg style="color:var(--amber-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg></div><div><div class="page-header-title">Dashboard</div><div class="page-header-subtitle">Overview of your business</div></div>`;

    const periodSel = el('select', { className: 'period-select' });
    ['today', 'week', 'month', 'all-time'].forEach(p => {
        periodSel.appendChild(el('option', { value: p, textContent: p.charAt(0).toUpperCase() + p.slice(1).replace('-', ' ') }));
    });
    header.appendChild(headerLeft);
    header.appendChild(periodSel);
    container.appendChild(header);

    // Loading
    const loader = el('div', { className: 'page-loader', innerHTML: '<div class="spinner spinner-dark"></div><p class="font-semibold text-sm">Loading dashboard...</p>' });
    container.appendChild(loader);

    let currentPeriod = 'today';
    const loadDashboard = async (period) => {
        currentPeriod = period;
        try {
            const data = await API.get(`/api/reports.php?action=summary&period=${period}`);
            loader.remove();

            // Remove old content after header
            while (container.children.length > 1) container.lastChild.remove();

            // Stat cards
            const grid = el('div', { className: 'stat-grid' });
            const stats = [
                { label: 'Total Sales', value: formatCurrency(data.totalSales), cls: 'stat-card--sales', iconBg: 'var(--emerald-50)', iconColor: 'var(--emerald-600)', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
                { label: 'Total Expenses', value: formatCurrency(data.totalExpenses), cls: 'stat-card--expenses', iconBg: 'var(--red-50)', iconColor: 'var(--red-600)', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>' },
                { label: 'Net Profit', value: formatCurrency(data.netProfit), cls: 'stat-card--profit', iconBg: 'var(--blue-50)', iconColor: 'var(--blue-600)', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>' },
                { label: 'Low Stock Items', value: data.lowStockCount, cls: 'stat-card--low-stock', iconBg: 'var(--amber-50)', iconColor: 'var(--amber-600)', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>' }
            ];
            stats.forEach(s => {
                const card = el('div', { className: `stat-card ${s.cls}` });
                card.innerHTML = `<div class="stat-card-icon" style="background:${s.iconBg};"><svg style="color:${s.iconColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24">${s.icon}</svg></div><div><div class="stat-card-label">${s.label}</div><div class="stat-card-value">${s.value}</div></div>`;
                grid.appendChild(card);
            });
            container.appendChild(grid);

            // Bottom row: chart + low stock
            const bottomRow = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:1rem;', className: '' });

            // Revenue chart
            const chartCard = el('div', { className: 'card' });
            chartCard.innerHTML = `<div class="card-header"><div><div class="card-header-title">Revenue Trend</div><div class="card-header-subtitle">Last 6 months</div></div></div>`;
            const chartBody = el('div', { className: 'chart-container' });
            const barChart = el('div', { className: 'bar-chart' });

            const revenues = data.last6MonthsRevenue || [];
            const maxRev = Math.max(...revenues.map(r => r.revenue), 1);
            revenues.forEach(r => {
                const col = el('div', { className: 'bar-chart-col' });
                const heightPct = Math.max((r.revenue / maxRev) * 100, 2);
                col.innerHTML = `<div class="bar-chart-bar" style="height:${heightPct}%"><span class="bar-tooltip">${formatCurrency(r.revenue)}</span></div><span class="bar-chart-label">${r.month}</span>`;
                barChart.appendChild(col);
            });
            chartBody.appendChild(barChart);
            chartCard.appendChild(chartBody);
            bottomRow.appendChild(chartCard);

            // Low stock panel
            const lowCard = el('div', { className: 'card' });
            lowCard.innerHTML = `<div class="card-header"><div><div class="card-header-title">Low Stock Alerts</div><div class="card-header-subtitle">${data.lowStockCount} items need attention</div></div></div>`;
            const lowBody = el('div', { className: 'card-body', style: 'max-height:300px;overflow-y:auto;' });
            if (data.lowStockProducts && data.lowStockProducts.length > 0) {
                data.lowStockProducts.forEach(p => {
                    const item = el('div', { className: 'low-stock-item' });
                    item.innerHTML = `<div class="low-stock-emoji">${categoryEmoji(p.category)}</div><div class="low-stock-info"><div class="low-stock-name">${p.productName}</div><div class="low-stock-qty">${p.quantity} / ${p.maxCapacity || 100} units</div></div>`;
                    lowBody.appendChild(item);
                });
            } else {
                lowBody.innerHTML = '<p class="text-muted text-center" style="padding:2rem;">All stock levels are healthy 👍</p>';
            }
            lowCard.appendChild(lowBody);
            bottomRow.appendChild(lowCard);
            container.appendChild(bottomRow);

        } catch (err) {
            loader.innerHTML = '<p class="text-muted">Failed to load dashboard data.</p>';
        }
    };

    periodSel.addEventListener('change', () => loadDashboard(periodSel.value));
    loadDashboard('today');
}

// ═══════════════════════════════════════════════════════════════
// SALES (POS)
// ═══════════════════════════════════════════════════════════════
async function renderSales(container) {
    let products = [];
    let cart = [];
    let searchTerm = '';
    let selectedCategory = '';
    let taxRate = 0;

    const layout = el('div', { className: 'pos-layout' });
    container.appendChild(layout);

    const loadData = async () => {
        try {
            const [prodData, configData] = await Promise.all([
                API.get('/api/products.php'),
                API.get('/api/config.php')
            ]);
            products = (prodData || []).filter(p => p.status !== 'archived');
            if (configData && configData.taxRate) taxRate = configData.taxRate;
            renderCatalog();
            renderCart();
        } catch { showAlert('error', 'Failed to load products'); }
    };

    function getFilteredProducts() {
        return products.filter(p => {
            const matchSearch = p.productName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = selectedCategory ? p.category === selectedCategory : true;
            return matchSearch && matchCat;
        });
    }

    function renderCatalog() {
        const catalog = layout.querySelector('.pos-catalog') || el('div', { className: 'pos-catalog' });
        catalog.innerHTML = '';

        // Header
        const header = el('div', { className: 'pos-catalog-header' });
        header.innerHTML = `<div class="flex items-center gap-2"><div class="page-header-icon" style="background:var(--amber-50);width:36px;height:36px;"><svg style="color:var(--amber-600);width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg></div><h1 class="font-bold" style="font-size:1rem;">Product Catalog</h1></div>`;

        const searchInput = el('input', { className: 'form-control', type: 'text', placeholder: 'Search products...', style: 'flex:1;min-width:200px;' });
        searchInput.value = searchTerm;
        searchInput.addEventListener('input', (e) => { searchTerm = e.target.value; renderGrid(); });
        header.appendChild(searchInput);

        const chips = el('div', { className: 'chip-group' });
        ['All', 'Chicken', 'Egg', 'Condiments'].forEach(cat => {
            const chip = el('button', { className: `chip${(cat === 'All' && !selectedCategory) || selectedCategory === cat ? ' active' : ''}`, textContent: cat });
            chip.addEventListener('click', () => { selectedCategory = cat === 'All' ? '' : cat; renderCatalog(); });
            chips.appendChild(chip);
        });
        header.appendChild(chips);
        catalog.appendChild(header);

        // Grid
        const grid = el('div', { className: 'pos-catalog-grid', id: 'pos-grid' });
        catalog.appendChild(grid);

        if (!layout.contains(catalog)) layout.appendChild(catalog);
        renderGrid();
    }

    function renderGrid() {
        const grid = $('#pos-grid');
        if (!grid) return;
        grid.innerHTML = '';

        getFilteredProducts().forEach(product => {
            const cartItem = cart.find(i => i.productId === product._id);
            const cartQty = cartItem ? cartItem.quantity : 0;
            const remaining = product.quantity - cartQty;
            const oos = remaining <= 0;

            const card = el('div', { className: `product-card${oos ? ' product-card--oos' : ''}` });
            card.addEventListener('click', () => { if (!oos) addToCart(product); });

            const imgDiv = el('div', { className: 'product-card-image' });
            if (product.imageUrl) {
                imgDiv.innerHTML = `<img src="${product.imageUrl}" alt="" class="${oos ? 'grayscale' : ''}">`;
            } else {
                imgDiv.textContent = categoryEmoji(product.category);
            }
            if (oos) {
                imgDiv.innerHTML += `<div class="product-card-oos-stamp"><span>Out of Stock</span></div>`;
            }
            card.appendChild(imgDiv);
            card.innerHTML += `<div class="product-card-name">${product.productName}</div><div class="product-card-meta"><span class="product-card-stock">Stock: ${remaining}</span><span class="product-card-cat">${product.category}</span></div><div class="product-card-footer"><span class="product-card-price">${formatCurrency(product.sellingPrice)}</span><div class="product-card-add${oos ? ' disabled' : ''}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></div></div>`;

            grid.appendChild(card);
        });
    }

    function addToCart(product) {
        const existing = cart.find(i => i.productId === product._id);
        if (existing) {
            if (existing.quantity + 1 > product.quantity) return;
            existing.quantity++;
        } else {
            cart.push({
                productId: product._id, productName: product.productName,
                price: product.sellingPrice, quantity: 1, stock: product.quantity,
                imageUrl: product.imageUrl, category: product.category
            });
        }
        renderCart();
        renderGrid();
    }

    function renderCart() {
        let cartEl = layout.querySelector('.pos-cart');
        if (!cartEl) { cartEl = el('div', { className: 'pos-cart' }); layout.appendChild(cartEl); }
        cartEl.innerHTML = '';

        const subtotal = cart.reduce((t, i) => t + i.price * i.quantity, 0);
        const tax = subtotal * (taxRate / 100);
        const total = subtotal + tax;

        // Header
        const header = el('div', { className: 'pos-cart-header' });
        header.innerHTML = `<h2><svg style="width:20px;height:20px;color:var(--slate-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>Order Items<span class="cart-count">${cart.length}</span></h2>`;
        const clearBtn = el('button', { className: 'btn btn-ghost btn-sm', textContent: 'Clear', style: 'color:var(--red-500);font-size:.75rem;' });
        clearBtn.addEventListener('click', () => { cart = []; renderCart(); renderGrid(); });
        header.appendChild(clearBtn);
        cartEl.appendChild(header);

        // Items
        const itemsDiv = el('div', { className: 'pos-cart-items' });
        if (cart.length === 0) {
            itemsDiv.innerHTML = `<div class="pos-cart-empty"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg><p class="font-semibold text-sm">Cart is empty</p><p class="text-xs mt-2">Click + to add items</p></div>`;
        } else {
            cart.forEach(item => {
                const ci = el('div', { className: 'cart-item' });
                const imgHtml = item.imageUrl ? `<img src="${item.imageUrl}" alt="">` : categoryEmoji(item.category);
                ci.innerHTML = `<div class="cart-item-img">${typeof imgHtml === 'string' && imgHtml.startsWith('<') ? imgHtml : ''}</div><div class="cart-item-body"><div class="cart-item-top"><div class="cart-item-name">${item.productName}</div></div><div class="cart-item-bottom"><span class="cart-item-price">${formatCurrency(item.price)}</span><div class="cart-item-qty"></div></div></div>`;

                if (!item.imageUrl) ci.querySelector('.cart-item-img').textContent = categoryEmoji(item.category);

                // Remove button
                const removeBtn = el('button', { className: 'cart-item-remove', innerHTML: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' });
                removeBtn.addEventListener('click', () => { cart = cart.filter(i => i.productId !== item.productId); renderCart(); renderGrid(); });
                ci.querySelector('.cart-item-top').appendChild(removeBtn);

                // Qty controls
                const qtyDiv = ci.querySelector('.cart-item-qty');
                const minusBtn = el('button', { textContent: '-' });
                minusBtn.addEventListener('click', () => {
                    item.quantity--;
                    if (item.quantity <= 0) cart = cart.filter(i => i.productId !== item.productId);
                    renderCart(); renderGrid();
                });
                const plusBtn = el('button', { textContent: '+' });
                plusBtn.addEventListener('click', () => {
                    if (item.quantity < item.stock) { item.quantity++; renderCart(); renderGrid(); }
                });
                qtyDiv.appendChild(minusBtn);
                qtyDiv.appendChild(el('span', { textContent: item.quantity }));
                qtyDiv.appendChild(plusBtn);

                itemsDiv.appendChild(ci);
            });
        }
        cartEl.appendChild(itemsDiv);

        // Checkout
        const checkout = el('div', { className: 'pos-cart-checkout' });
        let checkoutHTML = '';
        if (taxRate > 0) {
            checkoutHTML += `<div class="checkout-row"><span class="checkout-label">Subtotal</span><span class="checkout-value">${formatCurrency(subtotal)}</span></div><div class="checkout-row" style="margin-bottom:.75rem;padding-bottom:.75rem;border-bottom:1px solid var(--slate-100);"><span class="checkout-label">Tax (${taxRate}%)</span><span class="checkout-value">${formatCurrency(tax)}</span></div>`;
        }
        checkoutHTML += `<div class="checkout-row" style="margin-bottom:1rem;"><span class="checkout-label">Total</span><span class="checkout-total-value">${formatCurrency(total)}</span></div>`;
        checkout.innerHTML = checkoutHTML;

        const completeBtn = el('button', { className: `btn btn-success btn-block${cart.length === 0 ? ' disabled' : ''}`, innerHTML: '<svg style="width:20px;height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg> Complete Sale' });
        completeBtn.addEventListener('click', () => { if (cart.length > 0) showConfirmSaleModal(subtotal, tax, total); });
        checkout.appendChild(completeBtn);
        cartEl.appendChild(checkout);
    }

    function showConfirmSaleModal(subtotal, tax, total) {
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-sm', style: 'text-align:center;' });
        modal.innerHTML = `<h2 style="font-size:1.25rem;font-weight:700;color:var(--slate-800);margin-bottom:.5rem;">Confirm Action</h2><p class="text-muted mb-4">Complete sale for a total of <b style="color:var(--slate-800);">${formatCurrency(total)}</b>? This action cannot be undone.</p>`;
        const actions = el('div', { style: 'display:flex;gap:.75rem;justify-content:center;' });
        const cancelBtn = el('button', { className: 'btn btn-outline', textContent: 'Cancel' });
        cancelBtn.addEventListener('click', () => overlay.remove());
        const confirmBtn = el('button', { className: 'btn btn-blue', textContent: 'Confirm' });
        confirmBtn.addEventListener('click', async () => {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Processing...';
            try {
                const payload = {
                    items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
                    subtotalAmount: subtotal, taxAmount: tax, totalAmount: total
                };
                const data = await API.post('/api/sales.php', payload);
                overlay.remove();
                if (data.sale) {
                    showReceiptModal({
                        saleId: data.sale._id ? data.sale._id.substring(0, 8) : 'N/A',
                        date: new Date().toLocaleString(),
                        items: [...cart], subtotalAmount: subtotal, taxAmount: tax, taxRate, total
                    });
                    cart = [];
                    loadData();
                }
            } catch { overlay.remove(); showAlert('error', 'Failed to record sale'); }
        });
        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        modal.appendChild(actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function showReceiptModal(receipt) {
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-sm' });
        let html = `<div class="receipt"><div class="receipt-brand">Sunny & Scramble</div><p class="receipt-subtitle">Official Receipt</p><div class="receipt-divider"></div><div class="receipt-meta"><p><span>Sale ID:</span> ${receipt.saleId}</p><p><span>Date:</span> ${receipt.date}</p><p><span>Cashier:</span> ${currentUser?.fullName || 'Admin'}</p></div><div class="receipt-divider"></div><table class="receipt-table"><thead><tr><th class="text-left">Item</th><th class="text-center">Qty</th><th class="text-right">Total</th></tr></thead><tbody>`;
        receipt.items.forEach(i => {
            html += `<tr><td class="text-left" style="max-width:150px;" class="truncate">${i.productName}</td><td class="text-center">${i.quantity}</td><td class="text-right">${(i.price * i.quantity).toFixed(2)}</td></tr>`;
        });
        html += `</tbody></table>`;
        if (receipt.taxAmount > 0) {
            html += `<div class="checkout-row"><span>Subtotal:</span><span>${formatCurrency(receipt.subtotalAmount)}</span></div><div class="checkout-row"><span>Tax (${receipt.taxRate}%):</span><span>${formatCurrency(receipt.taxAmount)}</span></div>`;
        }
        html += `<div class="receipt-divider"></div><div class="checkout-row receipt-total-row"><span>Total:</span><span>${formatCurrency(receipt.total)}</span></div><div class="receipt-divider"></div><p class="text-muted" style="margin:1rem 0;">Thank you for your purchase!</p></div>`;

        const actions = `<div style="display:flex;gap:.75rem;justify-content:center;"><button class="btn btn-outline" id="receipt-close">Close</button><button class="btn btn-blue" id="receipt-print"><svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg> Print Receipt</button></div>`;
        modal.innerHTML = html + actions;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.querySelector('#receipt-close').addEventListener('click', () => overlay.remove());
        modal.querySelector('#receipt-print').addEventListener('click', () => printReceipt(receipt));
    }

    function printReceipt(receipt) {
        if (!window.jspdf) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
        doc.setFont('courier', 'bold'); doc.setFontSize(12);
        doc.text('Sunny & Scramble', 40, 15, { align: 'center' });
        doc.setFont('courier', 'normal'); doc.setFontSize(10);
        doc.text('Official Receipt', 40, 20, { align: 'center' });
        doc.text('----------------------------------------', 40, 25, { align: 'center' });
        doc.setFontSize(9);
        doc.text(`Sale ID: ${receipt.saleId}`, 5, 30);
        doc.text(`Date: ${receipt.date}`, 5, 35);
        doc.text(`Cashier: ${currentUser?.fullName || 'Admin'}`, 5, 40);
        doc.text('----------------------------------------', 40, 45, { align: 'center' });
        doc.setFont('courier', 'bold');
        doc.text('Item', 5, 50); doc.text('Qty', 55, 50, { align: 'center' }); doc.text('Total', 75, 50, { align: 'right' });
        doc.setFont('courier', 'normal');
        let y = 55;
        receipt.items.forEach(item => {
            let name = item.productName;
            if (name.length > 20) name = name.substring(0, 17) + '...';
            doc.text(name, 5, y);
            doc.text(item.quantity.toString(), 55, y, { align: 'center' });
            doc.text((item.price * item.quantity).toFixed(2), 75, y, { align: 'right' });
            y += 5;
        });
        doc.text('----------------------------------------', 40, y, { align: 'center' }); y += 5;
        if (receipt.taxAmount > 0) {
            doc.text('SUBTOTAL:', 5, y); doc.text(`P ${receipt.subtotalAmount.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
            doc.text(`TAX (${receipt.taxRate}%):`, 5, y); doc.text(`P ${receipt.taxAmount.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
        }
        doc.setFont('courier', 'bold');
        doc.text('TOTAL:', 5, y); doc.text(`P ${receipt.total.toFixed(2)}`, 75, y, { align: 'right' });
        y += 10;
        doc.setFont('courier', 'normal'); doc.setFontSize(8);
        doc.text('Thank you for your purchase!', 40, y, { align: 'center' });
        window.open(doc.output('bloburl'), '_blank');
    }

    loadData();
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════
async function renderInventory(container) {
    let products = [], config = {}, page = 1, perPage = 10;
    let search = '', catFilter = '', statusFilter = 'active';

    const card = el('div', { className: 'card' });
    container.appendChild(card);

    const loadData = async () => {
        try {
            const [p, c] = await Promise.all([API.get('/api/products.php'), API.get('/api/config.php')]);
            products = p || [];
            config = c || {};
            renderTable();
        } catch { showAlert('error', 'Failed to load inventory'); }
    };

    function getFiltered() {
        return products.filter(p => {
            const ms = p.productName.toLowerCase().includes(search.toLowerCase());
            const mc = catFilter ? p.category === catFilter : true;
            let mst = true;
            if (statusFilter === 'active') mst = p.status !== 'archived';
            else if (statusFilter === 'archived') mst = p.status === 'archived';
            return ms && mc && mst;
        });
    }

    function renderTable() {
        card.innerHTML = '';

        // Header
        const header = el('div', { className: 'card-header' });
        header.innerHTML = `<div class="flex items-center gap-3"><div class="card-header-icon" style="background:var(--blue-50);"><svg style="color:var(--blue-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg></div><div><div class="card-header-title">Inventory Master List</div><div class="card-header-subtitle">Manage products and manual stock adjustments</div></div></div>`;
        const addBtn = el('button', { className: 'btn btn-primary', innerHTML: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Add Product' });
        addBtn.addEventListener('click', () => showProductModal());
        header.appendChild(addBtn);
        card.appendChild(header);

        // Filters
        const filterBar = el('div', { className: 'filter-bar' });
        const searchInput = el('input', { className: 'form-control', type: 'text', placeholder: 'Search catalog...', style: 'flex:1;' });
        searchInput.value = search;
        searchInput.addEventListener('input', e => { search = e.target.value; page = 1; renderTable(); });
        const catSel = el('select', { className: 'form-control', style: 'width:auto;' });
        [{v:'',l:'All Categories'},{v:'Chicken',l:'Chicken'},{v:'Egg',l:'Egg'},{v:'Condiments',l:'Condiments'},{v:'Pantry Staples',l:'Pantry Staples'}].forEach(o => {
            const opt = el('option', { value: o.v, textContent: o.l }); if (o.v === catFilter) opt.selected = true; catSel.appendChild(opt);
        });
        catSel.addEventListener('change', () => { catFilter = catSel.value; page = 1; renderTable(); });
        const statusSel = el('select', { className: 'form-control', style: 'width:auto;' });
        [{v:'all',l:'All Status'},{v:'active',l:'Active'},{v:'archived',l:'Archived'}].forEach(o => {
            const opt = el('option', { value: o.v, textContent: o.l }); if (o.v === statusFilter) opt.selected = true; statusSel.appendChild(opt);
        });
        statusSel.addEventListener('change', () => { statusFilter = statusSel.value; page = 1; renderTable(); });
        filterBar.appendChild(searchInput); filterBar.appendChild(catSel); filterBar.appendChild(statusSel);
        card.appendChild(filterBar);

        // Table
        const filtered = getFiltered();
        const totalPages = Math.ceil(filtered.length / perPage);
        const startIdx = (page - 1) * perPage;
        const paginated = filtered.slice(startIdx, startIdx + perPage);
        const threshold = config.lowStockThreshold || 20;

        const tableWrap = el('div', { className: 'table-wrapper' });
        let tHtml = `<table class="data-table"><thead><tr><th style="width:48px;">Img</th><th>Product Name</th><th>Category</th><th>Price</th><th>Exp. Date</th><th style="width:200px;">Stock Level</th><th class="text-center">Status</th><th class="text-right">Actions</th></tr></thead><tbody>`;
        if (paginated.length === 0) {
            tHtml += `<tr><td colspan="8" class="text-center text-muted" style="padding:2rem;">No products found.</td></tr>`;
        } else {
            paginated.forEach(p => {
                const cap = p.maxCapacity || 100;
                const pct = Math.min((p.quantity / cap) * 100, 100);
                let barClass = 'stock-high';
                if (pct <= threshold) barClass = 'stock-low';
                else if (pct <= 50) barClass = 'stock-mid';

                const expWarning = p.expirationDate && new Date(p.expirationDate) < new Date(Date.now() + 7 * 86400000);
                const imgCell = p.imageUrl ? `<div style="width:40px;height:40px;border-radius:8px;overflow:hidden;"><img src="${p.imageUrl}" style="width:100%;height:100%;object-fit:cover;"></div>` : `<div style="width:40px;height:40px;border-radius:8px;background:var(--slate-100);display:flex;align-items:center;justify-content:center;">📦</div>`;

                let statusBadge = '';
                if (p.status === 'archived') statusBadge = '<span class="badge badge-archived">Archived</span>';
                else if (p.quantity > 0) statusBadge = '<span class="badge badge-active">Active</span>';
                else statusBadge = '<span class="badge badge-oos">Out of Stock</span>';

                tHtml += `<tr>
                    <td>${imgCell}</td>
                    <td class="font-semibold">${p.productName}</td>
                    <td class="text-muted">${p.category}</td>
                    <td class="font-semibold">${formatCurrency(p.sellingPrice)}</td>
                    <td>${p.expirationDate ? `<span style="${expWarning ? 'color:var(--rose-600);font-weight:700;' : ''}">${formatDate(p.expirationDate)}</span>` : 'N/A'}</td>
                    <td><div style="display:flex;justify-content:space-between;font-size:.6875rem;margin-bottom:4px;"><span class="font-semibold">${p.quantity} <span class="text-muted" style="font-weight:400;">/ ${cap}</span></span><span class="text-muted">${Math.round(pct)}%</span></div><div class="stock-bar-track"><div class="stock-bar-fill ${barClass}" style="width:${pct}%;"></div></div></td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-right"><div style="display:flex;justify-content:flex-end;gap:.5rem;"><button class="btn btn-ghost btn-sm" data-action="history" data-id="${p._id}" title="History"><svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></button><button class="btn btn-ghost btn-sm" data-action="adjust" data-id="${p._id}">Adjust</button><button class="btn btn-ghost btn-sm" data-action="edit" data-id="${p._id}">Edit</button></div></td>
                </tr>`;
            });
        }
        tHtml += '</tbody></table>';
        tableWrap.innerHTML = tHtml;

        // Event delegation for action buttons
        tableWrap.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const id = btn.dataset.id;
            const prod = products.find(p => p._id === id);
            if (!prod) return;
            if (btn.dataset.action === 'edit') showProductModal(prod);
            if (btn.dataset.action === 'adjust') showAdjustModal(prod);
            if (btn.dataset.action === 'history') showHistoryModal(prod);
        });

        card.appendChild(tableWrap);

        // Pagination
        if (filtered.length > 0) {
            renderPagination(card, {
                currentPage: page, totalPages, totalItems: filtered.length, itemsPerPage: perPage,
                onPageChange: (p) => { page = p; renderTable(); },
                onItemsPerPageChange: (v) => { perPage = v; page = 1; renderTable(); }
            });
        }
    }

    function showProductModal(product = null) {
        const isEdit = !!product;
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-lg' });
        modal.innerHTML = `<div class="modal-header"><h2>${isEdit ? 'Edit Product' : 'Add New Product'}</h2><button class="modal-close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <form id="product-form">
            <div class="form-group"><label>Product Name</label><input class="form-control" name="productName" value="${isEdit ? product.productName : ''}" required></div>
            <div class="form-group"><label>Category</label><select class="form-control" name="category"><option value="Chicken"${isEdit && product.category==='Chicken'?' selected':''}>Chicken</option><option value="Egg"${isEdit && product.category==='Egg'?' selected':''}>Egg</option><option value="Condiments"${isEdit && product.category==='Condiments'?' selected':''}>Condiments</option><option value="Pantry Staples"${isEdit && product.category==='Pantry Staples'?' selected':''}>Pantry Staples</option></select></div>
            <div class="form-row"><div class="form-group"><label>Expiration Date</label><input class="form-control" name="expirationDate" type="date" value="${isEdit && product.expirationDate ? new Date(product.expirationDate).toISOString().split('T')[0] : ''}"></div><div class="form-group"><label>Max Capacity</label><input class="form-control" name="maxCapacity" type="number" value="${isEdit ? (product.maxCapacity||100) : 100}" required></div></div>
            <div class="form-group"><label>Image URL (Optional)</label><input class="form-control" name="imageUrl" value="${isEdit ? (product.imageUrl||'') : ''}" placeholder="https://example.com/image.jpg"></div>
            <div class="form-row"><div class="form-group"><label>Unit Cost (₱)</label><input class="form-control" name="unitCost" type="number" step="0.01" value="${isEdit ? product.unitCost : ''}" required></div><div class="form-group"><label>Selling Price (₱)</label><input class="form-control" name="sellingPrice" type="number" step="0.01" value="${isEdit ? product.sellingPrice : ''}" required></div></div>
            ${isEdit ? `<div class="form-group"><label>Status</label><select class="form-control" name="status"><option value="active"${product.status==='active'?' selected':''}>Active</option><option value="archived"${product.status==='archived'?' selected':''}${product.quantity>0?' disabled':''}>Archived${product.quantity>0?' (Requires 0 stock)':''}</option></select></div>` : ''}
            <div class="form-actions"><button type="button" class="btn btn-outline flex-1 modal-cancel">Cancel</button><button type="submit" class="btn btn-primary flex-1">${isEdit ? 'Save Changes' : 'Save Product'}</button></div>
        </form>`;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        modal.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());

        modal.querySelector('#product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const data = Object.fromEntries(fd);
            try {
                if (isEdit) { await API.put(`/api/products.php?id=${product._id}`, data); }
                else { await API.post('/api/products.php', data); }
                overlay.remove();
                showAlert('success', isEdit ? 'Product updated.' : 'Product added.');
                loadData();
            } catch { showAlert('error', 'Failed to save product.'); }
        });
    }

    function showAdjustModal(product) {
        let adjustType = 'stock-out';
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-md' });

        const render = () => {
            modal.innerHTML = `<div style="margin-bottom:1.5rem;"><h2 style="font-size:1.25rem;font-weight:700;">Adjust Stock: <span style="color:var(--blue-600);">${product.productName}</span></h2><p class="text-muted mt-2">Current Stock: <b style="color:var(--slate-800);">${product.quantity}</b></p></div>
            <form id="adjust-form">
                <div class="toggle-group mb-4"><button type="button" class="toggle-btn ${adjustType==='stock-out'?'active-decrease':''}" data-type="stock-out"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 12H4"/></svg> Decrease</button><button type="button" class="toggle-btn ${adjustType==='stock-in'?'active-increase':''}" data-type="stock-in"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg> Increase</button></div>
                <div class="form-group" style="position:relative;"><label style="position:absolute;top:-10px;left:12px;background:#fff;padding:0 6px;font-size:.75rem;font-weight:600;color:var(--blue-600);">Quantity to Adjust</label><input class="form-control" name="quantity" type="number" min="1" required style="border:2px solid var(--blue-500);padding:.875rem 1rem;"></div>
                <div class="form-group"><textarea class="form-control" name="reason" placeholder="Reason for Adjustment" required style="resize:none;height:96px;"></textarea></div>
                <div class="form-actions" style="justify-content:flex-end;"><button type="button" class="btn btn-outline modal-cancel">Cancel</button><button type="submit" class="btn ${adjustType==='stock-out'?'btn-danger':'btn-success'}" style="display:flex;align-items:center;gap:.5rem;">${adjustType==='stock-out'?'<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 12H4"/></svg>':'<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>'} Submit Adjustment</button></div>
            </form>`;

            modal.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => { adjustType = btn.dataset.type; render(); });
            });
            modal.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
            modal.querySelector('#adjust-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                try {
                    await API.post('/api/inventory.php', {
                        productId: product._id, type: adjustType,
                        quantity: Number(fd.get('quantity')),
                        reason: `[Adjustment] ${fd.get('reason')}`
                    });
                    overlay.remove();
                    showAlert('success', `Stock adjusted for ${product.productName}.`);
                    loadData();
                } catch { showAlert('error', 'Failed to record adjustment.'); }
            });
        };

        render();
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    async function showHistoryModal(product) {
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-xl', style: 'max-height:90vh;display:flex;flex-direction:column;' });
        modal.innerHTML = `<div class="modal-header"><h2>Movement History: <span style="color:var(--blue-600);">${product.productName}</span></h2><button class="modal-close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div><div style="flex:1;overflow-y:auto;"><p class="text-muted text-center" style="padding:2rem;">Loading history...</p></div>`;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());

        try {
            const history = await API.get(`/api/inventory.php?productId=${product._id}`);
            const bodyEl = modal.querySelector('div:nth-child(2)');
            if (!history || history.length === 0) {
                bodyEl.innerHTML = '<p class="text-muted text-center" style="padding:2rem;">No movement history found.</p>';
                return;
            }
            let tHtml = `<table class="data-table"><thead><tr><th>Date</th><th>Type</th><th class="text-center">Change</th><th class="text-center">Before</th><th class="text-center">After</th><th>Recorded By</th><th>Notes</th></tr></thead><tbody>`;
            history.forEach(r => {
                const typeBadge = r.type === 'Delivery' ? 'badge-delivery' : r.type === 'Sale' ? 'badge-sale' : r.type === 'Spoilage' ? 'badge-spoilage' : 'badge-adjustment';
                tHtml += `<tr><td class="text-muted" style="white-space:nowrap;">${formatDateTime(r.date)}</td><td><span class="badge ${typeBadge}">${r.type}</span></td><td class="text-center font-bold" style="color:${r.change>0?'var(--emerald-600)':'var(--red-600)'};">${r.change>0?'+':''}${r.change}</td><td class="text-center text-muted">${r.stockBefore}</td><td class="text-center font-bold">${r.stockAfter}</td><td class="text-muted">${r.recordedBy}</td><td class="text-muted text-xs truncate" style="max-width:200px;" title="${r.notes||''}">${r.notes||''}</td></tr>`;
            });
            tHtml += '</tbody></table>';
            bodyEl.innerHTML = tHtml;
        } catch { modal.querySelector('div:nth-child(2)').innerHTML = '<p class="text-muted text-center" style="padding:2rem;">Failed to load history.</p>'; }
    }

    loadData();
}

// ═══════════════════════════════════════════════════════════════
// DELIVERIES
// ═══════════════════════════════════════════════════════════════
async function renderDeliveries(container) {
    const card = el('div', { className: 'card' });
    container.appendChild(card);

    const loadData = async () => {
        try {
            const [deliveries, products, suppliers] = await Promise.all([
                API.get('/api/deliveries.php'),
                API.get('/api/products.php'),
                API.get('/api/suppliers.php')
            ]);
            renderContent(deliveries || [], products || [], suppliers || []);
        } catch { showAlert('error', 'Failed to load deliveries'); }
    };

    function renderContent(deliveries, products, suppliers) {
        card.innerHTML = '';
        const header = el('div', { className: 'card-header' });
        header.innerHTML = `<div class="flex items-center gap-3"><div class="card-header-icon" style="background:var(--emerald-50);"><svg style="color:var(--emerald-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div><div><div class="card-header-title">Deliveries & Expenses</div><div class="card-header-subtitle">Track incoming stock and costs</div></div></div>`;
        const addBtn = el('button', { className: 'btn btn-primary', innerHTML: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> New Delivery' });
        addBtn.addEventListener('click', () => showDeliveryModal(products, suppliers));
        header.appendChild(addBtn);
        card.appendChild(header);

        const tableWrap = el('div', { className: 'table-wrapper' });
        let tHtml = `<table class="data-table"><thead><tr><th>Date</th><th>Product</th><th>Supplier</th><th>Ref No.</th><th class="text-center">Qty</th><th class="text-right">Unit Cost</th><th class="text-right">Total</th></tr></thead><tbody>`;
        if (deliveries.length === 0) {
            tHtml += '<tr><td colspan="7" class="text-center text-muted" style="padding:2rem;">No deliveries recorded yet.</td></tr>';
        } else {
            deliveries.forEach(d => {
                tHtml += `<tr><td class="text-muted">${formatDateTime(d.createdAt)}</td><td class="font-semibold">${d.productName}</td><td class="text-muted">${d.supplierName}</td><td class="text-muted">${d.referenceNo || '—'}</td><td class="text-center">${d.quantity}</td><td class="text-right">${formatCurrency(d.unitCost)}</td><td class="text-right font-semibold">${formatCurrency(d.totalCost)}</td></tr>`;
            });
        }
        tHtml += '</tbody></table>';
        tableWrap.innerHTML = tHtml;
        card.appendChild(tableWrap);
    }

    function showDeliveryModal(products, suppliers) {
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-md' });
        let prodOpts = products.filter(p=>p.status!=='archived').map(p => `<option value="${p._id}">${p.productName}</option>`).join('');
        let supOpts = suppliers.filter(s=>s.status==='active').map(s => `<option value="${s._id}">${s.supplierName}</option>`).join('');

        modal.innerHTML = `<div class="modal-header"><h2>Record New Delivery</h2><button class="modal-close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <form id="delivery-form">
            <div class="form-group"><label>Product</label><select class="form-control" name="productId" required>${prodOpts}</select></div>
            <div class="form-group"><label>Supplier</label><select class="form-control" name="supplierId" required>${supOpts}</select></div>
            <div class="form-group"><label>Reference No.</label><input class="form-control" name="referenceNo" placeholder="e.g. DEL-001"></div>
            <div class="form-row"><div class="form-group"><label>Quantity</label><input class="form-control" name="quantity" type="number" min="1" required></div><div class="form-group"><label>Unit Cost (₱)</label><input class="form-control" name="unitCost" type="number" step="0.01" required></div></div>
            <div class="form-group"><label>Total Cost (₱)</label><input class="form-control" name="totalCost" type="number" step="0.01" required readonly></div>
            <div class="form-actions"><button type="button" class="btn btn-outline flex-1 modal-cancel">Cancel</button><button type="submit" class="btn btn-primary flex-1">Save Delivery</button></div>
        </form>`;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        modal.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());

        const qtyInput = modal.querySelector('[name="quantity"]');
        const costInput = modal.querySelector('[name="unitCost"]');
        const totalInput = modal.querySelector('[name="totalCost"]');
        const calcTotal = () => { totalInput.value = ((Number(qtyInput.value) || 0) * (Number(costInput.value) || 0)).toFixed(2); };
        qtyInput.addEventListener('input', calcTotal);
        costInput.addEventListener('input', calcTotal);

        modal.querySelector('#delivery-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await API.post('/api/deliveries.php', Object.fromEntries(fd));
                overlay.remove();
                showAlert('success', 'Delivery recorded successfully.');
                loadData();
            } catch { showAlert('error', 'Failed to record delivery.'); }
        });
    }

    loadData();
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTIONS & CUSTOMER RETURNS
// ═══════════════════════════════════════════════════════════════
async function renderTransactions(container) {
    const tabsBar = el('div', { className: 'tabs-bar' });
    const salesTab = el('button', { className: 'tab-btn active', innerHTML: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> Sales History' });
    const returnsTab = el('button', { className: 'tab-btn', innerHTML: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H4m0 0l3-3m-3 3l3 3m5 4v1a4 4 0 004 4h8m0 0l-3-3m3 3l-3 3"/></svg> Customer Returns' });
    tabsBar.appendChild(salesTab);
    tabsBar.appendChild(returnsTab);
    container.appendChild(tabsBar);

    const contentArea = el('div');
    container.appendChild(contentArea);

    let activeTab = 'sales';

    salesTab.addEventListener('click', () => {
        if (activeTab === 'sales') return;
        activeTab = 'sales';
        salesTab.classList.add('active');
        returnsTab.classList.remove('active');
        renderSalesHistory();
    });

    returnsTab.addEventListener('click', () => {
        if (activeTab === 'returns') return;
        activeTab = 'returns';
        returnsTab.classList.add('active');
        salesTab.classList.remove('active');
        renderCustomerReturns();
    });

    async function renderSalesHistory() {
        contentArea.innerHTML = '<div class="page-loader"><div class="spinner spinner-dark"></div><p class="font-semibold text-sm">Loading transactions...</p></div>';
        try {
            const sales = await API.get('/api/sales.php');
            contentArea.innerHTML = '';
            const card = el('div', { className: 'card' });
            const header = el('div', { className: 'card-header' });
            header.innerHTML = `<div class="flex items-center gap-3"><div class="card-header-icon" style="background:var(--blue-50);"><svg style="color:var(--blue-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div><div><div class="card-header-title">Transaction History</div><div class="card-header-subtitle">All sales records</div></div></div>`;
            card.appendChild(header);

            const tableWrap = el('div', { className: 'table-wrapper' });
            let tHtml = `<table class="data-table"><thead><tr><th>Sale ID</th><th>Date</th><th>Items</th><th class="text-right">Total</th><th>Cashier</th><th class="text-center">Actions</th></tr></thead><tbody>`;
            if (!sales || sales.length === 0) {
                tHtml += '<tr><td colspan="6" class="text-center text-muted" style="padding:2rem;">No transactions found.</td></tr>';
            } else {
                sales.forEach(s => {
                    const saleId = s._id ? s._id.substring(0, 8) : 'N/A';
                    const itemCount = s.items ? s.items.length : 0;
                    tHtml += `<tr><td class="font-semibold" style="font-family:monospace;">${saleId}</td><td class="text-muted">${formatDateTime(s.saleDate || s.createdAt)}</td><td>${itemCount} item(s)</td><td class="text-right font-bold">${formatCurrency(s.totalAmount)}</td><td class="text-muted">${s.recordedByName || 'System'}</td><td class="text-center"><button class="btn btn-ghost btn-sm" data-sale='${JSON.stringify(s).replace(/'/g,"&#39;")}'>View</button></td></tr>`;
                });
            }
            tHtml += '</tbody></table>';
            tableWrap.innerHTML = tHtml;

            tableWrap.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-sale]');
                if (btn) {
                    const sale = JSON.parse(btn.dataset.sale);
                    showSaleDetailModal(sale);
                }
            });
            card.appendChild(tableWrap);
            contentArea.appendChild(card);
        } catch { contentArea.innerHTML = '<div class="alert alert-error">Failed to load transactions.</div>'; }
    }

    async function renderCustomerReturns() {
        contentArea.innerHTML = '<div class="page-loader"><div class="spinner spinner-dark"></div><p class="font-semibold text-sm">Loading customer returns...</p></div>';
        try {
            const [returns, products] = await Promise.all([
                API.get('/api/customer_returns.php'),
                API.get('/api/products.php')
            ]);
            contentArea.innerHTML = '';
            const card = el('div', { className: 'card' });
            const header = el('div', { className: 'card-header' });
            header.innerHTML = `<div class="flex items-center gap-3"><div class="card-header-icon" style="background:var(--amber-50);"><svg style="color:var(--amber-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H4m0 0l3-3m-3 3l3 3m5 4v1a4 4 0 004 4h8m0 0l-3-3m3 3l-3 3"/></svg></div><div><div class="card-header-title">Customer Returns</div><div class="card-header-subtitle">Manage customer refunds and replacements</div></div></div>`;
            const addBtn = el('button', { className: 'btn btn-primary', innerHTML: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Process Return' });
            addBtn.addEventListener('click', () => showCustomerReturnModal(products || []));
            header.appendChild(addBtn);
            card.appendChild(header);

            const tableWrap = el('div', { className: 'table-wrapper' });
            let tHtml = `<table class="data-table"><thead><tr><th>Date</th><th>Customer</th><th>Product</th><th class="text-center">Qty</th><th>Reason</th><th>Action</th><th class="text-right">Refunded</th><th>Processed By</th></tr></thead><tbody>`;
            if (!returns || returns.length === 0) {
                tHtml += '<tr><td colspan="8" class="text-center text-muted" style="padding:2rem;">No customer returns recorded.</td></tr>';
            } else {
                returns.forEach(r => {
                    const actionBadge = r.action === 'Refunded' 
                        ? '<span class="badge badge-danger">Refunded</span>' 
                        : '<span class="badge badge-active">Replaced</span>';
                    tHtml += `<tr><td class="text-muted">${formatDateTime(r.createdAt)}</td><td class="font-semibold">${r.customerId || 'Walk-in'}</td><td>${r.productName || 'Unknown'}</td><td class="text-center font-bold">${r.quantity}</td><td class="text-muted">${r.reason}</td><td>${actionBadge}</td><td class="text-right font-semibold">${formatCurrency(r.amountRefunded || 0)}</td><td class="text-muted">${r.processedByName || 'System'}</td></tr>`;
                });
            }
            tHtml += '</tbody></table>';
            tableWrap.innerHTML = tHtml;
            card.appendChild(tableWrap);
            contentArea.appendChild(card);
        } catch { contentArea.innerHTML = '<div class="alert alert-error">Failed to load customer returns.</div>'; }
    }

    function showCustomerReturnModal(products) {
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-md' });
        let prodOptions = products.map(p => `<option value="${p._id}">${p.productName} (Stock: ${p.quantity})</option>`).join('');
        modal.innerHTML = `<div class="modal-header"><h2>Process Customer Return</h2><button class="modal-close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <form id="cust-return-form">
            <div class="form-group"><label>Product</label><select class="form-control" name="productId" required>${prodOptions}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Customer Name / Ref</label><input class="form-control" name="customerId" value="Walk-in" required></div>
                <div class="form-group"><label>Quantity</label><input class="form-control" name="quantity" type="number" min="1" value="1" required></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Reason</label><select class="form-control" name="reason"><option value="Defective">Defective</option><option value="Expired">Expired</option><option value="Wrong Item">Wrong Item</option><option value="Customer Change Mind">Customer Change Mind</option><option value="Other">Other</option></select></div>
                <div class="form-group"><label>Action</label><select class="form-control" name="action"><option value="Refunded">Refunded</option><option value="Replaced">Replaced (Deducts stock)</option></select></div>
            </div>
            <div class="form-group"><label>Amount Refunded (₱)</label><input class="form-control" name="amountRefunded" type="number" step="0.01" value="0.00"></div>
            <div class="form-group"><label>Notes</label><textarea class="form-control" name="notes" placeholder="Optional details..."></textarea></div>
            <div class="form-actions"><button type="button" class="btn btn-outline flex-1 modal-cancel">Cancel</button><button type="submit" class="btn btn-primary flex-1">Save Return</button></div>
        </form>`;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        modal.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());

        modal.querySelector('#cust-return-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                const res = await API.post('/api/customer_returns.php', Object.fromEntries(fd));
                overlay.remove();
                showAlert('success', res.message || 'Return recorded successfully.');
                renderCustomerReturns();
            } catch (err) { showAlert('error', 'Failed to process return.'); }
        });
    }

    function showSaleDetailModal(sale) {
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-md' });
        let html = `<div class="modal-header"><h2>Sale Detail</h2><button class="modal-close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>`;
        html += `<p class="text-muted mb-2">Sale ID: <b>${(sale._id||'').substring(0,8)}</b></p><p class="text-muted mb-4">Date: <b>${formatDateTime(sale.saleDate || sale.createdAt)}</b></p>`;
        html += `<table class="data-table mb-4"><thead><tr><th>Product</th><th class="text-center">Qty</th><th class="text-right">Price</th><th class="text-right">Subtotal</th></tr></thead><tbody>`;
        (sale.items||[]).forEach(i => {
            html += `<tr><td>${i.productName||'Unknown'}</td><td class="text-center">${i.quantity}</td><td class="text-right">${formatCurrency(i.price)}</td><td class="text-right font-semibold">${formatCurrency(i.price*i.quantity)}</td></tr>`;
        });
        html += `</tbody></table>`;
        if (sale.taxAmount > 0) {
            html += `<div class="checkout-row"><span>Subtotal:</span><span>${formatCurrency(sale.subtotalAmount)}</span></div><div class="checkout-row"><span>Tax:</span><span>${formatCurrency(sale.taxAmount)}</span></div>`;
        }
        html += `<div class="checkout-row receipt-total-row"><span>Total:</span><span>${formatCurrency(sale.totalAmount)}</span></div>`;
        html += `<div class="form-actions"><button class="btn btn-outline modal-cancel">Close</button></div>`;
        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        modal.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
    }

    renderSalesHistory();
}

// ═══════════════════════════════════════════════════════════════
// SPOILAGE
// ═══════════════════════════════════════════════════════════════
async function renderSpoilage(container) {
    const card = el('div', { className: 'card' });
    container.appendChild(card);

    const loadData = async () => {
        try {
            const [spoilages, products] = await Promise.all([
                API.get('/api/spoilages.php'),
                API.get('/api/products.php')
            ]);
            renderContent(spoilages || [], products || []);
        } catch { showAlert('error', 'Failed to load spoilage data'); }
    };

    function renderContent(spoilages, products) {
        card.innerHTML = '';
        const header = el('div', { className: 'card-header' });
        header.innerHTML = `<div class="flex items-center gap-3"><div class="card-header-icon" style="background:var(--red-50);"><svg style="color:var(--red-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div><div><div class="card-header-title">Spoilage & Adjustments</div><div class="card-header-subtitle">Track product losses and manual adjustments</div></div></div>`;
        const addBtn = el('button', { className: 'btn btn-danger', innerHTML: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Report Spoilage' });
        addBtn.addEventListener('click', () => showSpoilageModal(products));
        header.appendChild(addBtn);
        card.appendChild(header);

        const tableWrap = el('div', { className: 'table-wrapper' });
        let tHtml = `<table class="data-table"><thead><tr><th>Date</th><th>Product</th><th>Reason</th><th class="text-center">Qty</th><th class="text-right">Cost</th><th>Reported By</th></tr></thead><tbody>`;
        if (spoilages.length === 0) {
            tHtml += '<tr><td colspan="6" class="text-center text-muted" style="padding:2rem;">No spoilage records.</td></tr>';
        } else {
            spoilages.forEach(s => {
                tHtml += `<tr><td class="text-muted">${formatDateTime(s.createdAt)}</td><td class="font-semibold">${s.productName}</td><td class="text-muted">${s.reason || '—'}</td><td class="text-center">${s.quantity}</td><td class="text-right font-semibold" style="color:var(--red-600);">${formatCurrency(s.cost)}</td><td class="text-muted">${s.reportedByName || 'System'}</td></tr>`;
            });
        }
        tHtml += '</tbody></table>';
        tableWrap.innerHTML = tHtml;
        card.appendChild(tableWrap);
    }

    function showSpoilageModal(products) {
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-md' });
        const activeProducts = products.filter(p => p.status !== 'archived' && p.quantity > 0);
        let prodOpts = activeProducts.map(p => `<option value="${p._id}">${p.productName} (Stock: ${p.quantity})</option>`).join('');
        modal.innerHTML = `<div class="modal-header"><h2>Report Spoilage</h2><button class="modal-close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <form id="spoilage-form">
            <div class="form-group"><label>Product</label><select class="form-control" name="productId" required>${prodOpts}</select></div>
            <div class="form-row"><div class="form-group"><label>Quantity</label><input class="form-control" name="quantity" type="number" min="1" required></div><div class="form-group"><label>Reason</label><select class="form-control" name="reason" required><option value="Expired">Expired</option><option value="Damaged">Damaged</option><option value="Spilled">Spilled</option><option value="Staff Meal">Staff Meal</option><option value="Other">Other</option></select></div></div>
            <div class="form-group"><label>Notes (Optional)</label><textarea class="form-control" name="notes" placeholder="Additional details..."></textarea></div>
            <div class="form-actions"><button type="button" class="btn btn-outline flex-1 modal-cancel">Cancel</button><button type="submit" class="btn btn-danger flex-1">Record Spoilage</button></div>
        </form>`;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        modal.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());

        modal.querySelector('#spoilage-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await API.post('/api/spoilages.php', Object.fromEntries(fd));
                overlay.remove();
                showAlert('success', 'Spoilage recorded.');
                loadData();
            } catch { showAlert('error', 'Failed to record spoilage.'); }
        });
    }

    loadData();
}

// ═══════════════════════════════════════════════════════════════
// SUPPLIERS & RETURN TO SUPPLIER (RTS)
// ═══════════════════════════════════════════════════════════════
async function renderSuppliers(container) {
    const tabsBar = el('div', { className: 'tabs-bar' });
    const dirTab = el('button', { className: 'tab-btn active', innerHTML: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Supplier Directory' });
    const rtsTab = el('button', { className: 'tab-btn', innerHTML: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg> Return to Supplier (RTS)' });
    tabsBar.appendChild(dirTab);
    tabsBar.appendChild(rtsTab);
    container.appendChild(tabsBar);

    const contentArea = el('div');
    container.appendChild(contentArea);

    let activeTab = 'directory';

    dirTab.addEventListener('click', () => {
        if (activeTab === 'directory') return;
        activeTab = 'directory';
        dirTab.classList.add('active');
        rtsTab.classList.remove('active');
        renderSupplierDirectory();
    });

    rtsTab.addEventListener('click', () => {
        if (activeTab === 'rts') return;
        activeTab = 'rts';
        rtsTab.classList.add('active');
        dirTab.classList.remove('active');
        renderSupplierReturns();
    });

    async function renderSupplierDirectory() {
        contentArea.innerHTML = '<div class="page-loader"><div class="spinner spinner-dark"></div><p class="font-semibold text-sm">Loading suppliers...</p></div>';
        try {
            const suppliers = await API.get('/api/suppliers.php');
            contentArea.innerHTML = '';
            const card = el('div', { className: 'card' });
            const header = el('div', { className: 'card-header' });
            header.innerHTML = `<div class="flex items-center gap-3"><div class="card-header-icon" style="background:var(--purple-50);"><svg style="color:var(--purple-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div><div><div class="card-header-title">Suppliers</div><div class="card-header-subtitle">Manage your supply chain partners</div></div></div>`;
            const addBtn = el('button', { className: 'btn btn-primary', innerHTML: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Add Supplier' });
            addBtn.addEventListener('click', () => showSupplierModal());
            header.appendChild(addBtn);
            card.appendChild(header);

            const tableWrap = el('div', { className: 'table-wrapper' });
            let tHtml = `<table class="data-table"><thead><tr><th>Supplier Name</th><th>Contact</th><th>Contact Person</th><th>Payment Terms</th><th class="text-center">Status</th><th class="text-right">Actions</th></tr></thead><tbody>`;
            if (!suppliers || suppliers.length === 0) {
                tHtml += '<tr><td colspan="6" class="text-center text-muted" style="padding:2rem;">No suppliers found.</td></tr>';
            } else {
                suppliers.forEach(s => {
                    const statusBadge = s.status === 'active' ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-archived">Inactive</span>';
                    tHtml += `<tr><td class="font-semibold">${s.supplierName}</td><td class="text-muted">${s.contact}</td><td class="text-muted">${s.contactPerson || '—'}</td><td class="text-muted">${s.paymentTerms || 'COD'}</td><td class="text-center">${statusBadge}</td><td class="text-right"><button class="btn btn-ghost btn-sm" data-action="edit" data-id="${s._id}">Edit</button></td></tr>`;
                });
            }
            tHtml += '</tbody></table>';
            tableWrap.innerHTML = tHtml;

            tableWrap.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action="edit"]');
                if (btn) {
                    const sup = suppliers.find(s => s._id === btn.dataset.id);
                    if (sup) showSupplierModal(sup);
                }
            });
            card.appendChild(tableWrap);
            contentArea.appendChild(card);
        } catch { contentArea.innerHTML = '<div class="alert alert-error">Failed to load suppliers.</div>'; }
    }

    async function renderSupplierReturns() {
        contentArea.innerHTML = '<div class="page-loader"><div class="spinner spinner-dark"></div><p class="font-semibold text-sm">Loading supplier returns...</p></div>';
        try {
            const [returns, suppliers, products] = await Promise.all([
                API.get('/api/supplier_returns.php'),
                API.get('/api/suppliers.php'),
                API.get('/api/products.php')
            ]);
            contentArea.innerHTML = '';
            const card = el('div', { className: 'card' });
            const header = el('div', { className: 'card-header' });
            header.innerHTML = `<div class="flex items-center gap-3"><div class="card-header-icon" style="background:var(--red-50);"><svg style="color:var(--red-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg></div><div><div class="card-header-title">Return to Supplier (RTS)</div><div class="card-header-subtitle">Track returned stock and vendor resolutions</div></div></div>`;
            const addBtn = el('button', { className: 'btn btn-danger', innerHTML: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> New RTS' });
            addBtn.addEventListener('click', () => showRTSModal(suppliers || [], products || []));
            header.appendChild(addBtn);
            card.appendChild(header);

            const tableWrap = el('div', { className: 'table-wrapper' });
            let tHtml = `<table class="data-table"><thead><tr><th>Date</th><th>Supplier</th><th>Product</th><th class="text-center">Qty</th><th>Reason</th><th>Status</th><th>Processed By</th><th class="text-right">Actions</th></tr></thead><tbody>`;
            if (!returns || returns.length === 0) {
                tHtml += '<tr><td colspan="8" class="text-center text-muted" style="padding:2rem;">No supplier returns recorded.</td></tr>';
            } else {
                returns.forEach(r => {
                    let statusBadge = '<span class="badge badge-warning">Pending</span>';
                    if (r.action === 'Refunded') statusBadge = '<span class="badge badge-active">Refunded</span>';
                    if (r.action === 'Replaced') statusBadge = '<span class="badge badge-active">Replaced</span>';

                    tHtml += `<tr><td class="text-muted">${formatDateTime(r.createdAt)}</td><td class="font-semibold">${r.supplierName || 'Unknown'}</td><td>${r.productName || 'Unknown'}</td><td class="text-center font-bold">${r.quantity}</td><td class="text-muted">${r.reason}</td><td>${statusBadge}</td><td class="text-muted">${r.processedByName || 'System'}</td><td class="text-right"><button class="btn btn-ghost btn-sm" data-rts-id="${r._id}" data-current-action="${r.action || 'Pending'}">Update</button></td></tr>`;
                });
            }
            tHtml += '</tbody></table>';
            tableWrap.innerHTML = tHtml;

            tableWrap.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-rts-id]');
                if (btn) {
                    showUpdateRTSModal(btn.dataset.rtsId, btn.dataset.currentAction);
                }
            });

            card.appendChild(tableWrap);
            contentArea.appendChild(card);
        } catch { contentArea.innerHTML = '<div class="alert alert-error">Failed to load supplier returns.</div>'; }
    }

    function showRTSModal(suppliers, products) {
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-md' });
        let supOptions = suppliers.map(s => `<option value="${s._id}">${s.supplierName}</option>`).join('');
        let prodOptions = products.map(p => `<option value="${p._id}">${p.productName} (Stock: ${p.quantity})</option>`).join('');
        modal.innerHTML = `<div class="modal-header"><h2>New Return to Supplier (RTS)</h2><button class="modal-close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <form id="rts-form">
            <div class="form-group"><label>Supplier</label><select class="form-control" name="supplierId" required>${supOptions}</select></div>
            <div class="form-group"><label>Product</label><select class="form-control" name="productId" required>${prodOptions}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Quantity</label><input class="form-control" name="quantity" type="number" min="1" value="1" required></div>
                <div class="form-group"><label>Status / Action</label><select class="form-control" name="action"><option value="Pending">Pending</option><option value="Refunded">Refunded</option><option value="Replaced">Replaced</option></select></div>
            </div>
            <div class="form-group"><label>Reason</label><select class="form-control" name="reason"><option value="Expired">Expired</option><option value="Damaged / Defective">Damaged / Defective</option><option value="Incorrect Item">Incorrect Item</option><option value="Quality Issue">Quality Issue</option><option value="Other">Other</option></select></div>
            <div class="form-group"><label>Notes</label><textarea class="form-control" name="notes" placeholder="Optional details..."></textarea></div>
            <div class="form-actions"><button type="button" class="btn btn-outline flex-1 modal-cancel">Cancel</button><button type="submit" class="btn btn-danger flex-1">Process RTS</button></div>
        </form>`;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        modal.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());

        modal.querySelector('#rts-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                const res = await API.post('/api/supplier_returns.php', Object.fromEntries(fd));
                overlay.remove();
                showAlert('success', res.message || 'RTS recorded successfully.');
                renderSupplierReturns();
            } catch (err) { showAlert('error', 'Failed to process RTS.'); }
        });
    }

    function showUpdateRTSModal(id, currentAction) {
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-sm' });
        modal.innerHTML = `<div class="modal-header"><h2>Update RTS Status</h2><button class="modal-close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <form id="update-rts-form">
            <div class="form-group"><label>Action Status</label><select class="form-control" name="action">
                <option value="Pending"${currentAction==='Pending'?' selected':''}>Pending</option>
                <option value="Refunded"${currentAction==='Refunded'?' selected':''}>Refunded</option>
                <option value="Replaced"${currentAction==='Replaced'?' selected':''}>Replaced</option>
            </select></div>
            <div class="form-actions"><button type="button" class="btn btn-outline flex-1 modal-cancel">Cancel</button><button type="submit" class="btn btn-primary flex-1">Save Status</button></div>
        </form>`;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        modal.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());

        modal.querySelector('#update-rts-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                const res = await API.put(`/api/supplier_returns.php?id=${id}`, Object.fromEntries(fd));
                overlay.remove();
                showAlert('success', res.message || 'RTS status updated.');
                renderSupplierReturns();
            } catch { showAlert('error', 'Failed to update RTS status.'); }
        });
    }

    function showSupplierModal(supplier = null) {
        const isEdit = !!supplier;
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-md' });
        modal.innerHTML = `<div class="modal-header"><h2>${isEdit ? 'Edit Supplier' : 'Add Supplier'}</h2><button class="modal-close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <form id="supplier-form">
            <div class="form-group"><label>Supplier Name</label><input class="form-control" name="supplierName" value="${isEdit?supplier.supplierName:''}" required></div>
            <div class="form-row"><div class="form-group"><label>Contact No.</label><input class="form-control" name="contact" value="${isEdit?supplier.contact:''}" required></div><div class="form-group"><label>Contact Person</label><input class="form-control" name="contactPerson" value="${isEdit?(supplier.contactPerson||''):''}"></div></div>
            <div class="form-group"><label>Address</label><input class="form-control" name="address" value="${isEdit?(supplier.address||''):''}"></div>
            <div class="form-row"><div class="form-group"><label>Email</label><input class="form-control" name="email" type="email" value="${isEdit?(supplier.email||''):''}"></div><div class="form-group"><label>Payment Terms</label><select class="form-control" name="paymentTerms"><option value="COD"${isEdit&&supplier.paymentTerms==='COD'?' selected':''}>COD</option><option value="Net 15"${isEdit&&supplier.paymentTerms==='Net 15'?' selected':''}>Net 15</option><option value="Net 30"${isEdit&&supplier.paymentTerms==='Net 30'?' selected':''}>Net 30</option><option value="Net 60"${isEdit&&supplier.paymentTerms==='Net 60'?' selected':''}>Net 60</option></select></div></div>
            ${isEdit ? `<div class="form-group"><label>Status</label><select class="form-control" name="status"><option value="active"${supplier.status==='active'?' selected':''}>Active</option><option value="inactive"${supplier.status==='inactive'?' selected':''}>Inactive</option></select></div>` : ''}
            <div class="form-group"><label>Notes</label><textarea class="form-control" name="notes">${isEdit?(supplier.notes||''):''}</textarea></div>
            <div class="form-actions"><button type="button" class="btn btn-outline flex-1 modal-cancel">Cancel</button><button type="submit" class="btn btn-primary flex-1">${isEdit?'Save Changes':'Add Supplier'}</button></div>
        </form>`;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        modal.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());

        modal.querySelector('#supplier-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                if (isEdit) { await API.put(`/api/suppliers.php?id=${supplier._id}`, Object.fromEntries(fd)); }
                else { await API.post('/api/suppliers.php', Object.fromEntries(fd)); }
                overlay.remove();
                showAlert('success', isEdit ? 'Supplier updated.' : 'Supplier added.');
                renderSupplierDirectory();
            } catch { showAlert('error', 'Failed to save supplier.'); }
        });
    }

    renderSupplierDirectory();
}

// ═══════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════
async function renderUsers(container) {
    const card = el('div', { className: 'card' });
    container.appendChild(card);

    const loadData = async () => {
        try {
            const users = await API.get('/api/users.php');
            renderContent(users || []);
        } catch { showAlert('error', 'Failed to load users'); }
    };

    function renderContent(users) {
        card.innerHTML = '';
        const header = el('div', { className: 'card-header' });
        header.innerHTML = `<div class="flex items-center gap-3"><div class="card-header-icon" style="background:var(--blue-50);"><svg style="color:var(--blue-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg></div><div><div class="card-header-title">User Management</div><div class="card-header-subtitle">Manage team accounts and permissions</div></div></div>`;
        const addBtn = el('button', { className: 'btn btn-primary', innerHTML: '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Add User' });
        addBtn.addEventListener('click', () => showUserModal());
        header.appendChild(addBtn);
        card.appendChild(header);

        const tableWrap = el('div', { className: 'table-wrapper' });
        let tHtml = `<table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th class="text-center">Status</th><th class="text-right">Actions</th></tr></thead><tbody>`;
        users.forEach(u => {
            const statusBadge = u.status === 'active' ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-archived">Inactive</span>';
            tHtml += `<tr><td class="font-semibold">${u.fullName}</td><td class="text-muted">${u.email}</td><td style="text-transform:capitalize;">${u.role}</td><td class="text-center">${statusBadge}</td><td class="text-right"><div style="display:flex;justify-content:flex-end;gap:.5rem;"><button class="btn btn-ghost btn-sm" data-action="edit" data-id="${u._id}">Edit</button><button class="btn btn-ghost btn-sm" data-action="reset" data-id="${u._id}" style="color:var(--amber-600);">Reset PW</button>${u.role !== 'superadmin' && u.role !== 'owner' ? `<button class="btn btn-ghost btn-sm" data-action="delete" data-id="${u._id}" style="color:var(--red-500);">Delete</button>` : ''}</div></td></tr>`;
        });
        tHtml += '</tbody></table>';
        tableWrap.innerHTML = tHtml;

        tableWrap.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const id = btn.dataset.id;
            const user = users.find(u => u._id === id);
            if (btn.dataset.action === 'edit' && user) showUserModal(user);
            if (btn.dataset.action === 'reset') {
                if (confirm('Reset password for this user?')) {
                    try {
                        const data = await API.put(`/api/users.php?action=reset-password&id=${id}`, {});
                        alert(`New password: ${data.generatedPassword}\nPlease share this with the user.`);
                        loadData();
                    } catch { showAlert('error', 'Failed to reset password.'); }
                }
            }
            if (btn.dataset.action === 'delete') {
                if (confirm('Delete this user permanently?')) {
                    try { await API.del(`/api/users.php?id=${id}`); showAlert('success', 'User deleted.'); loadData(); }
                    catch { showAlert('error', 'Failed to delete user.'); }
                }
            }
        });
        card.appendChild(tableWrap);
    }

    function showUserModal(user = null) {
        const isEdit = !!user;
        const overlay = el('div', { className: 'modal-overlay' });
        const modal = el('div', { className: 'modal-content modal-md' });
        modal.innerHTML = `<div class="modal-header"><h2>${isEdit?'Edit User':'Add New User'}</h2><button class="modal-close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <form id="user-form">
            <div class="form-group"><label>Full Name</label><input class="form-control" name="fullName" value="${isEdit?user.fullName:''}" required></div>
            ${!isEdit?'<div class="form-group"><label>Email</label><input class="form-control" name="email" type="email" required></div>':''}
            <div class="form-group"><label>Role</label><select class="form-control" name="role"><option value="staff"${isEdit&&user.role==='staff'?' selected':''}>Staff</option><option value="admin"${isEdit&&user.role==='admin'?' selected':''}>Admin</option><option value="owner"${isEdit&&user.role==='owner'?' selected':''}>Owner</option></select></div>
            ${isEdit?`<div class="form-group"><label>Status</label><select class="form-control" name="status"><option value="active"${user.status==='active'?' selected':''}>Active</option><option value="inactive"${user.status==='inactive'?' selected':''}>Inactive</option></select></div>`:''}
            <div class="form-actions"><button type="button" class="btn btn-outline flex-1 modal-cancel">Cancel</button><button type="submit" class="btn btn-primary flex-1">${isEdit?'Save Changes':'Create User'}</button></div>
        </form>`;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        modal.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());

        modal.querySelector('#user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                if (isEdit) {
                    await API.put(`/api/users.php?id=${user._id}`, Object.fromEntries(fd));
                    overlay.remove();
                    showAlert('success', 'User updated.');
                } else {
                    const data = await API.post('/api/users.php', Object.fromEntries(fd));
                    overlay.remove();
                    if (data.generatedPassword) {
                        alert(`User created!\nGenerated password: ${data.generatedPassword}\nPlease share this with the user.`);
                    }
                    showAlert('success', 'User created.');
                }
                loadData();
            } catch { showAlert('error', 'Failed to save user.'); }
        });
    }

    loadData();
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════
async function renderAuditLogs(container) {
    const header = el('div', { className: 'page-header' });
    header.innerHTML = `<div class="page-header-left"><div class="page-header-icon" style="background:var(--slate-100);"><svg style="color:var(--slate-700);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div><div><div class="page-header-title">Audit Logs</div><div class="page-header-subtitle">Review system activity and administrative action history</div></div></div>`;
    container.appendChild(header);

    const card = el('div', { className: 'card' });
    container.appendChild(card);

    let allLogs = [];
    let search = '';
    let moduleFilter = '';
    let currentPage = 1;
    let itemsPerPage = 15;

    const filterBar = el('div', { className: 'filter-bar' });
    const searchInput = el('input', { className: 'form-control', placeholder: 'Search by action, user, or module...' });
    const moduleSelect = el('select', { className: 'form-control' });
    moduleSelect.innerHTML = '<option value="">All Modules</option><option value="Auth">Auth</option><option value="Inventory">Inventory</option><option value="Sales">Sales</option><option value="Users">Users</option><option value="Suppliers">Suppliers</option><option value="Returns">Returns</option><option value="Settings">Settings</option><option value="XML">XML</option>';

    filterBar.appendChild(searchInput);
    filterBar.appendChild(moduleSelect);
    card.appendChild(filterBar);

    const tableWrap = el('div', { className: 'table-wrapper' });
    card.appendChild(tableWrap);

    const paginationWrap = el('div');
    card.appendChild(paginationWrap);

    searchInput.addEventListener('input', (e) => {
        search = e.target.value.toLowerCase();
        currentPage = 1;
        renderRows();
    });

    moduleSelect.addEventListener('change', (e) => {
        moduleFilter = e.target.value;
        currentPage = 1;
        renderRows();
    });

    try {
        allLogs = await API.get('/api/audit_logs.php');
        renderRows();
    } catch {
        tableWrap.innerHTML = '<div class="alert alert-error" style="margin:1rem;">Failed to load audit logs.</div>';
    }

    function renderRows() {
        let filtered = (allLogs || []).filter(l => {
            const matchesSearch = !search || 
                (l.action && l.action.toLowerCase().includes(search)) || 
                (l.userName && l.userName.toLowerCase().includes(search)) ||
                (l.module && l.module.toLowerCase().includes(search));
            const matchesModule = !moduleFilter || l.module === moduleFilter;
            return matchesSearch && matchesModule;
        });

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * itemsPerPage;
        const pageItems = filtered.slice(start, start + itemsPerPage);

        let html = `<table class="data-table"><thead><tr><th>Timestamp</th><th>User</th><th>Module</th><th>Action Details</th></tr></thead><tbody>`;
        if (pageItems.length === 0) {
            html += '<tr><td colspan="4" class="text-center text-muted" style="padding:2.5rem;">No audit logs found.</td></tr>';
        } else {
            pageItems.forEach(l => {
                html += `<tr>
                    <td class="text-muted" style="white-space:nowrap;font-size:.8125rem;">${formatDateTime(l.createdAt)}</td>
                    <td><div class="font-semibold" style="font-size:.875rem;">${l.userName || 'System'}</div><div class="text-muted" style="font-size:.75rem;">${l.userRole || ''}</div></td>
                    <td><span class="badge-module">${l.module || 'General'}</span></td>
                    <td style="font-size:.875rem;color:var(--slate-700);">${l.action || '—'}</td>
                </tr>`;
            });
        }
        html += '</tbody></table>';
        tableWrap.innerHTML = html;

        paginationWrap.innerHTML = '';
        if (totalItems > 0) {
            renderPagination(paginationWrap, {
                currentPage,
                totalPages,
                totalItems,
                itemsPerPage,
                onPageChange: (p) => { currentPage = p; renderRows(); },
                onItemsPerPageChange: (ipp) => { itemsPerPage = ipp; currentPage = 1; renderRows(); }
            });
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════
async function renderReports(container) {
    const header = el('div', { className: 'page-header' });
    header.innerHTML = `<div class="page-header-left"><div class="page-header-icon" style="background:var(--blue-50);"><svg style="color:var(--blue-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg></div><div><div class="page-header-title">Reports</div><div class="page-header-subtitle">Financial summaries and analytics</div></div></div>`;
    container.appendChild(header);

    // Income Statement card
    const card = el('div', { className: 'card mb-4', style: 'margin-bottom:1.5rem;' });
    card.innerHTML = `<div class="card-header"><div><div class="card-header-title">Income Statement</div></div></div>`;
    const body = el('div', { className: 'card-body' });
    const filterRow = el('div', { className: 'flex items-center gap-3 mb-4', style: 'flex-wrap:wrap;' });
    filterRow.innerHTML = `<div class="form-group" style="margin:0;"><label>Start Date</label><input class="form-control" type="date" id="report-start"></div><div class="form-group" style="margin:0;"><label>End Date</label><input class="form-control" type="date" id="report-end"></div>`;
    const genBtn = el('button', { className: 'btn btn-primary', textContent: 'Generate', style: 'align-self:flex-end;' });
    filterRow.appendChild(genBtn);
    body.appendChild(filterRow);

    const resultDiv = el('div', { id: 'report-result' });
    body.appendChild(resultDiv);
    card.appendChild(body);
    container.appendChild(card);

    genBtn.addEventListener('click', async () => {
        const start = $('#report-start').value;
        const end = $('#report-end').value;
        let url = '/api/reports.php?action=income-statement';
        if (start && end) url += `&startDate=${start}&endDate=${end}`;
        try {
            const data = await API.get(url);
            resultDiv.innerHTML = `<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);"><div class="stat-card stat-card--sales"><div><div class="stat-card-label">Revenue</div><div class="stat-card-value">${formatCurrency(data.revenue)}</div></div></div><div class="stat-card stat-card--expenses"><div><div class="stat-card-label">Expenses</div><div class="stat-card-value">${formatCurrency(data.expenses)}</div></div></div><div class="stat-card stat-card--profit"><div><div class="stat-card-label">Net Income</div><div class="stat-card-value" style="color:${data.netIncome >= 0 ? 'var(--emerald-600)' : 'var(--red-600)'};">${formatCurrency(data.netIncome)}</div></div></div></div>`;
        } catch { resultDiv.innerHTML = '<p class="text-muted">Failed to load report.</p>'; }
    });
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════
async function renderSettings(container) {
    const header = el('div', { className: 'page-header' });
    header.innerHTML = `<div class="page-header-left"><div class="page-header-icon" style="background:var(--slate-100);"><svg style="color:var(--slate-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div><div><div class="page-header-title">Settings</div><div class="page-header-subtitle">Account and store configuration</div></div></div>`;
    container.appendChild(header);

    // Password Change Section
    const pwSection = el('div', { className: 'settings-section' });
    pwSection.innerHTML = `<div class="settings-section-header"><h3>Change Password</h3></div><div class="settings-section-body"><form id="change-pw-form"><div id="pw-msg"></div><div class="form-group"><label>Current Password</label><input class="form-control" name="currentPassword" type="password" required></div><div class="form-row"><div class="form-group"><label>New Password</label><input class="form-control" name="newPassword" type="password" required minlength="6"></div><div class="form-group"><label>Confirm Password</label><input class="form-control" name="confirmPassword" type="password" required minlength="6"></div></div><div class="form-actions"><button type="submit" class="btn btn-primary">Update Password</button></div></form></div>`;
    container.appendChild(pwSection);

    pwSection.querySelector('#change-pw-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const msgDiv = pwSection.querySelector('#pw-msg');
        if (fd.get('newPassword') !== fd.get('confirmPassword')) {
            msgDiv.innerHTML = '<div class="alert alert-error">Passwords do not match</div>'; return;
        }
        try {
            const data = await API.put('/api/users.php?action=change-password', {
                currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword')
            });
            msgDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
            e.target.reset();
        } catch { msgDiv.innerHTML = '<div class="alert alert-error">Failed to update password.</div>'; }
    });

    // Store Config Section (admin only)
    const adminRoles = ['superadmin', 'owner', 'admin'];
    if (adminRoles.includes(currentUser?.role)) {
        const configSection = el('div', { className: 'settings-section' });
        configSection.innerHTML = `<div class="settings-section-header"><h3>Store Configuration</h3></div><div class="settings-section-body" id="config-body"><p class="text-muted">Loading...</p></div>`;
        container.appendChild(configSection);

        try {
            const config = await API.get('/api/config.php');
            const body = configSection.querySelector('#config-body');
            body.innerHTML = `<form id="config-form"><div id="config-msg"></div>
                <div class="form-row"><div class="form-group"><label>Store Name</label><input class="form-control" name="storeName" value="${config.storeName||''}"></div><div class="form-group"><label>Branch Name</label><input class="form-control" name="branchName" value="${config.branchName||''}"></div></div>
                <div class="form-group"><label>Store Address</label><input class="form-control" name="storeAddress" value="${config.storeAddress||''}"></div>
                <div class="form-row"><div class="form-group"><label>Store Contact</label><input class="form-control" name="storeContact" value="${config.storeContact||''}"></div><div class="form-group"><label>Currency</label><input class="form-control" name="currency" value="${config.currency||'PHP'}"></div></div>
                <div class="form-row"><div class="form-group"><label>Tax Rate (%)</label><input class="form-control" name="taxRate" type="number" step="0.01" value="${config.taxRate||0}"></div><div class="form-group"><label>Low Stock Threshold (%)</label><input class="form-control" name="lowStockThreshold" type="number" value="${config.lowStockThreshold||20}"></div></div>
                <div class="form-group"><label>Tax Registration Number</label><input class="form-control" name="taxRegistrationNumber" value="${config.taxRegistrationNumber||''}"></div>
                <div class="form-group"><label>Receipt Footer Text</label><input class="form-control" name="receiptFooter" value="${config.receiptFooter||''}"></div>
                <div class="form-actions"><button type="submit" class="btn btn-primary">Save Configuration</button></div>
            </form>`;

            body.querySelector('#config-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                try {
                    const data = await API.put('/api/config.php', Object.fromEntries(fd));
                    body.querySelector('#config-msg').innerHTML = `<div class="alert alert-success">${data.message || 'Saved!'}</div>`;
                } catch { body.querySelector('#config-msg').innerHTML = '<div class="alert alert-error">Failed to save.</div>'; }
            });
        } catch {}

        // Backup section
        const backupSection = el('div', { className: 'settings-section' });
        backupSection.innerHTML = `<div class="settings-section-header"><h3>Database Backup</h3></div><div class="settings-section-body"><p class="text-muted mb-4">Download a full backup of all collections as a JSON file.</p><a href="/api/backup.php" class="btn btn-primary" target="_blank"><svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> Download Backup</a></div>`;
        container.appendChild(backupSection);
    }
}

// ═══════════════════════════════════════════════════════════════
// XML SYNC
// ═══════════════════════════════════════════════════════════════
async function renderXMLSync(container) {
    const header = el('div', { className: 'page-header' });
    header.innerHTML = `<div class="page-header-left"><div class="page-header-icon" style="background:var(--emerald-50);"><svg style="color:var(--emerald-600);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg></div><div><div class="page-header-title">XML Sync</div><div class="page-header-subtitle">Export and import inventory via XML</div></div></div>`;
    container.appendChild(header);

    // Export Section
    const exportCard = el('div', { className: 'card xml-section' });
    exportCard.innerHTML = `<div class="card-header"><div class="card-header-title">Export Inventory XML</div></div><div class="card-body"><p class="text-muted mb-4">Generate an XML export of your current inventory for external systems or backup.</p><div class="flex gap-3 mb-4" style="flex-wrap:wrap;"><button class="btn btn-primary" id="xml-preview">Preview XML</button><a href="/api/export_inventory_xml.php?mode=download" class="btn btn-blue" target="_blank">Download XML</a><button class="btn btn-success" id="xml-save">Save to Server</button></div><div id="xml-output-container" style="display:none;"><div class="xml-output" id="xml-output"></div></div></div>`;
    container.appendChild(exportCard);

    exportCard.querySelector('#xml-preview').addEventListener('click', async () => {
        try {
            const res = await fetch('/api/export_inventory_xml.php');
            const text = await res.text();
            const outputEl = exportCard.querySelector('#xml-output');
            outputEl.textContent = text;
            exportCard.querySelector('#xml-output-container').style.display = 'block';
        } catch { showAlert('error', 'Failed to generate XML preview.'); }
    });

    exportCard.querySelector('#xml-save').addEventListener('click', async () => {
        try {
            const data = await API.get('/api/export_inventory_xml.php?mode=save');
            showAlert('success', data.message || 'Saved to server.');
        } catch { showAlert('error', 'Failed to save XML.'); }
    });

    // Import Section
    const importCard = el('div', { className: 'card xml-section' });
    importCard.innerHTML = `<div class="card-header"><div class="card-header-title">Import Inventory XML</div></div><div class="card-body"><p class="text-muted mb-4">Upload an XML file to batch-update product prices and stock levels.</p><form id="xml-import-form" enctype="multipart/form-data"><div class="form-group"><input type="file" accept=".xml" name="xmlFile" class="file-input" required></div><button type="submit" class="btn btn-primary">Upload & Import</button></form><div id="xml-import-result" style="margin-top:1rem;"></div></div>`;
    container.appendChild(importCard);

    importCard.querySelector('#xml-import-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
            const res = await fetch('/api/sync_catalog_xml.php', { method: 'POST', body: fd, credentials: 'same-origin' });
            const data = await res.json();
            const result = importCard.querySelector('#xml-import-result');
            result.innerHTML = `<div class="alert alert-success">${data.message} — ${data.updated} updated, ${data.skipped} skipped.</div>`;
            if (data.errors && data.errors.length > 0) {
                result.innerHTML += `<div class="alert alert-error">Errors: ${data.errors.join(', ')}</div>`;
            }
        } catch { showAlert('error', 'Failed to import XML.'); }
    });
}
