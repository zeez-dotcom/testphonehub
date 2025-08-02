import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcrypt';

vi.mock('../storage', () => {
  const users = new Map<string, any>();
  const sellers = new Map<string, any>();
  const products = new Map<string, any>();
  const carts = new Map<string, any[]>();
  const orders = new Map<string, any>();
  let productSeq = 1;
  let orderSeq = 1;

  return {
    storage: {
      async createUser(data: any) {
        const hashed = await bcrypt.hash(data.password || '', 10);
        const id = `u${users.size + 1}`;
        const user = { id, ...data, password: hashed };
        users.set(id, user);
        return user;
      },
      async getUser(id: string) {
        return users.get(id);
      },
      async getUserByEmail(email: string) {
        for (const u of users.values()) {
          if (u.email === email) return u;
        }
        return undefined;
      },
      async createSeller(data: any) {
        const seller = { sellerId: `s${sellers.size + 1}`, status: 'pending', ...data };
        sellers.set(data.userId, seller);
        return seller;
      },
      async getSellerByUserId(userId: string) {
        const seller = sellers.get(userId);
        if (!seller) return undefined;
        const user = users.get(userId);
        return { ...seller, ...user };
      },
      async approveSeller(userId: string, _approvedBy: string) {
        const seller = sellers.get(userId);
        if (seller) seller.status = 'approved';
        return users.get(userId);
      },
      async createProduct(data: any) {
        const id = `p${productSeq++}`;
        const product = { id, ...data };
        products.set(id, product);
        return product;
      },
      async getProduct(id: string) {
        return products.get(id);
      },
      async createNotification(_n: any) {
        return {};
      },
      async getCartItems(userId: string) {
        return carts.get(userId) || [];
      },
      async addToCart(item: any) {
        const list = carts.get(item.userId) || [];
        const newItem = { id: `c${list.length + 1}`, ...item };
        list.push(newItem);
        carts.set(item.userId, list);
        return newItem;
      },
      async clearCart(userId: string) {
        carts.delete(userId);
      },
      async createOrder(data: any) {
        const id = `o${orderSeq++}`;
        const order = { id, ...data };
        orders.set(id, order);
        return order;
      },
      async updateProductStock(productId: string, qty: number) {
        const p = products.get(productId);
        if (p) p.stock += qty;
      },
      async getOrder(id: string) {
        return orders.get(id);
      },
      async updateOrder(id: string, updates: any) {
        const order = orders.get(id);
        if (order) Object.assign(order, updates);
        return order;
      },
      reset() {
        users.clear();
        sellers.clear();
        products.clear();
        carts.clear();
        orders.clear();
        productSeq = 1;
        orderSeq = 1;
      },
    },
  };
});

let registerRoutes: any;
let storage: any;

describe('marketplace flows', () => {
  const app = express();
  let server: any;
  let sellerId: string;
  let customerId: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'testsecret';
    ({ registerRoutes } = await import('../routes'));
    ({ storage } = await import('../storage'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    server = await registerRoutes(app);
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    storage.reset();
    const sellerUser = await storage.createUser({
      email: 'seller@example.com',
      password: 'sellerpass',
      firstName: 'Sell',
      lastName: 'Er',
      role: 'seller',
    });
    sellerId = sellerUser.id;
    await storage.createSeller({
      userId: sellerId,
      businessName: 'Test Seller',
      businessType: 'electronics',
      location: 'NY',
      experience: '1 year',
    });
    const customerUser = await storage.createUser({
      email: 'cust@example.com',
      password: 'custpass',
      firstName: 'Cust',
      lastName: 'Omer',
      role: 'customer',
    });
    customerId = customerUser.id;
  });

  it('admin login and seller approval lifecycle', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin', password: 'admin123' });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const approveRes = await request(app)
      .put(`/api/sellers/${sellerId}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(approveRes.status).toBe(200);
    const seller = await storage.getSellerByUserId(sellerId);
    expect(seller.status).toBe('approved');
  });

  it('seller product creation and order processing', async () => {
    const adminToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin', password: 'admin123' })).body.token;
    await request(app)
      .put(`/api/sellers/${sellerId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const sellerToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller@example.com', password: 'sellerpass' })).body.token;

    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Phone',
        description: 'Smartphone',
        brand: 'BrandA',
        category: 'phones',
        price: 100,
        stock: 5,
        condition: 'new',
      });
    expect(productRes.status).toBe(200);
    const productId = productRes.body.id;

    const customerToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'cust@example.com', password: 'custpass' })).body.token;

    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId, quantity: 2 });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({});
    expect(orderRes.status).toBe(200);
    const orderId = orderRes.body.id;

    const updateRes = await request(app)
      .put(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'shipped' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.status).toBe('shipped');

    const product = await storage.getProduct(productId);
    expect(product.stock).toBe(3);
  });

  it('customer checkout flow', async () => {
    const adminToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin', password: 'admin123' })).body.token;
    await request(app)
      .put(`/api/sellers/${sellerId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    const sellerToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller@example.com', password: 'sellerpass' })).body.token;
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Phone',
        description: 'Smartphone',
        brand: 'BrandA',
        category: 'phones',
        price: 100,
        stock: 1,
        condition: 'new',
      });
    const productId = productRes.body.id;

    const customerToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'cust@example.com', password: 'custpass' })).body.token;
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId, quantity: 1 });
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({});
    expect(orderRes.status).toBe(200);
    const cartItems = await storage.getCartItems(customerId);
    expect(cartItems.length).toBe(0);
  });
});

