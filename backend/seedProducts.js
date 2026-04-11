/**
 * Seed Database with Product Catalog
 * 
 * IMPORTANT: This script uses a non-destructive upsert pattern.
 * It will NOT delete existing products. Instead, it:
 * - Inserts new products on first run
 * - Updates existing products on subsequent runs (matched by SKU)
 * - Preserves any products not in the seed list
 * 
 * This design prevents accidental data loss and allows safe re-runs
 * during development, testing, and production stack refreshes.
 * 
 * All seeded products are automatically set to status: 'active'
 * and will appear on the public storefront.
 */

const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const products = [
  {
    name: 'USB Keylogger',
    sku: 'USBKEY01',
    description: 'Stealthy keystroke logging device.',
    price: 45.0,
    image: '/images/key_logger.jpg',
    brand: 'HexForge Labs',
    stock: 15,
    categories: ['hardware', 'security'],
    isFeatured: true,
  },
  {
    name: 'BadUSB',
    sku: 'BADUSB02',
    description: 'A powerful penetration testing tool.',
    price: 50.0,
    image: '/images/bad_usb.jpg',
    brand: 'HexForge Labs',
    stock: 10,
    categories: ['hardware', 'security'],
    isFeatured: true,
  },
  {
    name: 'RFID Cloner',
    sku: 'RFIDCL03',
    description: 'Clone and analyze RFID tags with ease.',
    price: 30.0,
    image: '/images/rfid_reader_kit.jpg',
    brand: 'HexForge Labs',
    stock: 8,
    categories: ['hardware'],
  },
  {
    name: 'Pwnagotchi',
    sku: 'PWNGTC04',
    description: 'AI-powered WiFi hacking device.',
    price: 120.0,
    image: '/images/pwnagotchi.jpg',
    brand: 'HexForge Labs',
    stock: 5,
    categories: ['hardware', 'security'],
    isFeatured: true,
  },
  {
    name: 'BlackArch Linux USB',
    sku: 'BLKARC05',
    description: 'Penetration testing OS with 2800+ tools.',
    price: 29.99,
    image: '/images/kali_usb.jpg',
    brand: 'HexForge Labs',
    stock: 20,
    categories: ['software', 'os'],
  },
  {
    name: 'Arch Linux USB',
    sku: 'ARCHLN06',
    description: 'Minimalist and customizable Linux distro.',
    price: 15.0,
    image: '/images/kali_usb.jpg',
    brand: 'HexForge Labs',
    stock: 25,
    categories: ['software', 'os'],
  },
  {
    name: 'Kali Linux USB',
    sku: 'KALIUS07',
    description: 'Industry-standard ethical hacking OS.',
    price: 20.0,
    image: '/images/kali_usb.jpg',
    brand: 'HexForge Labs',
    stock: 30,
    categories: ['software', 'os'],
    isFeatured: true,
  },
  {
    name: 'Parrot Security OS USB',
    sku: 'PRRTOS08',
    description: 'Privacy-focused penetration testing OS.',
    price: 20.0,
    image: '/images/kali_usb.jpg',
    brand: 'HexForge Labs',
    stock: 18,
    categories: ['software', 'os'],
  },
  {
    name: 'HTB (Hack The Box) OS USB',
    sku: 'HTBOSU09',
    description: 'OS for cybersecurity training & CTFs.',
    price: 25.0,
    image: '/images/kali_usb.jpg',
    brand: 'HexForge Labs',
    stock: 12,
    categories: ['software', 'os'],
  },
  {
    name: 'Qubes OS USB',
    sku: 'QUBEOS10',
    description: 'Security-hardened OS for advanced privacy.',
    price: 20.0,
    image: '/images/kali_usb.jpg',
    brand: 'HexForge Labs',
    stock: 10,
    categories: ['software', 'os'],
  },
  {
    name: 'Raspberry Pi 4 Cyber Case',
    sku: 'PI4CAS11',
    description: '3D-printed rugged case with cooling.',
    price: 24.99,
    image: '/images/pi_case.jpg',
    brand: 'HexForge Labs',
    stock: 15,
    categories: ['accessories', 'raspberry-pi'],
  },
  {
    name: 'Raspberry Pi Zero Stealth Case',
    sku: 'PZRCAS12',
    description: 'Compact and low-profile Pi Zero case.',
    price: 19.99,
    image: '/images/pi_case.jpg',
    brand: 'HexForge Labs',
    stock: 20,
    categories: ['accessories', 'raspberry-pi'],
  },
  {
    name: 'Raspberry Pi Cluster Rack',
    sku: 'PIRACK13',
    description: 'Stackable rack for Pi clusters.',
    price: 49.99,
    image: '/images/pi_case.jpg',
    brand: 'HexForge Labs',
    stock: 8,
    categories: ['accessories', 'raspberry-pi'],
  },
  {
    name: 'USB Rubber Ducky Clone',
    sku: 'DUCKY14',
    description: 'Programmable USB keystroke injection tool.',
    price: 79.99,
    image: '/images/usb1.jpg',
    brand: 'HexForge Labs',
    stock: 7,
    categories: ['hardware', 'security'],
    isFeatured: true,
  },
  {
    name: 'ESP8266 WiFi Deauther',
    sku: 'ESP82615',
    description: 'WiFi hacking & testing tool for researchers.',
    price: 39.99,
    image: '/images/esp8266_deauther.jpg',
    brand: 'HexForge Labs',
    stock: 12,
    categories: ['hardware', 'security'],
  },
  {
    name: 'Custom Lithophane Lamp (Cylinder)',
    sku: 'LITHCYL01',
    description: 'Custom 3D-printed lithophane lamp with your photo. Upload your image and we\'ll create a beautiful illuminated artwork.',
    price: 49.99,
    image: '/images/products/litho-cylinder/hero-main.jpg',
    imageGallery: [
      '/images/products/litho-cylinder/hero-main.jpg',
      '/images/products/litho-cylinder/hero-alt.jpg',
      '/images/products/litho-cylinder/panel-1.jpg',
      '/images/products/litho-cylinder/panel-2.jpg',
      '/images/products/litho-cylinder/panel-3.jpg',
      '/images/products/litho-cylinder/panel-4.jpg',
      '/images/products/litho-cylinder/process-1.jpg',
      '/images/products/litho-cylinder/process-2.jpg',
    ],
    brand: 'HexForge Labs',
    stock: 999, // Unlimited stock for custom orders
    categories: ['lamps', 'custom'],
    isFeatured: true,
  },
  {
    name: 'Multi-panel Lithophane Lamp',
    sku: 'LITHMUL02',
    description: 'Multi-panel lithophane lamp featuring multiple photos or designs. Perfect for family portraits or multi-image displays.',
    price: 79.99,
    image: '/images/products/litho-multipanel/hero-main.jpg',
    imageGallery: [
      '/images/products/litho-multipanel/hero-main.jpg',
      '/images/products/litho-multipanel/hero-alt.jpg',
      '/images/products/litho-multipanel/panel-1.jpg',
      '/images/products/litho-multipanel/panel-2.jpg',
      '/images/products/litho-multipanel/panel-3.jpg',
      '/images/products/litho-multipanel/panel-4.jpg',
      '/images/products/litho-multipanel/process-1.jpg',
      '/images/products/litho-multipanel/process-2.jpg',
    ],
    brand: 'HexForge Labs',
    stock: 999, // Unlimited stock for custom orders
    categories: ['lamps', 'custom'],
    isFeatured: true,
  },
  {
    name: 'Lithophane Box',
    sku: 'LITHBOX03',
    description: 'Elegant lithophane storage box with custom photo engraving. Beautiful illuminated keepsake with practical storage.',
    price: 39.99,
    image: '/images/products/litho-box/hero-main.jpg',
    imageGallery: [
      '/images/products/litho-box/hero-main.jpg',
      '/images/products/litho-box/hero-alt.jpg',
      '/images/products/litho-box/glow-close.jpg',
      '/images/products/litho-box/angle-1.jpg',
      '/images/products/litho-box/angle-2.jpg',
      '/images/products/litho-box/process-1.jpg',
    ],
    brand: 'HexForge Labs',
    stock: 999, // Unlimited stock for custom orders
    categories: ['lamps', 'custom'],
  },
];

/**
 * Derives a single category from the product's categories array.
 * Maps input array to schema's single category field using priority:
 * lamps > hardware > software > accessories > first item
 * 
 * @param {Array} categories - Array of category tags from product input
 * @returns {String} Single category value for database storage
 */
function deriveCategory(categories) {
  if (!Array.isArray(categories)) return 'uncategorized';
  if (categories.includes('lamps')) return 'lamps';
  if (categories.includes('hardware')) return 'hardware';
  if (categories.includes('software')) return 'software';
  if (categories.includes('accessories')) return 'accessories';
  if (categories.length) return String(categories[0]).trim();
  return 'uncategorized';
}

/**
 * Generates a URL-safe slug from a product title.
 * Converts to lowercase, removes special characters, trims hyphens.
 * 
 * @param {String} value - Product title to slugify
 * @returns {String} URL-safe slug for use in product routes
 */
function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Normalizes product input data to schema format.
 * Converts 'name' → 'title', 'image' → 'hero_image_url', 'categories' → 'category'.
 * Ensures all values are properly typed and sanitized.
 * 
 * @param {Object} product - Raw product object from seed data
 * @returns {Object} Normalized product object ready for database insertion
 */
function normalizeProduct(product) {
  const title = String(product.name || '').trim();
  return {
    title,
    slug: slugify(title),
    sku: String(product.sku || '').trim(),
    description: String(product.description || '').trim(),
    price: Number(product.price) || 0,
    hero_image_url: String(product.image || '').trim() || undefined,
    imageGallery: Array.isArray(product.imageGallery)
      ? product.imageGallery.filter(Boolean)
      : undefined,
    brand: String(product.brand || 'HexForge Labs').trim(),
    stock: Number.isFinite(product.stock) ? product.stock : Number(product.stock) || 0,
    category: deriveCategory(product.categories),
    isFeatured: !!product.isFeatured,
  };
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Seeds the database with products using non-destructive upsert.
 * For each product in the seed catalog:
 * - If SKU matches: updates stored product and sets status to 'active'
 * - If SKU not found: inserts new product with status: 'active'
 * - Products not in seed list are never touched
 * 
 * This ensures safe re-runs without data loss.
 */
const seedDatabase = async () => {
  try {
    for (const product of products) {
      const normalized = normalizeProduct(product);
      // Use updateOne with upsert to safely seed: insert if new, update if exists
      await Product.updateOne(
        { sku: normalized.sku },
        {
          $setOnInsert: normalized,    // Fields to set only on document creation
          $set: { status: 'active' },  // Always set status to active, even on updates
        },
        { upsert: true }               // Insert if not found, update if found
      );
    }
    console.log('Database seeded safely with upsert. Existing products were preserved.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
  }
};

connectDB();
seedDatabase();
