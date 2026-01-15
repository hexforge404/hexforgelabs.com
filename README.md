# ⚙️ HexForge Labs – Full Stack AI-Powered Web Platform

This is the complete repository for the [HexForge Labs](https://hexforgelabs.com) website and backend platform — a custom e-commerce and interactive lab assistant system developed by Robert Duff.

---

## 🚀 Features

* **🛒 Full-Stack Storefront**
  React + Express-based online shop with MongoDB, Docker, and Stripe integration

* **🔐 Admin Dashboard**
  Secure login system, product management, and order tracking

* **🤖 AI Assistant (Lab Agent)**
  Embedded chat assistant with support for commands, tools, memory, and server integration

* **📦 Tools & Scripts**
  Modular backend tool registry, system queries, automation endpoints, and developer scripts

---

## 📁 Project Structure

```
.
├── frontend/           # React frontend (store, chat, admin)
├── backend/            # Express backend (API, DB, auth, routes)
├── assistant/          # AI agent, tool system, LLM integration
├── nginx/              # NGINX config & reverse proxy files
├── test-files/         # Setup & test scripts
└── docker-compose.yml  # Full stack deployment
```

## 🧪 How to Build + Test

- Backend tests (preferred, in Docker): `docker compose run --rm backend npm test`
- Backend tests (local host): `cd backend && npm test`
- Frontend tests (CRA/Jest, requires frontend deps installed): `cd frontend && npm test -- --watchAll=false`
- Heightmap smoke (engine + gateway): `docker compose up --build -d heightmapengine backend nginx && bash scripts/smoke-heightmap.sh`
- See [docs/testing.md](docs/testing.md) for details and notes.

---

## ⚠️ Development Status

> This project is in **active development** and is not yet ready for public use or redistribution.
> Many components are experimental or tightly coupled with HexForge's infrastructure.

---

## 🔒 License

This repository is protected under a **temporary development license**.
You may read the code and use **small snippets** for learning purposes, but **reuse, redistribution, or deployment** is not allowed at this stage.

See [LICENSE.txt](./LICENSE.txt) for full terms.

---

## 📬 Contact

For questions, feedback, or collaboration inquiries:

**Robert Duff**
📧 [rduff@hexforgelabs.com](mailto:rduff@hexforgelabs.com)
🌐 [https://hexforgelabs.com](https://hexforgelabs.com)

---
