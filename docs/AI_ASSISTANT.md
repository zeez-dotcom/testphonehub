# AI Assistant Documentation

## System Architecture
- **Frontend:** React with Wouter routing, React Query, and custom UI components. Pages are rendered based on routes defined in `client/src/App.tsx`【F:client/src/App.tsx†L33-L51】.
- **Backend:** Express server using JWT auth and role-based middleware, with routes in `server/routes.ts` and persistence handled by a storage layer (`server/storage.ts`).
- **Database:** Postgres schema via Drizzle ORM linking users, sellers, products, orders, cart, and payments【F:shared/schema.ts†L70-L200】.

## Critical ID Relationships
- `sellers.userId` references the owning `users.id`, distinguishing seller profiles from basic user accounts【F:shared/schema.ts†L90-L118】.
- `products.sellerId` links listings to a seller record【F:shared/schema.ts†L122-L146】.
- `orders.customerId`/`orders.sellerId` tie each order to a buyer and seller, while cart items and payments reference users, products, and orders respectively【F:shared/schema.ts†L162-L200】.

## Frontend Routes and Pages
Paths from `App.tsx` map to the following pages. No page-level tests exist (`find client/src -name '*.test.tsx'` returned none).

### `/` or `/marketplace` – Marketplace
Buttons: "Browse Catalog", "Become a Seller", "Clear Filters", "Add to Cart"【F:client/src/pages/marketplace.tsx†L145-L158】【F:client/src/pages/marketplace.tsx†L204-L206】【F:client/src/pages/marketplace.tsx†L503-L517】 (implemented, not tested).

### `/product/:id` – Product Details
Buttons: "Back to Marketplace" and "Add to Cart"【F:client/src/pages/product-details.tsx†L118-L125】【F:client/src/pages/product-details.tsx†L222-L230】 (implemented, not tested).

### `/auth` – Unified Auth
Buttons: OAuth login/registration, email sign-in, admin login【F:client/src/pages/unified-auth.tsx†L232-L245】【F:client/src/pages/unified-auth.tsx†L288-L301】【F:client/src/pages/unified-auth.tsx†L308-L314】 (implemented, not tested).

### `/customer-dashboard`
Buttons: "Browse Products", quick actions "Track Order", "View Wishlist", "Update Profile"【F:client/src/pages/customer-dashboard.tsx†L73-L73】【F:client/src/pages/customer-dashboard.tsx†L138-L150】 (implemented, not tested).

### `/seller-dashboard`
Buttons: "Add Product", dialog actions "Cancel" and "Create/Update Product", row actions "Edit" and "Delete"【F:client/src/pages/seller-dashboard.tsx†L438-L447】【F:client/src/pages/seller-dashboard.tsx†L598-L616】【F:client/src/pages/seller-dashboard.tsx†L664-L679】 (implemented, not tested).

### `/seller-documents`
Button: "Submit Documents" for compliance uploads【F:client/src/pages/seller-documents.tsx†L372-L380】 (implemented, not tested).

### `/admin-panel`
Buttons: "Approve"/"Reject" pending items and "Save Settings"【F:client/src/pages/admin-panel.tsx†L748-L764】【F:client/src/pages/admin-panel.tsx†L1455-L1455】 (implemented, not tested).

### `/pos-system`
Buttons: quantity controls, "Cash Payment", "Card Payment", "Clear Cart"【F:client/src/pages/pos-system.tsx†L312-L341】【F:client/src/pages/pos-system.tsx†L380-L404】 (implemented, not tested).

### `/checkout`
Buttons: "Continue Shopping", "Continue to Payment", "Back to Shipping", "Place Order", "View Order Details"【F:client/src/pages/checkout.tsx†L188-L188】【F:client/src/pages/checkout.tsx†L318-L318】【F:client/src/pages/checkout.tsx†L405-L412】【F:client/src/pages/checkout.tsx†L430-L433】 (implemented, not tested).

### `*` – Not Found
No buttons; displays a static 404 message.

## Backend API Routes
Key routes and their current status:
- **POST /api/auth/register** – create user and optional seller profile【F:server/routes.ts†L196-L224】.
- **POST /api/auth/login** – JWT login for users/admins【F:server/routes.ts†L226-L241】.
- **GET /api/products** – list products with filters; marketplace exposes only approved items【F:server/routes.ts†L372-L389】.
- **POST /api/products** – create product for approved sellers; notifies admins of pending approval【F:server/routes.ts†L440-L475】.
- **Cart** – GET/POST/PUT endpoints manage user cart items【F:server/routes.ts†L528-L557】.
- **POST /api/orders** – create order from cart or POS, adjusts stock, clears cart【F:server/routes.ts†L613-L670】.
- **POST /api/payments** – simulate payment processing【F:server/routes.ts†L698-L731】.
- **GET /api/orders/:orderId/receipt** – generate receipt with seller, customer and payment details【F:server/routes.ts†L733-L748】.
- **PUT /api/sellers/documents** – submit compliance documents【F:server/routes.ts†L870-L895】.
- **Admin endpoints** – manage sellers, products, notifications, and settings【F:server/routes.ts†L798-L910】【F:server/routes.ts†L1136-L1151】【F:server/routes.ts†L1158-L1179】.
Most routes are implemented; seller rejection is a simplified success response without persistence.

## User Flows by Role
- **Customer:** Land on marketplace → view product → add to cart → checkout → order confirmation and receipts → track orders in dashboard.
- **Seller:** Register/login → submit documents → manage products in seller dashboard → process in‑store sales via POS → monitor orders and notifications.
- **Admin:** Log in → review seller documents and product submissions in admin panel → approve/reject items → adjust platform settings and notifications.

## Maintenance
Update this file whenever routes or features change to keep documentation accurate.
