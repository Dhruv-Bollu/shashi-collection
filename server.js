const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ products: [] }, null, 2));

function readDB() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
function writeDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'p_' + Date.now() + '_' + Math.round(Math.random() * 1e6) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----- Categories, grouped the way Shashi Collection actually sells -----
// Groups: Clothes & Caps | Pants | Daily Use | Bags
const CATEGORY_GROUPS = {
  'Clothes & Caps': ['Casual Shirts', 'Formal Shirts', 'Polo T-Shirts', 'Round Neck Tees', 'Vests', 'Caps'],
  'Pants': ['Jeans', 'Formal Pants', 'Baggy Fit Pants', 'Straight Fit Pants', 'Shorts', 'Track Pants'],
  'Daily Use': ['Innerwear', 'Underwear', 'Blanket', 'Pillow', 'Handkerchief', 'Bedsheet', 'Mosquito Net', 'Socks', 'Towel'],
  'Bags': ['Gym Bag', 'School Bag', 'Trolley Bag']
};
const CATEGORIES = Object.values(CATEGORY_GROUPS).flat();

app.get('/api/categories', (req, res) => res.json(CATEGORIES));
app.get('/api/category-groups', (req, res) => res.json(CATEGORY_GROUPS));

// ----- Products CRUD -----
app.get('/api/products', (req, res) => {
  const db = readDB();
  const { category, search } = req.query;
  let list = db.products;
  if (category) list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s));
  }
  res.json(list.sort((a, b) => b.createdAt - a.createdAt));
});

app.get('/api/products/:id', (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

app.post('/api/products', upload.array('photos', 10), (req, res) => {
  const db = readDB();
  const { name, category, price, mrp, sizes, description, stock, color } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ error: 'name, category, and price are required' });
  }
  const photos = (req.files || []).map(f => '/uploads/' + f.filename);
  const product = {
    id: 'sc_' + Date.now() + '_' + Math.round(Math.random() * 1e6),
    name,
    category,
    price: Number(price),
    mrp: mrp ? Number(mrp) : Number(price),
    sizes: sizes ? sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
    color: color || '',
    description: description || '',
    stock: stock ? Number(stock) : 0,
    photos,
    createdAt: Date.now()
  };
  db.products.push(product);
  writeDB(db);
  res.status(201).json(product);
});

app.put('/api/products/:id', upload.array('photos', 10), (req, res) => {
  const db = readDB();
  const idx = db.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.products[idx];
  const { name, category, price, mrp, sizes, description, stock, color, keepPhotos } = req.body;

  let photos = existing.photos;
  if (keepPhotos !== undefined) {
    try { photos = JSON.parse(keepPhotos); } catch (e) { /* ignore */ }
  }
  const newPhotos = (req.files || []).map(f => '/uploads/' + f.filename);
  photos = [...photos, ...newPhotos];

  db.products[idx] = {
    ...existing,
    name: name ?? existing.name,
    category: category ?? existing.category,
    price: price !== undefined ? Number(price) : existing.price,
    mrp: mrp !== undefined ? Number(mrp) : existing.mrp,
    sizes: sizes !== undefined ? sizes.split(',').map(s => s.trim()).filter(Boolean) : existing.sizes,
    color: color ?? existing.color,
    description: description ?? existing.description,
    stock: stock !== undefined ? Number(stock) : existing.stock,
    photos
  };
  writeDB(db);
  res.json(db.products[idx]);
});

app.delete('/api/products/:id', (req, res) => {
  const db = readDB();
  const idx = db.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const [removed] = db.products.splice(idx, 1);
  (removed.photos || []).forEach(p => {
    const filePath = path.join(__dirname, 'public', p);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
  writeDB(db);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Shashi Collection server running at http://localhost:${PORT}`);
  console.log(`Storefront: http://localhost:${PORT}/`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});
