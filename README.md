# SmartQR — Restaurant Ordering System

Real-time QR-based restaurant ordering platform with customer menu, live kitchen display, and admin dashboard.

---

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Lucide Icons
- **Backend**: Node.js + Express.js
- **Real-time**: Socket.io
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT + Zustand

---

## Project Structure
```
smartqr/
├── backend/
│   ├── models/          # Mongoose models (Restaurant, MenuItem, Order)
│   ├── routes/          # Express routes (auth, menu, orders, tables, restaurant)
│   ├── middleware/       # JWT auth middleware
│   ├── socket/          # Socket.io event handler
│   ├── seed.js          # Demo data seeder
│   └── server.js        # Entry point
└── frontend/
    ├── app/
    │   ├── page.js                          # Login / Register
    │   ├── restaurant/[restaurantId]/       # Customer menu page
    │   ├── order/[id]/                      # Order tracking page
    │   ├── kitchen/                         # Kitchen display
    │   └── admin/                           # Admin dashboard
    │       ├── page.js                      # Dashboard (stats + active orders)
    │       ├── orders/                      # All orders with filters
    │       ├── menu/                        # Menu CRUD
    │       ├── tables/                      # Tables + QR generation
    │       └── settings/                    # Restaurant profile
    ├── store/useAuthStore.js                # Zustand auth store
    └── lib/api.js                           # API helpers + formatters
```

---

## Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)

---

### 1. Backend Setup

```bash
cd smartqr/backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env — set your MONGODB_URI and JWT_SECRET

# Seed demo data (optional but recommended)
npm run seed

# Start development server
npm run dev
```

Backend runs on **http://localhost:5000**

---

### 2. Frontend Setup

```bash
cd smartqr/frontend

# Install dependencies
npm install

# Create env file
cp .env.local.example .env.local

# Start development server
npm run dev
```

Frontend runs on **http://localhost:3000**

---

## Demo Login

After running `npm run seed` in the backend:

```
Email:    demo@smartqr.app
Password: demo1234
```

---

## Key URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Login / Register |
| `http://localhost:3000/admin` | Admin Dashboard |
| `http://localhost:3000/admin/orders` | All Orders |
| `http://localhost:3000/admin/menu` | Menu Management |
| `http://localhost:3000/admin/tables` | Tables & QR Codes |
| `http://localhost:3000/admin/settings` | Restaurant Settings |
| `http://localhost:3000/restaurant/[id]?table=Table1` | Customer Menu |
| `http://localhost:3000/order/[orderId]` | Order Tracking |
| `http://localhost:3000/kitchen?rid=[id]&token=[jwt]` | Kitchen Display |

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register restaurant |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current restaurant |
| PUT | `/api/auth/me` | Update profile |

### Menu
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/menu/restaurant/:id` | No | Public menu |
| GET | `/api/menu` | Yes | All items (admin) |
| POST | `/api/menu` | Yes | Create item |
| PUT | `/api/menu/:id` | Yes | Update item |
| DELETE | `/api/menu/:id` | Yes | Delete item |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders` | No | Place order |
| GET | `/api/orders/:id` | No | Track order |
| GET | `/api/orders` | Yes | All orders |
| PATCH | `/api/orders/:id/status` | Yes | Update status |
| GET | `/api/orders/stats/sales` | Yes | Sales stats |

### Tables
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tables` | Yes | Get tables |
| PUT | `/api/tables` | Yes | Update tables |
| GET | `/api/tables/qr/:table` | Yes | Generate QR |

---

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-restaurant` | Client → Server | Admin/kitchen joins room |
| `join-order` | Client → Server | Customer joins order room |
| `new-order` | Server → Restaurant | New order placed |
| `order-updated` | Server → Customer | Status changed (tracking) |
| `order-status-changed` | Server → Restaurant | Status changed (kitchen/admin) |

---

## Customer Flow

1. Scan QR code → `/restaurant/[id]?table=Table1`
2. Browse menu, add to cart
3. Confirm order (no payment required)
4. Redirect to `/order/[orderId]` for live tracking
5. Real-time status updates via Socket.io

## Admin Flow

1. Login at `/`
2. Dashboard shows live orders + today's stats
3. Update order status → triggers real-time updates
4. Print bills via thermal-ready print dialog
5. Kitchen Display link opens `/kitchen` in new tab

---

## Production Deployment

### Backend (Railway / Render / VPS)
```bash
# Set environment variables:
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secure_random_string
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app
```
