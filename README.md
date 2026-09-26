# StockSense — Modular Inventory Management System (IMS)

StockSense is a high-performance, real-time inventory management platform engineered for multi-warehouse logistics, live catalog tracking, strict transactional stock movements, and intelligent anomaly detection.

---

## 🛠️ Technology Stack

### Backend Technologies (Developer: KarthikVeeranala)
- **Framework**: Python 3.11+, FastAPI (REST API with OpenAPI / Swagger documentation)
- **Database**: SQLite3 (ACID-compliant, Write-Ahead Logging `WAL` mode, foreign key enforcement)
- **Data Validation & Modeling**: Pydantic v2
- **Authentication**: JSON Web Tokens (JWT, HS256) + PBKDF2 with SHA-256 salted password hashing
- **Testing & Quality Assurance**: Pytest, Pytest-Asyncio, HTTPX TestClient
- **Server**: Uvicorn ASGI server

### Frontend Technologies (Developer: sathwik328)
- **Library & Framework**: React 18, Vite
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS, PostCSS, Lucide React Icons
- **Routing & State**: React Router v6, Context API
- **Testing & DOM Automation**: Headless Google Chrome automation via Puppeteer-Core

---

## 📐 System Architecture & Data Flow

```
[ Vite React Frontend ]
      │
      │ HTTP / REST API (Bearer JWT)
      ▼
[ FastAPI Backend Engine ]
      │
      ├─► Auth Service (PBKDF2 + JWT + In-Memory OTP)
      ├─► Catalog Service (Dynamic On-Hand Stock Aggregation)
      ├─► Operations Engine (Atomic State Machine: Receipts, Deliveries, Transfers, Adjustments)
      └─► Intelligence Service (Dynamic Reorder Forecasting & Anomaly Detection)
      │
      ▼
[ SQLite Database (WAL Mode) ]
      ├─► users
      ├─► warehouses & locations (2-Level Hierarchy: Warehouse -> Location/Rack)
      ├─► categories & products (Authoritative SKU Catalog)
      ├─► stock_levels (Real-time on-hand balances per location)
      ├─► operations & operation_lines (Draft -> Done lifecycle)
      └─► stock_ledger (Immutable chronological audit log)
```

---

## 🚀 Key Inventory Capabilities

1. **Strict 2-Level Location Hierarchy**: Direct mapping from `Warehouse` to storage `Location` (Rack/Bay) without unnecessary nested zones or aisle complexity.
2. **Atomic Inventory State Machine**:
   - `RECEIPT`: Check in supplier shipments, atomically incrementing rack inventory and generating audit ledger records.
   - `DELIVERY`: Pick and pack outbound orders. Enforces strict **Negative Stock Guards** (`INSUFFICIENT_STOCK` 400 rollback) so stock can never go below zero.
   - `TRANSFER`: Move stock between locations with zero net variance across the enterprise.
   - `ADJUSTMENT`: Reconcile physical cycle counts against book inventory, automatically logging positive/negative discrepancy deltas.
3. **Immutable Audit Trail (`stock_ledger`)**: Every stock increment, decrement, and transfer records `balance_after`, timestamps, and user identities.
4. **Visual Warehouse 2D Heatmap**: Real-time bay occupancy metrics and capacity utilization percentages computed dynamically.

---

## 💻 Quick Start & Running Locally

### Backend Setup
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```
API Documentation is live at `http://localhost:8000/docs`.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
UI dashboard is live at `http://localhost:3000`.

### Running Automated Test Suites
- **Backend Tests (Pytest)**:
  ```bash
  cd backend
  pytest -v
  ```
- **Chrome DOM End-to-End Test**:
  ```bash
  cd frontend
  node test_phase2_extended_dom.js
  ```