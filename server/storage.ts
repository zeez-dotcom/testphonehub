import {
  users,
  sellers,
  products,
  productImages,
  orders,
  cart,
  payments,
  notifications,
  adminSettings,
  reviews,
  inventoryLogs,
  type User,
  type InsertUser,
  type Seller,
  type InsertSeller,
  type Product,
  type InsertProduct,
  type ProductImage,
  type InsertProductImage,
  type Order,
  type InsertOrder,
  type CartItem,
  type InsertCartItem,
  type Payment,
  type InsertPayment,
  type Review,
  type InsertReview,
  type InventoryLog,
  type InsertInventoryLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;

  // Seller operations (sellers are users with role='seller')
  getSeller(id: string): Promise<Seller | undefined>;
  getSellerByUserId(userId: string): Promise<any>;
  getSellerAnalytics(sellerId: string): Promise<any>;
  createSeller(seller: InsertSeller): Promise<Seller>;
  updateSeller(id: string, updates: Partial<Seller>): Promise<Seller>;
  getPendingSellers(): Promise<any[]>;
  getApprovedSellers(): Promise<any[]>;
  getAllSellers(): Promise<User[]>;
  approveSeller(sellerId: string, approvedBy: string): Promise<User>;
  getSellersWithDocuments(): Promise<any[]>;
  getCustomers(): Promise<User[]>;

  // Product operations
  getProduct(id: string): Promise<Product | undefined>;
  getProducts(filters?: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    search?: string;
    sellerId?: string;
  }): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Product image operations
  createProductImage(image: InsertProductImage): Promise<ProductImage>;
  listProductImages(productId: string): Promise<ProductImage[]>;
  deleteProductImage(id: string): Promise<void>;

  // Cart operations
  getCartItems(userId: string): Promise<CartItem[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem>;
  removeFromCart(id: string): Promise<void>;
  clearCart(userId: string): Promise<void>;

  // Order operations
  getOrder(id: string): Promise<Order | undefined>;
  getOrders(filters?: {
    customerId?: string;
    sellerId?: string;
    status?: string;
  }): Promise<Order[]>;
  getSellerOrders(sellerId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order>;

  // Payment operations
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByOrderId(orderId: string): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment>;

  // Notification operations
  createNotification(notification: {
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    metadata?: any;
    sellerId?: string; // For seller-specific notifications
  }): Promise<any>;
  getNotifications(limit?: number): Promise<any[]>;
  getSellerNotifications(sellerId: string, limit?: number): Promise<any[]>;
  markNotificationRead(id: string): Promise<void>;

  // Admin settings operations
  getAdminSetting(key: string): Promise<string | undefined>;
  setAdminSetting(key: string, value: string, description?: string): Promise<void>;

  // Product approval operations
  getPendingProducts(): Promise<Product[]>;
  approveProduct(productId: string, approvedBy: string): Promise<Product>;
  rejectProduct(productId: string, reason: string): Promise<Product>;

  // Analytics
  getSellerStats(sellerId: string): Promise<{
    totalSales: string;
    activeProducts: number;
    pendingOrders: number;
    rating: string;
  }>;
  getPlatformStats(): Promise<{
    totalRevenue: string;
    activeSellers: number;
    totalOrders: number;
    pendingApprovals: number;
  }>;

  // Reviews operations
  createReview(review: InsertReview): Promise<Review>;
  getProductReviews(productId: string): Promise<Review[]>;
  getUserReviews(userId: string): Promise<Review[]>;
  updateReview(id: string, updates: Partial<Review>): Promise<Review>;
  deleteReview(id: string): Promise<void>;

  // Inventory operations
  logInventoryChange(log: InsertInventoryLog): Promise<InventoryLog>;
  getProductInventoryLogs(productId: string): Promise<InventoryLog[]>;
  updateProductStock(productId: string, quantityChange: number, reason: string, orderId?: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

    async createUser(userData: InsertUser): Promise<User> {
      const hashedPassword = await bcrypt.hash(userData.password ?? "", 10);
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          password: hashedPassword,
        })
        .returning();
      return user;
    }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Seller operations
  async getSeller(id: string): Promise<Seller | undefined> {
    const [seller] = await db.select().from(sellers).where(eq(sellers.id, id));
    return seller;
  }

  async getSellerByUserId(userId: string): Promise<any> {
    const [result] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          sellerId: sellers.id,
          status: sellers.status,
          businessName: sellers.businessName,
          businessType: sellers.businessType,
          location: sellers.location,
          phoneNumber: sellers.phoneNumber,
          shopLicenseNumber: sellers.shopLicenseNumber,
          ownerCivilId: sellers.ownerCivilId,
          businessAddress: sellers.businessAddress,
          whatsappNumber: sellers.whatsappNumber,
          // Document fields
          businessLogo: sellers.businessLogo,
          shopLicenseImage: sellers.shopLicenseImage,
          ownerCivilIdImage: sellers.ownerCivilIdImage,
          ownerPhoto: sellers.ownerPhoto
        })
        .from(users)
        .innerJoin(sellers, eq(users.id, sellers.userId))
        .where(and(eq(users.id, userId), eq(users.role, "seller")));
    
    return result || undefined;
  }

  async getSellerAnalytics(sellerId: string): Promise<any> {
    // Get seller's basic stats
    const [totalOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.sellerId, sellerId));

    const [totalRevenue] = await db
      .select({ total: sql<string>`COALESCE(sum(total), 0)` })
      .from(orders)
      .where(and(eq(orders.sellerId, sellerId), eq(orders.status, "delivered")));

    const [productCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.sellerId, sellerId));

    const [pendingOrderCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(eq(orders.sellerId, sellerId), eq(orders.status, "pending")));

    return {
      totalSales: totalRevenue?.total || "0",
      activeProducts: productCount?.count || 0,
      pendingOrders: pendingOrderCount?.count || 0,
      totalOrders: totalOrders?.count || 0,
      rating: "4.5" // Placeholder for now
    };
  }

  async createSeller(sellerData: InsertSeller): Promise<Seller> {
    const [seller] = await db.insert(sellers).values(sellerData).returning();
    return seller;
  }

  async updateSeller(id: string, updates: Partial<Seller>): Promise<Seller> {
    const [seller] = await db
      .update(sellers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sellers.id, id))
      .returning();
    return seller;
  }

  async getPendingSellers(): Promise<any[]> {
    // Join with sellers table to get only pending sellers with Kuwait compliance data
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        sellerStatus: sellers.status,
        businessName: sellers.businessName,
        businessType: sellers.businessType,
        location: sellers.location,
        phoneNumber: sellers.phoneNumber,
        shopLicenseNumber: sellers.shopLicenseNumber,
        ownerCivilId: sellers.ownerCivilId,
        businessAddress: sellers.businessAddress,
        whatsappNumber: sellers.whatsappNumber
      })
      .from(users)
      .innerJoin(sellers, eq(users.id, sellers.userId))
      .where(and(eq(users.role, "seller"), eq(sellers.status, "pending")))
      .orderBy(desc(users.createdAt));
    
    return result;
  }

  async getApprovedSellers(): Promise<any[]> {
    // Join with sellers table to get only approved sellers with Kuwait compliance data
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        sellerStatus: sellers.status,
        businessName: sellers.businessName,
        businessType: sellers.businessType,
        location: sellers.location,
        phoneNumber: sellers.phoneNumber,
        shopLicenseNumber: sellers.shopLicenseNumber,
        ownerCivilId: sellers.ownerCivilId,
        businessAddress: sellers.businessAddress,
        whatsappNumber: sellers.whatsappNumber
      })
      .from(users)
      .innerJoin(sellers, eq(users.id, sellers.userId))
      .where(and(eq(users.role, "seller"), eq(sellers.status, "approved")))
      .orderBy(desc(users.createdAt));
    
    return result;
  }

  async getSellersWithDocuments(): Promise<any[]> {
    // Get all sellers with their document status for admin review
    const result = await db
      .select({
        id: sellers.id,
        userId: sellers.userId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        businessName: sellers.businessName,
        businessType: sellers.businessType,
        phoneNumber: sellers.phoneNumber,
        whatsappNumber: sellers.whatsappNumber,
        businessAddress: sellers.businessAddress,
        shopLicenseNumber: sellers.shopLicenseNumber,
        ownerCivilId: sellers.ownerCivilId,
        status: sellers.status,
        // Document files
        businessLogo: sellers.businessLogo,
        shopLicenseImage: sellers.shopLicenseImage,
        ownerCivilIdImage: sellers.ownerCivilIdImage,
        ownerPhoto: sellers.ownerPhoto,
        approvedAt: sellers.approvedAt,
        approvedBy: sellers.approvedBy,
        createdAt: sellers.createdAt,
        updatedAt: sellers.updatedAt,
      })
      .from(sellers)
      .innerJoin(users, eq(sellers.userId, users.id))
      .orderBy(desc(sellers.updatedAt));
    
    return result;
  }

  async getCustomers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "customer"))
      .orderBy(desc(users.createdAt));
  }

  async getAllSellers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "seller"))
      .orderBy(desc(users.createdAt));
  }

  async approveSeller(sellerId: string, approvedBy: string): Promise<User> {
    // Update seller status in sellers table
    await db
      .update(sellers)
      .set({ 
        status: "approved",
        approvedAt: new Date(),
        approvedBy: approvedBy,
        updatedAt: new Date()
      })
      .where(eq(sellers.userId, sellerId));

    // Get and return the updated user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, sellerId));
    
    return user;
  }

  // Product operations
  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProducts(filters?: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    search?: string;
    sellerId?: string;
    status?: string;
    includeInactive?: boolean;
  }): Promise<Product[]> {
    const conditions = [];
    
    // Only filter by isActive if not requesting seller's own products
    if (!filters?.includeInactive && !filters?.sellerId) {
      conditions.push(eq(products.isActive, true));
    }

    if (filters) {
      if (filters.category) {
        conditions.push(eq(products.category, filters.category));
      }
      
      if (filters.brand) {
        conditions.push(eq(products.brand, filters.brand));
      }
      
      if (filters.condition) {
        conditions.push(eq(products.condition, filters.condition as any));
      }
      
      if (filters.sellerId) {
        conditions.push(eq(products.sellerId, filters.sellerId));
      }

      if (filters.status) {
        conditions.push(eq(products.status, filters.status as any));
      }
      
      if (filters.minPrice) {
        conditions.push(sql`${products.price} >= ${filters.minPrice}`);
      }
      
      if (filters.maxPrice) {
        conditions.push(sql`${products.price} <= ${filters.maxPrice}`);
      }
      
      if (filters.search) {
        conditions.push(
          or(
            like(products.name, `%${filters.search}%`),
            like(products.description, `%${filters.search}%`),
            like(products.brand, `%${filters.search}%`)
          )
        );
      }
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(desc(products.createdAt));
    } else {
      return await db
        .select()
        .from(products)
        .orderBy(desc(products.createdAt));
    }
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(productData).returning();
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async createProductImage(image: InsertProductImage): Promise<ProductImage> {
    const [result] = await db
      .insert(productImages)
      .values(image)
      .returning();
    return result;
  }

  async listProductImages(productId: string): Promise<ProductImage[]> {
    return await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.displayOrder, productImages.createdAt);
  }

  async deleteProductImage(id: string): Promise<void> {
    await db.delete(productImages).where(eq(productImages.id, id));
  }

  // Cart operations
  async getCartItems(userId: string): Promise<CartItem[]> {
    return await db.select().from(cart).where(eq(cart.userId, userId));
  }

  async addToCart(cartData: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const [existing] = await db
      .select()
      .from(cart)
      .where(
        and(
          eq(cart.userId, cartData.userId),
          eq(cart.productId, cartData.productId)
        )
      );

    if (existing) {
      // Update quantity if item exists
      const [updated] = await db
        .update(cart)
        .set({ 
          quantity: existing.quantity + (cartData.quantity || 1),
          updatedAt: new Date()
        })
        .where(eq(cart.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new cart item
      const [newItem] = await db.insert(cart).values(cartData).returning();
      return newItem;
    }
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem> {
    const [updated] = await db
      .update(cart)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(cart.id, id))
      .returning();
    return updated;
  }

  async removeFromCart(id: string): Promise<void> {
    await db.delete(cart).where(eq(cart.id, id));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cart).where(eq(cart.userId, userId));
  }

  // Order operations
  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrders(filters?: {
    customerId?: string;
    sellerId?: string;
    status?: string;
  }): Promise<Order[]> {
    if (filters) {
      const conditions = [];
      
      if (filters.customerId) {
        conditions.push(eq(orders.customerId, filters.customerId));
      }
      
      if (filters.sellerId) {
        conditions.push(eq(orders.sellerId, filters.sellerId));
      }
      
      if (filters.status) {
        conditions.push(eq(orders.status, filters.status as any));
      }

      if (conditions.length > 0) {
        return await db
          .select()
          .from(orders)
          .where(and(...conditions))
          .orderBy(desc(orders.createdAt));
      }
    }

    return await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));
  }

  async getSellerOrders(sellerId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.sellerId, sellerId))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  // Payment operations
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.orderId, orderId));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(paymentData).returning();
    return payment;
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  // Analytics
  async getSellerStats(sellerId: string): Promise<{
    totalSales: string;
    activeProducts: number;
    pendingOrders: number;
    rating: string;
  }> {
    const [salesResult] = await db
      .select({
        totalSales: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, sellerId),
          eq(orders.status, "delivered")
        )
      );

    const [productsResult] = await db
      .select({
        activeProducts: sql<number>`COUNT(*)`,
      })
      .from(products)
      .where(
        and(
          eq(products.sellerId, sellerId),
          eq(products.isActive, true)
        )
      );

    const [ordersResult] = await db
      .select({
        pendingOrders: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, sellerId),
          or(
            eq(orders.status, "pending"),
            eq(orders.status, "processing")
          )
        )
      );

    const [ratingResult] = await db
      .select({
        rating: sql<string>`COALESCE(AVG(${products.rating}), 0)`,
      })
      .from(products)
      .where(eq(products.sellerId, sellerId));

    return {
      totalSales: salesResult.totalSales || "0",
      activeProducts: productsResult.activeProducts || 0,
      pendingOrders: ordersResult.pendingOrders || 0,
      rating: parseFloat(ratingResult.rating || "0").toFixed(1),
    };
  }

  async getPlatformStats(): Promise<{
    totalRevenue: string;
    activeSellers: number;
    totalOrders: number;
    pendingApprovals: number;
  }> {
    const [revenueResult] = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(eq(orders.status, "delivered"));

    const [sellersResult] = await db
      .select({
        activeSellers: sql<number>`COUNT(*)`,
      })
      .from(sellers)
      .where(eq(sellers.status, "approved"));

    const [ordersResult] = await db
      .select({
        totalOrders: sql<number>`COUNT(*)`,
      })
      .from(orders);

    const [approvalsResult] = await db
      .select({
        pendingApprovals: sql<number>`COUNT(*)`,
      })
      .from(sellers)
      .where(eq(sellers.status, "pending"));

    return {
      totalRevenue: revenueResult.totalRevenue || "0",
      activeSellers: sellersResult.activeSellers || 0,
      totalOrders: ordersResult.totalOrders || 0,
      pendingApprovals: approvalsResult.pendingApprovals || 0,
    };
  }

  // Notification operations
  async createNotification(notification: {
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    metadata?: any;
    sellerId?: string;
  }): Promise<any> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async getNotifications(limit = 50): Promise<any[]> {
    const result = await db
      .select()
      .from(notifications)
      .where(sql`seller_id IS NULL`) // Admin notifications
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return result;
  }

  async getSellerNotifications(sellerId: string, limit = 50): Promise<any[]> {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.sellerId, sellerId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return result;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // Admin settings operations
  async getAdminSetting(key: string): Promise<string | undefined> {
    const [result] = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.key, key));
    return result?.value;
  }

  async setAdminSetting(key: string, value: string, description?: string): Promise<void> {
    await db
      .insert(adminSettings)
      .values({ key, value, description })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value, description, updatedAt: new Date() }
      });
  }

  // Product approval operations
  async getPendingProducts(): Promise<Product[]> {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.status, "pending"))
      .orderBy(desc(products.createdAt));
    return result;
  }

  async approveProduct(productId: string, approvedBy: string): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ 
        status: "approved", 
        approvedAt: new Date(), 
        approvedBy,
        updatedAt: new Date() 
      })
      .where(eq(products.id, productId))
      .returning();
    return product;
  }

  async rejectProduct(productId: string, reason: string): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ 
        status: "rejected", 
        rejectionReason: reason,
        updatedAt: new Date() 
      })
      .where(eq(products.id, productId))
      .returning();
    return product;
  }

  // Reviews operations
  async createReview(review: InsertReview): Promise<Review> {
    const [result] = await db.insert(reviews).values(review).returning();
    
    // Update product rating and review count
    const productReviews = await db
      .select({ rating: reviews.rating })
      .from(reviews)
      .where(eq(reviews.productId, review.productId));
    
    const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    
    await db
        .update(products)
        .set({
          rating: avgRating.toFixed(1),
          reviewCount: productReviews.length,
          updatedAt: new Date()
        })
      .where(eq(products.id, review.productId));
    
    return result;
  }

  async getProductReviews(productId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt));
  }

  async updateReview(id: string, updates: Partial<Review>): Promise<Review> {
    const [result] = await db
      .update(reviews)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return result;
  }

  async deleteReview(id: string): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  // Inventory operations
  async logInventoryChange(log: InsertInventoryLog): Promise<InventoryLog> {
    const [result] = await db.insert(inventoryLogs).values(log).returning();
    return result;
  }

  async getProductInventoryLogs(productId: string): Promise<InventoryLog[]> {
    return await db
      .select()
      .from(inventoryLogs)
      .where(eq(inventoryLogs.productId, productId))
      .orderBy(desc(inventoryLogs.createdAt));
  }

  async updateProductStock(productId: string, quantityChange: number, reason: string, orderId?: string): Promise<void> {
    // Get current product stock
    const [product] = await db
      .select({ stock: products.stock })
      .from(products)
      .where(eq(products.id, productId));
    
    if (!product) throw new Error("Product not found");
    
    const previousQuantity = product.stock;
    const newQuantity = previousQuantity + quantityChange;
    
    // Update product stock
    await db
      .update(products)
      .set({ 
        stock: newQuantity,
        updatedAt: new Date()
      })
      .where(eq(products.id, productId));
    
    // Log the inventory change
    await this.logInventoryChange({
      productId,
      changeType: quantityChange > 0 ? 'restock' : 'sale',
      quantityChange,
      previousQuantity,
      newQuantity,
      reason,
      orderId
    });
  }
}

export const storage = new DatabaseStorage();
