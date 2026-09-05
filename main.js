// ⚠️ SPLIT HOSTING SETUP:
// If frontend (Netlify/Vercel) and backend (Render) are on different domains,
// set your live Render backend URL below, e.g. 'https://shashi-api.onrender.com/api'
// If frontend and backend are on the SAME host (e.g. Option A - everything on Render),
// leave this as '/api'.
const API = 'https://shashi-collection.onrender.com/api';
const BACKEND_ORIGIN = API.replace(/\/api$/, '');

// Uploaded photos are stored as relative paths like '/uploads/xyz.jpg'.
// On split hosting (frontend on Netlify, backend on Render) that path must be
// resolved against the Render origin, or the browser looks for it on Netlify and fails.
function resolvePhoto(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path; // already absolute (e.g. seed photos)
  return BACKEND_ORIGIN + path;
}

let PRODUCTS = [];
let CATEGORIES = [];
let currentProduct = null;
let currentImgIdx = 0;
let selectedSize = null;
let qty = 1;
let cart = JSON.parse(sessionStorage.getItem('shashi_cart') || '[]');

// ---- Mobile hamburger menu ----
document.getElementById('hamburgerBtn').addEventListener('click', () => {
  document.getElementById('mobileNav').classList.toggle('open');
});
document.querySelectorAll('.mobile-nav a').forEach(a => {
  a.addEventListener('click', () => {
    document.getElementById('mobileNav').classList.remove('open');
  });
});

// ---- Loader ----
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loader').classList.add('hide'), 900);
});

// ---- Header scroll ----
window.addEventListener('scroll', () => {
  document.getElementById('siteHeader').classList.toggle('scrolled', window.scrollY > 30);
});

// ---- Fetch data ----
async function loadCategories() {
  const res = await fetch(`${API}/categories`);
  CATEGORIES = await res.json();
  renderCatRail();
}

let CATEGORY_GROUPS = {};
async function loadCategoryGroups() {
  const res = await fetch(`${API}/category-groups`);
  CATEGORY_GROUPS = await res.json();
}

async function loadProducts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/products${qs ? '?' + qs : ''}`);
  let list = await res.json();
  if (params.group && CATEGORY_GROUPS[params.group]) {
    const allowed = CATEGORY_GROUPS[params.group].map(c => c.toLowerCase());
    list = list.filter(p => allowed.includes(p.category.toLowerCase()));
  }
  PRODUCTS = list;
  renderGrid();
}

function renderCatRail() {
  const rail = document.getElementById('catRail');
  rail.innerHTML = `<div class="cat-pill active" data-cat="">All</div>` +
    CATEGORIES.map(c => `<div class="cat-pill" data-cat="${c}">${c}</div>`).join('');
  rail.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      rail.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      loadProducts({ category: pill.dataset.cat });
    });
  });
}

function renderGrid() {
  const grid = document.getElementById('productGrid');
  if (!PRODUCTS.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="big">No products yet</div>
      <p>Add products from the <a href="admin.html" style="color:var(--gold);">Admin Panel</a> to see them here.</p>
    </div>`;
    return;
  }
  grid.innerHTML = PRODUCTS.map((p, i) => {
    const img = p.photos && p.photos[0] ? resolvePhoto(p.photos[0]) : 'https://via.placeholder.com/400x533?text=Shashi+Collection';
    const off = p.mrp > p.price ? Math.round(100 - (p.price / p.mrp) * 100) : 0;
    return `
    <div class="card" style="animation-delay:${(i % 8) * 0.06}s" data-id="${p.id}">
      <div class="card-img">
        ${off > 0 ? `<span class="badge">${off}% OFF</span>` : ''}
        <img src="${img}" alt="${p.name}">
        <div class="quick-add">Quick View</div>
      </div>
      <div class="card-body">
        <div class="cat">${p.category}</div>
        <h3>${p.name}</h3>
        <div class="price-row">
          <span class="price">₹${p.price}</span>
          ${p.mrp > p.price ? `<span class="mrp">₹${p.mrp}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openProduct(card.dataset.id));
  });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  loadProducts({ search: e.target.value });
});
document.getElementById('searchInputMobile').addEventListener('input', (e) => {
  loadProducts({ search: e.target.value });
  document.getElementById('searchInput').value = e.target.value;
});

// ---- Product Modal ----
function openProduct(id) {
  currentProduct = PRODUCTS.find(p => p.id === id);
  if (!currentProduct) return;
  currentImgIdx = 0;
  selectedSize = currentProduct.sizes[0] || null;
  qty = 1;

  const photos = currentProduct.photos.length
    ? currentProduct.photos.map(resolvePhoto)
    : ['https://via.placeholder.com/600x600?text=Shashi+Collection'];
  document.getElementById('modalMainImg').src = photos[0];
  document.getElementById('modalThumbs').innerHTML = photos.map((p, i) =>
    `<img src="${p}" class="${i === 0 ? 'active' : ''}" data-i="${i}">`).join('');
  document.querySelectorAll('#modalThumbs img').forEach(t => {
    t.addEventListener('click', () => {
      document.getElementById('modalMainImg').src = photos[t.dataset.i];
      document.querySelectorAll('#modalThumbs img').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
    });
  });

  document.getElementById('modalCat').textContent = currentProduct.category;
  document.getElementById('modalName').textContent = currentProduct.name;
  document.getElementById('modalPrice').textContent = '₹' + currentProduct.price;
  document.getElementById('modalMrp').textContent = currentProduct.mrp > currentProduct.price ? '₹' + currentProduct.mrp : '';
  const off = currentProduct.mrp > currentProduct.price ? Math.round(100 - (currentProduct.price / currentProduct.mrp) * 100) : 0;
  document.getElementById('modalOff').textContent = off > 0 ? `${off}% off` : '';
  document.getElementById('modalDesc').textContent = currentProduct.description || 'Premium quality, crafted for everyday comfort.';
  document.getElementById('modalStock').textContent = currentProduct.stock > 0 ? `${currentProduct.stock} in stock` : 'Made to order';
  document.getElementById('qtyVal').textContent = qty;

  const sizeWrap = document.getElementById('modalSizes');
  sizeWrap.innerHTML = currentProduct.sizes.length
    ? currentProduct.sizes.map(s => `<div class="size-chip ${s === selectedSize ? 'sel' : ''}" data-s="${s}">${s}</div>`).join('')
    : '';
  sizeWrap.querySelectorAll('.size-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedSize = chip.dataset.s;
      sizeWrap.querySelectorAll('.size-chip').forEach(c => c.classList.remove('sel'));
      chip.classList.add('sel');
    });
  });

  document.getElementById('productOverlay').classList.add('open');
  document.getElementById('productModal').scrollTop = 0;
  renderSimilarProducts();
}

let similarRequestToken = 0;

async function renderSimilarProducts() {
  const rail = document.getElementById('similarRail');
  if (!currentProduct) { rail.innerHTML = ''; return; }
  const myToken = ++similarRequestToken;
  const thisProductId = currentProduct.id;
  rail.innerHTML = `<div class="similar-empty">Loading...</div>`;
  const res = await fetch(`${API}/products?category=${encodeURIComponent(currentProduct.category)}`);
  const sameCat = await res.json();
  // If the user opened a different product while this request was in flight, discard this result
  if (myToken !== similarRequestToken || !currentProduct || currentProduct.id !== thisProductId) return;
  const similar = sameCat.filter(p => p.id !== currentProduct.id);
  if (!similar.length) {
    rail.innerHTML = `<div class="similar-empty">No similar products in this category yet.</div>`;
    return;
  }
  rail.innerHTML = similar.map(p => {
    const img = p.photos && p.photos[0] ? resolvePhoto(p.photos[0]) : 'https://via.placeholder.com/150x190?text=Shashi';
    return `
    <div class="similar-card" data-id="${p.id}">
      <div class="sc-img"><img src="${img}" alt="${p.name}"></div>
      <div class="sc-name">${p.name}</div>
      <div class="sc-price">₹${p.price}</div>
    </div>`;
  }).join('');
  rail.querySelectorAll('.similar-card').forEach(card => {
    card.addEventListener('click', async () => {
      // ensure the target product is available even if not in current filtered PRODUCTS list
      const match = similar.find(p => p.id === card.dataset.id);
      if (match && !PRODUCTS.find(p => p.id === match.id)) PRODUCTS.push(match);
      openProduct(card.dataset.id);
    });
  });
}

document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('productOverlay').classList.remove('open');
});
document.getElementById('productOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'productOverlay') e.target.classList.remove('open');
});
document.getElementById('qtyMinus').addEventListener('click', () => {
  qty = Math.max(1, qty - 1);
  document.getElementById('qtyVal').textContent = qty;
});
document.getElementById('qtyPlus').addEventListener('click', () => {
  qty += 1;
  document.getElementById('qtyVal').textContent = qty;
});
document.getElementById('addToCartBtn').addEventListener('click', () => {
  if (!currentProduct) return;
  cart.push({
    id: currentProduct.id, name: currentProduct.name, price: currentProduct.price,
    photo: currentProduct.photos[0] ? resolvePhoto(currentProduct.photos[0]) : '', size: selectedSize, qty
  });
  sessionStorage.setItem('shashi_cart', JSON.stringify(cart));
  updateCartUI();
  document.getElementById('productOverlay').classList.remove('open');
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
});

// ---- Cart ----
function updateCartUI() {
  document.getElementById('cartCount').textContent = cart.reduce((s, i) => s + i.qty, 0);
  const body = document.getElementById('cartBody');
  if (!cart.length) {
    body.innerHTML = `<p style="color:var(--gray);text-align:center;margin-top:40px;">Your bag is empty</p>`;
  } else {
    body.innerHTML = cart.map((item, i) => `
      <div class="cart-item">
        <img src="${item.photo || 'https://via.placeholder.com/70x88'}">
        <div class="ci-info">
          <div>${item.name}</div>
          <div style="color:var(--gray);">${item.size ? 'Size: ' + item.size + ' • ' : ''}Qty: ${item.qty}</div>
          <div style="font-weight:600;">₹${item.price * item.qty}</div>
          <div class="remove" data-i="${i}">Remove</div>
        </div>
      </div>`).join('');
    body.querySelectorAll('.remove').forEach(r => {
      r.addEventListener('click', () => {
        cart.splice(r.dataset.i, 1);
        sessionStorage.setItem('shashi_cart', JSON.stringify(cart));
        updateCartUI();
      });
    });
  }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('cartTotal').textContent = '₹' + total;
}

document.getElementById('cartBtn').addEventListener('click', () => {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
});
document.getElementById('cartClose').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
}
document.getElementById('checkoutBtn').addEventListener('click', () => {
  if (!cart.length) return;
  let msg = 'Hi Shashi Collection, I want to order:%0A';
  cart.forEach(i => { msg += `- ${i.name}${i.size ? ' (Size ' + i.size + ')' : ''} x${i.qty} — ₹${i.price * i.qty}%0A`; });
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  msg += `Total: ₹${total}`;
  window.open(`https://wa.me/?text=${msg}`, '_blank');
});

// ---- Nav / footer category links ----
document.querySelectorAll('a[data-cat], a[data-group]').forEach(a => {
  a.addEventListener('click', () => {
    if (a.dataset.group) loadProducts({ group: a.dataset.group });
    else loadProducts({ category: a.dataset.cat });
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    const railAll = document.querySelector('.cat-pill[data-cat=""]');
    if (railAll) railAll.classList.add('active');
  });
});

// ---- Init ----
(async function initApp() {
  await loadCategoryGroups();
  await loadCategories();
  await loadProducts();
  updateCartUI();
})();
