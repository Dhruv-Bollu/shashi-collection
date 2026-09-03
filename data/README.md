# Shashi Collection — Website + Admin Backend

A premium, animated e-commerce site for **Shashi Collection** ("Style for Every You") —
Thane's men's fashion & daily essentials store — styled in a Nykaa Fashion–inspired
look, with a real backend admin panel to add products, photos (100+ supported),
prices, and sizes.

**Catalog is organized into 4 shop groups, matching how the store actually sells:**
- **Clothes & Caps** — Casual Shirts, Formal Shirts, Polo T-Shirts, Round Neck Tees, Vests, Caps
- **Pants** — Jeans, Formal Pants, Baggy Fit Pants, Straight Fit Pants, Shorts, Track Pants
- **Daily Use** — Innerwear, Underwear, Blanket, Pillow, Handkerchief, Bedsheet, Mosquito Net, Socks, Towel
- **Bags** — Gym Bag, School Bag, Trolley Bag

Store info (footer, embedded map): Shop 7, Shree Hari Residency Rd, Daighar Gaon,
Thane, Maharashtra 421204. Instagram linked: @shashi._collection.

## What's inside
- **Storefront** (`public/index.html`) — animated hero, marquee, category rail (A–Z),
  product grid, quick-view modal, cart drawer, WhatsApp checkout.
- **Admin Panel** (`public/admin.html`) — add/edit/delete products, upload multiple
  photos per product, set price/MRP/stock/sizes/description.
- **Backend** (`server.js`) — Node.js + Express API that stores products in
  `data/products.json` and saves uploaded photos to `public/uploads/`.

## Run it (on your computer)
1. Install [Node.js](https://nodejs.org) (v18+) if you don't have it.
2. Open a terminal in this folder and run:
   ```
   npm install
   npm start
   ```
3. Open your browser:
   - Storefront: **http://localhost:3000/**
   - Admin Panel: **http://localhost:3000/admin.html**

## Adding your products
1. Go to the Admin Panel → **+ Add Product**.
2. Fill in name, category (pick from the A–Z dropdown: Apron, Blanket, Bedsheet,
   Chadar, Chatai, Machardani, Pillow, Kurta, etc.), price, MRP, sizes (e.g.
   `S, M, L, XL` for clothes or `Single, Double, King` for bedsheets), stock and
   description.
3. Upload photos (multiple at once). You can add up to 100 photos total across
   your product catalog — just repeat this for each product.
4. Save — it instantly appears on the storefront.
5. Edit or delete anytime from the Products table.

## Going live (making it a real public website)
Right now this runs on your own computer. To make it a public website your
customers can visit, deploy it to a Node.js host — for example:
- **Render.com** or **Railway.app** (free/low-cost, easiest for beginners)
- A VPS (DigitalOcean, Hostinger) with Node.js + PM2 + Nginx

Upload this whole folder, run `npm install && npm start` on the server, and
point your domain (e.g. `shashicollection.in`) to it. If you'd like, I can walk
you through deploying to a specific host, or set it up with a real database
(instead of the JSON file) for higher traffic.

## Notes
- Product data lives in `data/products.json`; photos live in `public/uploads/`.
  Back these up regularly.
- The WhatsApp checkout button opens a pre-filled order message — update the
  phone number in `public/js/main.js` (`wa.me/?text=...` → `wa.me/91XXXXXXXXXX?text=...`)
  to route orders to your business number.
- All category/menu text and colors (gold/cream/black premium palette) are easy
  to edit in `public/css/style.css` and `public/index.html`.
