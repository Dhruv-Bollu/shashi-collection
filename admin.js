// ⚠️ SPLIT HOSTING SETUP:
// If frontend (Netlify/Vercel) and backend (Render) are on different domains,
// set your live Render backend URL below, e.g. 'https://shashi-api.onrender.com/api'
// If frontend and backend are on the SAME host (e.g. Option A - everything on Render),
// leave this as '/api'.
const API = 'https://shashi-collection.onrender.com/api';
const BACKEND_ORIGIN = API.replace(/\/api$/, ''); // e.g. https://shashi-collection.onrender.com

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
let editingId = null;
let selectedFiles = [];
let keptPhotos = []; // existing photos (relative paths) the admin has chosen to keep while editing

// ---- Login gate ----
function getAuthHeader() {
  const creds = sessionStorage.getItem('shashi_admin_creds');
  return creds ? { Authorization: 'Basic ' + creds } : {};
}

// ---- Show/hide password toggle ----
document.getElementById('togglePass').addEventListener('click', () => {
  const pass = document.getElementById('loginPass');
  const icon = document.getElementById('togglePass');
  if (pass.type === 'password') {
    pass.type = 'text';
    icon.textContent = '🙈';
  } else {
    pass.type = 'password';
    icon.textContent = '👁';
  }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = document.getElementById('loginUser').value;
  const pass = document.getElementById('loginPass').value;
  const encoded = btoa(`${user}:${pass}`);
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  // Verify credentials by attempting a protected call (a harmless PUT to a fake id is fine —
  // we just care whether we get 401 Unauthorized back or not)
  try {
    const res = await fetch(`${API}/products/__auth_check__`, {
      method: 'DELETE',
      headers: { Authorization: 'Basic ' + encoded }
    });
    if (res.status === 401) {
      errorEl.textContent = 'Incorrect username or password.';
      return;
    }
    // Any other response (404 for the fake id, etc.) means auth passed
    sessionStorage.setItem('shashi_admin_creds', encoded);
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminShell').style.display = 'flex';
    init();
  } catch (err) {
    errorEl.textContent = 'Could not reach the server. Try again.';
  }
});

// If already logged in this session, skip straight to the dashboard
if (sessionStorage.getItem('shashi_admin_creds')) {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('adminShell').style.display = 'flex';
  init();
}

async function init() {
  const [catRes, groupRes] = await Promise.all([
    fetch(`${API}/categories`), fetch(`${API}/category-groups`)
  ]);
  CATEGORIES = await catRes.json();
  const groups = await groupRes.json();
  const sel = document.getElementById('fCategory');
  sel.innerHTML = Object.entries(groups).map(([groupName, cats]) =>
    `<optgroup label="${groupName}">${cats.map(c => `<option value="${c}">${c}</option>`).join('')}</optgroup>`
  ).join('');
  await loadProducts();
}

async function loadProducts() {
  const res = await fetch(`${API}/products`);
  PRODUCTS = await res.json();
  renderTable();
  renderStats();
}

function renderStats() {
  document.getElementById('statTotal').textContent = PRODUCTS.length;
  document.getElementById('statPhotos').textContent = PRODUCTS.reduce((s, p) => s + (p.photos ? p.photos.length : 0), 0);
  document.getElementById('statCats').textContent = new Set(PRODUCTS.map(p => p.category)).size;
}

function renderTable() {
  const body = document.getElementById('productTableBody');
  if (!PRODUCTS.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="7">No products yet. Click "+ Add Product" to get started.</td></tr>`;
    return;
  }
  body.innerHTML = PRODUCTS.map(p => `
    <tr>
      <td><img src="${p.photos[0] ? resolvePhoto(p.photos[0]) : 'https://via.placeholder.com/44x56'}"></td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>₹${p.price}${p.mrp > p.price ? ` <span style="text-decoration:line-through;color:#aaa;">₹${p.mrp}</span>` : ''}</td>
      <td>${(p.sizes || []).join(', ') || '-'}</td>
      <td>${p.stock}</td>
      <td>
        <button class="act-btn edit" data-id="${p.id}">Edit</button>
        <button class="act-btn del" data-id="${p.id}">Delete</button>
      </td>
    </tr>`).join('');

  body.querySelectorAll('.edit').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.id)));
  body.querySelectorAll('.del').forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.id)));
}

// ---- Form open/close ----
function openForm() {
  document.getElementById('formOverlay').classList.add('open');
}
function closeForm() {
  document.getElementById('formOverlay').classList.remove('open');
  document.getElementById('productForm').reset();
  document.getElementById('previewRow').innerHTML = '';
  selectedFiles = [];
  keptPhotos = [];
  editingId = null;
  document.getElementById('formTitle').textContent = 'Add Product';
}
document.getElementById('openAddBtn').addEventListener('click', () => { closeForm(); openForm(); });
document.getElementById('formClose').addEventListener('click', closeForm);
document.getElementById('cancelForm').addEventListener('click', closeForm);
document.getElementById('formOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'formOverlay') closeForm();
});

function renderPreview() {
  const preview = document.getElementById('previewRow');
  preview.innerHTML = '';

  // Existing photos the admin chose to keep (relative paths -> resolve to Render URL)
  keptPhotos.forEach((path, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'thumb-wrap';
    wrap.innerHTML = `<img src="${resolvePhoto(path)}"><span class="thumb-remove" data-kind="kept" data-i="${i}">×</span>`;
    preview.appendChild(wrap);
  });

  // Newly selected files (not uploaded yet -> use a local blob preview)
  selectedFiles.forEach((f, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'thumb-wrap';
    wrap.innerHTML = `<img src="${URL.createObjectURL(f)}"><span class="thumb-remove" data-kind="new" data-i="${i}">×</span>`;
    preview.appendChild(wrap);
  });

  preview.querySelectorAll('.thumb-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.i);
      if (btn.dataset.kind === 'kept') keptPhotos.splice(i, 1);
      else selectedFiles.splice(i, 1);
      renderPreview();
    });
  });
}

document.getElementById('fPhotos').addEventListener('change', (e) => {
  selectedFiles = selectedFiles.concat(Array.from(e.target.files));
  renderPreview();
  e.target.value = ''; // allow re-selecting the same file again if needed
});

function openEdit(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('formTitle').textContent = 'Edit Product';
  document.getElementById('productId').value = p.id;
  document.getElementById('fName').value = p.name;
  document.getElementById('fCategory').value = p.category;
  document.getElementById('fColor').value = p.color || '';
  document.getElementById('fPrice').value = p.price;
  document.getElementById('fMrp').value = p.mrp || '';
  document.getElementById('fStock').value = p.stock || 0;
  document.getElementById('fSizes').value = (p.sizes || []).join(', ');
  document.getElementById('fDesc').value = p.description || '';
  keptPhotos = [...(p.photos || [])];
  selectedFiles = [];
  renderPreview();
  openForm();
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  await fetch(`${API}/products/${id}`, { method: 'DELETE', headers: getAuthHeader() });
  await loadProducts();
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData();
  fd.append('name', document.getElementById('fName').value);
  fd.append('category', document.getElementById('fCategory').value);
  fd.append('color', document.getElementById('fColor').value);
  fd.append('price', document.getElementById('fPrice').value);
  fd.append('mrp', document.getElementById('fMrp').value || document.getElementById('fPrice').value);
  fd.append('stock', document.getElementById('fStock').value || 0);
  fd.append('sizes', document.getElementById('fSizes').value);
  fd.append('description', document.getElementById('fDesc').value);
  selectedFiles.forEach(f => fd.append('photos', f));

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    if (editingId) {
      fd.append('keepPhotos', JSON.stringify(keptPhotos));
      await fetch(`${API}/products/${editingId}`, { method: 'PUT', headers: getAuthHeader(), body: fd });
    } else {
      await fetch(`${API}/products`, { method: 'POST', headers: getAuthHeader(), body: fd });
    }
    await loadProducts();
    closeForm();
  } catch (err) {
    alert('Error saving product: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Product';
  }
});

// init() is now triggered after successful login above
