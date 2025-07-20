# hexforgelabs.com

**HexForge Labs** – A full-stack lab automation and commerce platform built with modern open-source tools.

---

## 🔧 Tech Stack

* **Frontend**: React, JSX, TailwindCSS
* **Backend**: Node.js, Express.js
* **Database**: MongoDB (via Mongoose)
* **Infrastructure**: Docker, Docker Compose, NGINX, Certbot
* **Authentication**: Session + bcrypt (production-ready)
* **Payments**: Stripe Integration
* **Email**: Mailgun (Nodemailer)

---

## 🌐 Live Deployment

> **Live Site:** [https://hexforgelabs.com](https://hexforgelabs.com)

Deployed via Docker containers behind NGINX with full SSL via Let's Encrypt and proxied through Cloudflare.

---

## 📁 Project Structure

```
├── frontend/           # React-based frontend (Admin panel, product views, cart)
├── backend/            # Node.js + Express API (Products, Orders, Auth, Payments)
├── nginx/              # NGINX reverse proxy config + Certbot mount
├── public/images/      # Local product image uploads
├── docker-compose.yml  # Full container stack
├── .env.example        # Environment variable structure
└── README.md
```

---

## 🚀 Features

* Custom Admin Portal (create/update products, manage orders)
* Secure Checkout with Stripe
* Nodemailer + Mailgun email confirmations
* Session-based login system
* MongoDB-backed product + order storage
* Frontend image uploader w/ duplicate SKU prevention
* Order status tracking, invoice generation, and confetti animation 🎉

---

## 🧪 Coming Soon

* AI Lab Assistant with embedded tools
* Full-featured Blog page with AI-generated content
* Barcode-based inventory and order status scanner
* Self-hosted customer helpdesk portal

---

## 🧠 Author

**Robert Duff**
[HexForge Labs](https://hexforgelabs.com)
📫 [rduff@hexforgelabs.com](mailto:rduff@hexforgelabs.com)
📍 Eaton, IN

---

## 📜 License

This repo is private while under active development. Open-source license will be attached once publicly released.

---

> Want to collaborate or hire me? Reach out through the contact form at hexforgelabs.com or by email.

