# AI Assistant Documentation

## System Architecture
- **Frontend:** React + TypeScript using Wouter for routing and React Query for data fetching. Entry point `client/src/App.tsx` defines routes; individual pages live under `client/src/pages/`.
- **Backend:** Express server exposing API routes in `server/routes.ts` with persistence handled by `server/storage.ts`.
- **Database:** Postgres accessed via Drizzle ORM defined in `shared/schema.ts` linking users, sellers, products, carts, orders, and payments.

## Critical ID Relationships
- `sellers.userId` links a seller profile to its base `users` record.
- `products.sellerId` ties each product to its seller.
- `orders.customerId` and `orders.sellerId` associate each order to buyer and seller.
- Cart items and payments reference users, products, and orders to maintain integrity.

## Frontend Routes and Pages
All routes are defined in `client/src/App.tsx`. No page tests exist.

| Route | Page | Buttons (implemented) | Tested? |
|-------|------|-----------------------|---------|
| `/` or `/marketplace` | Marketplace | Browse Catalog, Become a Seller, Clear Filters, Add to Cart | No |
| `/product/:id` | Product Details | Back to Marketplace, Add to Cart | No |
| `/auth` | Unified Auth | OAuth login/registration, Email sign-in, Admin login | No |
| `/customer-dashboard` | Customer Dashboard | Browse Products, Track Order, View Wishlist, Update Profile | No |
| `/seller-dashboard` | Seller Dashboard | Add Product, Cancel, Create/Update Product, Edit, Delete | No |
| `/seller-documents` | Seller Documents | Submit Documents | No |
| `/admin-panel` | Admin Panel | Approve, Reject, Save Settings | No |
| `/pos-system` | POS System | Quantity controls, Cash Payment, Card Payment, Clear Cart | No |
| `/checkout` | Checkout | Continue Shopping, Continue to Payment, Back to Shipping, Place Order, View Order Details | No |
| `*` | Not Found | None | No |

## Backend API Routes
Key endpoints in `server/routes.ts` and `server/storage.ts`:

| Route | Purpose | Parameters | Status |
|-------|---------|------------|--------|
| POST `/api/auth/register` | create user and optional seller profile | body: user data, optional seller fields | Implemented |
| POST `/api/auth/login` | authenticate user and issue JWT | body: email, password | Implemented |
| GET `/api/products` | list products with filters | query: search, category, page | Implemented |
| POST `/api/products` | create product for approved sellers | body: product fields; headers: auth token | Implemented |
| Cart endpoints | manage user cart items | path: `/api/cart`, `/api/cart/:id` | Implemented |
| POST `/api/orders` | create order from cart or POS | body: cartId or items | Implemented |
| POST `/api/payments` | simulate payment processing | body: orderId, method | Implemented |
| GET `/api/orders/:id/receipt` | generate order receipt | path param `id` | Implemented |
| PUT `/api/sellers/documents` | upload compliance docs | multipart/form-data | Implemented |
| Admin endpoints | manage sellers, products, notifications, settings | path: `/api/admin/*` | Mixed; seller rejection simplified |

## User Flows by Role
- **Customer:** Visit marketplace → view products → add to cart → checkout → receive order and receipt → manage orders in dashboard.
- **Seller:** Register/login → submit documents → manage products in seller dashboard → process POS sales → monitor orders and notifications.
- **Admin:** Log in → review seller documents and product submissions in admin panel → approve/reject items → adjust platform settings and notifications.

## Maintenance
Update this file whenever routes, IDs, or feature behavior changes.
