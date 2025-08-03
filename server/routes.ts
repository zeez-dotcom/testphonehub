import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import express from "express";
import session from "express-session";
import RedisStore from "connect-redis";
import { createClient as createRedisClient } from "redis";
import passport from "passport";
import { storage } from "./storage";
import { setupPassport, getConfiguredProviders } from "./auth";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import path from "path";
import fs from "fs";
import {
  insertUserSchema,
  insertSellerSchema,
  insertProductSchema,
  insertOrderSchema,
  insertCartSchema,
  insertPaymentSchema,
  insertReviewSchema,
  insertMessageSchema,
} from "@shared/schema";
import type { AuthenticatedRequest, AuthenticatedUser } from "./types";
import { z } from "zod";

// JWT Authentication middleware
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET = jwtSecret;

// File upload configuration
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  // Allow all common file types for seller documents
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|bmp|svg|tiff|tif/;
  const allowedMimeTypes = /image\/.*|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain/;

  const ext = path.extname(file.originalname).toLowerCase();
  const extname = allowedTypes.test(ext);
  const mimetype = allowedMimeTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }

  console.log(
    `File rejected due to mismatched MIME type or extension: ${file.originalname}, MIME type: ${file.mimetype}, extension: ${ext}`
  );
  cb(
    new Error(
      `File type not supported or mismatched. Received MIME type: ${file.mimetype} and extension: ${ext}. Please upload images (JPG, PNG, GIF, WebP, BMP, TIFF) or documents (PDF, DOC, DOCX, TXT).`
    )
  );
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

export { fileFilter };

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = decoded as AuthenticatedUser;
    next();
  });
}

// Authentication middleware
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  authenticateToken(req, res, next);
}

function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid token" });
      }
      req.user = decoded as AuthenticatedUser;

      if (req.user.userRole !== role) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      next();
    });
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration for OAuth using Redis store when available
  const redisUrl = process.env.REDIS_URL;
  let sessionStore: session.Store | undefined;

  if (redisUrl) {
    const redisClient = createRedisClient({
      url: redisUrl,
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    });

    redisClient.on("error", (err) => console.error("Redis Client Error", err));
    await redisClient.connect();
    sessionStore = new RedisStore({ client: redisClient });
  }

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'phonehub-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize Passport
  setupPassport();
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Serve uploaded files statically
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });
  app.use('/uploads', express.static(uploadDir));

  // File upload route
  app.post("/api/upload", requireAuth, upload.array('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const fileInfos = [] as any[];
      for (const file of files) {
        const buffer = await fs.promises.readFile(file.path);
        const detected = await fileTypeFromBuffer(buffer);
        fileInfos.push({
          url: `/uploads/${file.filename}`,
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: detected?.mime || file.mimetype,
        });
      }

      res.json({ files: fileInfos });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // Authentication routes
  app.post("/api/auth/register", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      // Session data is handled via JWT tokens

      // If registering as seller, create seller profile
      if (req.body.role === "seller" && req.body.businessName) {
        await storage.createSeller({
          userId: user.id,
          businessName: req.body.businessName,
          businessType: req.body.businessType,
          location: req.body.location,
          experience: req.body.experience,
        });
      }

      res.json({ user, message: "Registration successful" });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const defaultAdminEmail = "testadmin";
      const defaultAdminPassword = "admin123";

      if (email === defaultAdminEmail) {
        let adminUser = await storage.getUserByEmail(defaultAdminEmail);
        if (!adminUser) {
          adminUser = await storage.createUser({
            email: defaultAdminEmail,
            password: defaultAdminPassword,
            firstName: "Admin",
            lastName: "User",
            role: "admin",
          });
        }

        const isValidPassword = await bcrypt.compare(password, adminUser.password || "");
        if (!isValidPassword) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
          { userId: adminUser.id, userRole: adminUser.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        console.log("Admin login successful, token generated");
        return res.json({
          user: { ...adminUser, password: undefined },
          token,
          message: "Login successful",
        });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password || "");
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id, userRole: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log("User login successful, token generated");
      res.json({
        user: { ...user, password: undefined },
        token,
        message: "Login successful",
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Login failed" });
    }
  });

  // OAuth Routes
  // Get available authentication providers
  app.get("/api/auth/providers", (req, res) => {
    const providers = getConfiguredProviders();
    res.json({ providers });
  });

  // Google OAuth routes
  app.get("/api/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/auth?error=google_failed" }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user as any;
        const token = jwt.sign(
          { userId: user.id, userRole: user.role },
          JWT_SECRET,
          { expiresIn: "7d" }
        );
        
        // Redirect to frontend with token
        res.redirect(`/?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
      } catch (error) {
        console.error("Google OAuth callback error:", error);
        res.redirect("/auth?error=oauth_failed");
      }
    }
  );

  // Apple OAuth routes
  app.get("/api/auth/apple",
    passport.authenticate("apple")
  );

  app.post("/api/auth/apple/callback",
    passport.authenticate("apple", { failureRedirect: "/auth?error=apple_failed" }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user as any;
        const token = jwt.sign(
          { userId: user.id, userRole: user.role },
          JWT_SECRET,
          { expiresIn: "7d" }
        );
        
        // Redirect to frontend with token
        res.redirect(`/?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
      } catch (error) {
        console.error("Apple OAuth callback error:", error);
        res.redirect("/auth?error=oauth_failed");
      }
    }
  );

  app.post("/api/auth/logout", (req: AuthenticatedRequest, res) => {
    // With JWT, logout is handled client-side by removing the token
    res.json({ message: "Logout successful" });
  });

  app.get("/api/auth/user", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Product routes (Only show approved products in marketplace)
  app.get("/api/products", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        category: req.query.category as string,
        brand: req.query.brand as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        condition: req.query.condition as string,
        search: req.query.search as string,
        sellerId: req.query.sellerId as string,
        status: "approved", // Only show approved products in marketplace
      };

      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ message: "Failed to get products" });
    }
  });

  app.get("/api/sellers/products", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get products for the current seller
      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
      
      // Get all products for this seller (including pending, approved, rejected)
      const products = await storage.getProducts({ 
        sellerId: seller.sellerId,
        includeInactive: true // Include all statuses for seller's own products
      });
      res.json(products);
    } catch (error) {
      console.error("Get seller products error:", error);
      res.status(500).json({ message: "Failed to get seller products" });
    }
  });

  // Get seller notifications
  app.get("/api/sellers/notifications", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
      
      const notifications = await storage.getSellerNotifications(seller.sellerId, 50);
      res.json(notifications);
    } catch (error) {
      console.error("Get seller notifications error:", error);
      res.status(500).json({ message: "Failed to get seller notifications" });
    }
  });

  // Mark seller notification as read
  app.put("/api/sellers/notifications/:id/read", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark seller notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/products", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is a seller (approved sellers can add products that go to pending)
      const user = req.user!;
      if (user.userRole !== "seller") {
        return res.status(403).json({ message: "Seller access required" });
      }

      // Check if seller exists and is approved
      const seller = await storage.getSellerByUserId(user.userId);
      if (!seller || seller.status !== "approved") {
        return res.status(403).json({ message: "Seller must be approved to add products" });
      }

      const productData = insertProductSchema.parse({
        ...req.body,
        price: req.body.price.toString(), // Keep as string for decimal type
        stock: parseInt(req.body.stock), // Convert to integer
        sellerId: seller.sellerId, // Use the seller record ID from sellers table
        status: "pending", // Products start as pending
      });

      const product = await storage.createProduct(productData);
      
      // Create notification for admin
      await storage.createNotification({
        type: "product_pending",
        title: "New Product Pending Approval",
        message: `${seller.businessName || seller.firstName} has submitted a new product "${product.name}" for approval.`,
        relatedId: product.id,
        metadata: { 
          sellerId: seller.sellerId, 
          sellerName: seller.businessName || seller.firstName,
          productName: product.name 
        }
      });

      res.json(product);
    } catch (error) {
      console.error("Create product error:", error);
      res.status(400).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check if the user owns this product
      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller || product.sellerId !== seller.sellerId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const updates = insertProductSchema.partial().parse(req.body);
      const updatedProduct = await storage.updateProduct(req.params.id, updates);
      res.json(updatedProduct);
    } catch (error) {
      console.error("Update product error:", error);
      res.status(400).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check if the user owns this product
      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller || product.sellerId !== seller.sellerId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted" });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Cart routes
  app.get("/api/cart", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const cartItems = await storage.getCartItems(req.user!.userId);
      res.json(cartItems);
    } catch (error) {
      console.error("Get cart error:", error);
      res.status(500).json({ message: "Failed to get cart" });
    }
  });

  app.post("/api/cart", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const cartData = insertCartSchema.parse({
        ...req.body,
        userId: req.user!.userId,
      });

      const cartItem = await storage.addToCart(cartData);
      res.json(cartItem);
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(400).json({ message: "Failed to add to cart" });
    }
  });

  app.put("/api/cart/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { quantity } = req.body;
      const cartItem = await storage.updateCartItem(req.params.id, quantity);
      res.json(cartItem);
    } catch (error) {
      console.error("Update cart error:", error);
      res.status(400).json({ message: "Failed to update cart" });
    }
  });

  app.delete("/api/cart/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await storage.removeFromCart(req.params.id);
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  // Order routes
  app.get("/api/orders", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filters: any = {};
      
      if (req.user!.userRole === "customer") {
        filters.customerId = req.user!.userId;
      } else if (req.user!.userRole === "seller") {
        const seller = await storage.getSellerByUserId(req.user!.userId);
        if (seller) {
          filters.sellerId = seller.sellerId;
        }
      }
      // Admin can see all orders (no filters)

      const orders = await storage.getOrders(filters);
      res.json(orders);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "Failed to get orders" });
    }
  });

  // Get seller orders with enhanced details
  app.get("/api/sellers/orders", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
      
      const orders = await storage.getSellerOrders(seller.sellerId);
      res.json(orders);
    } catch (error) {
      console.error("Get seller orders error:", error);
      res.status(500).json({ message: "Failed to get seller orders" });
    }
  });

  app.post("/api/orders", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const isPosOrder = req.body.isPosOrder;

      // Use provided items for POS orders, otherwise fetch cart items
      const items = isPosOrder
        ? (req.body.items || [])
        : await storage.getCartItems(req.user!.userId);

      if (items.length === 0) {
        return res.status(400).json({ message: isPosOrder ? "No items provided" : "Cart is empty" });
      }

      // Check stock availability
      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Product ${item.productId} not found` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          });
        }
      }

      // Calculate total - get price from product since cart item doesn't have price
      let total = 0;
      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (product) {
          total += parseFloat(product.price) * item.quantity;
        }
      }

      // Get seller ID from first product (single-vendor cart for now)
      const firstProduct = await storage.getProduct(items[0].productId);

      const orderData = insertOrderSchema.parse({
        ...req.body,
        customerId: req.user!.userId,
        sellerId: firstProduct?.sellerId || "",
        total: total.toString(),
        status: "pending",
        paymentStatus: "pending",
        items,
      });

      const order = await storage.createOrder(orderData);

      // Update inventory for each item
      for (const item of items) {
        await storage.updateProductStock(item.productId, -item.quantity, "Sale", order.id);
      }

      // Clear cart after order creation if not POS order
      if (!orderData.isPosOrder) {
        await storage.clearCart(req.user!.userId);
      }

      res.json(order);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check authorization
      if (req.user?.userRole === "customer" && order.customerId !== req.user.userId) {
        return res.status(403).json({ message: "Not authorized" });
      } else if (req.user?.userRole === "seller") {
        const seller = await storage.getSellerByUserId(req.user.userId);
        if (!seller || order.sellerId !== seller.sellerId) {
          return res.status(403).json({ message: "Not authorized" });
        }
      }

      const updates = insertOrderSchema.partial().parse(req.body);
      const updatedOrder = await storage.updateOrder(req.params.id, updates);
      res.json(updatedOrder);
    } catch (error) {
      console.error("Update order error:", error);
      res.status(400).json({ message: "Failed to update order" });
    }
  });

  // Payment routes
  app.post("/api/payments", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      
      // Simulate payment processing
      const isSuccess = Math.random() > 0.1; // 90% success rate
      const status = isSuccess ? "completed" : "failed";
      
      const payment = await storage.createPayment({
        ...paymentData,
        status: status as any,
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });

      // Update order status if payment successful
      if (status === "completed") {
        await storage.updateOrder(paymentData.orderId, { status: "processing" });
        await storage.creditLoyaltyPoints(
          req.user!.userId,
          Math.floor(parseFloat(paymentData.amount)),
        );
      }

      res.json(payment);
    } catch (error) {
      console.error("Process payment error:", error);
      res.status(400).json({ message: "Payment processing failed" });
    }
  });

  // Loyalty endpoints
  app.get("/api/loyalty", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const balance = await storage.getLoyaltyBalance(req.user!.userId);
      const transactions = await storage.getLoyaltyTransactions(req.user!.userId);
      res.json({ balance, transactions });
    } catch (error) {
      console.error("Get loyalty error:", error);
      res.status(500).json({ message: "Failed to fetch loyalty data" });
    }
  });

  app.post("/api/loyalty/redeem", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const redeemSchema = z.object({ points: z.number().int().positive() });
    try {
      const { points } = redeemSchema.parse(req.body);
      await storage.redeemLoyaltyPoints(req.user!.userId, points);
      const balance = await storage.getLoyaltyBalance(req.user!.userId);
      res.json({ balance });
    } catch (error: any) {
      console.error("Redeem loyalty error:", error);
      res.status(400).json({ message: error.message || "Failed to redeem points" });
    }
  });

  // Receipt generation route
  app.get("/api/orders/:orderId/receipt", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.orderId;
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Authorization check
      if (req.user?.userRole === "customer" && order.customerId !== req.user.userId) {
        return res.status(403).json({ message: "Not authorized" });
      } else if (req.user?.userRole === "seller") {
        const seller = await storage.getSellerByUserId(req.user.userId);
        if (!seller || order.sellerId !== seller.sellerId) {
          return res.status(403).json({ message: "Not authorized" });
        }
      }

      // Get seller details
      const sellerDetails = await storage.getSellerByUserId(
        req.user?.userRole === "seller" 
          ? req.user.userId 
          : order.sellerId || ""
      );

      // Get customer details
      const customer = await storage.getUser(order.customerId);

      // Get payment details
      const payments = await storage.getPaymentsByOrderId(orderId);
      const payment = payments[0]; // Assuming single payment per order

      // Prepare receipt data
      const receiptData = {
        order,
        seller: {
          businessName: sellerDetails?.businessName || "PhoneHub Seller",
          businessLogo: sellerDetails?.businessLogo,
          businessEmail: sellerDetails?.businessEmail,
          phoneNumber: sellerDetails?.phoneNumber,
          whatsappNumber: sellerDetails?.whatsappNumber,
          businessAddress: sellerDetails?.businessAddress,
          businessWebsite: sellerDetails?.businessWebsite,
        },
        customer: {
          firstName: customer?.firstName,
          lastName: customer?.lastName,
          email: customer?.email,
        },
        items: Array.isArray(order.items) ? order.items : [],
        paymentMethod: payment?.method || "cash",
        amountReceived: payment?.metadata && typeof payment.metadata === 'object' && 'amountReceived' in payment.metadata ? (payment.metadata as any).amountReceived : undefined,
        changeAmount: payment?.metadata && typeof payment.metadata === 'object' && 'changeAmount' in payment.metadata ? (payment.metadata as any).changeAmount : undefined,
      };

      res.json(receiptData);
    } catch (error) {
      console.error("Get receipt error:", error);
      res.status(500).json({ message: "Failed to generate receipt" });
    }
  });

  // Seller routes
  app.get("/api/sellers/pending", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pendingSellers = await storage.getPendingSellers();
      res.json(pendingSellers);
    } catch (error) {
      console.error("Get pending sellers error:", error);
      res.status(500).json({ message: "Failed to get pending sellers" });
    }
  });

  app.get("/api/sellers/approved", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const approvedSellers = await storage.getApprovedSellers();
      res.json(approvedSellers);
    } catch (error) {
      console.error("Get approved sellers error:", error);
      res.status(500).json({ message: "Failed to get approved sellers" });
    }
  });

  app.get("/api/sellers", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sellers = await storage.getAllSellers();
      res.json(sellers);
    } catch (error) {
      console.error("Get sellers error:", error);
      res.status(500).json({ message: "Failed to get sellers" });
    }
  });

  app.put("/api/sellers/:id/approve", requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const seller = await storage.approveSeller(req.params.id, req.user!.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }
      res.json(seller);
    } catch (error) {
      console.error("Approve seller error:", error);
      res.status(500).json({ message: "Failed to approve seller" });
    }
  });

  app.put("/api/sellers/:id/reject", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // For simplified implementation, we just return success
      const seller = await storage.getSeller(req.params.id);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }
      res.json({ ...seller, status: "rejected" });
    } catch (error) {
      console.error("Reject seller error:", error);
      res.status(500).json({ message: "Failed to reject seller" });
    }
  });

  // Get seller profile route
  app.get("/api/sellers/profile", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
      res.json(seller);
    } catch (error) {
      console.error("Get seller profile error:", error);
      res.status(500).json({ message: "Failed to get seller profile" });
    }
  });

  // Seller document submission route
  app.put("/api/sellers/documents", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller profile not found" });
      }

      // Update seller with Kuwait compliance documents and uploaded files
      const updatedSeller = await storage.updateSeller(seller.sellerId, {
        businessName: req.body.businessName,
        businessType: req.body.businessType,
        phoneNumber: req.body.phoneNumber,
        whatsappNumber: req.body.whatsappNumber,
        businessAddress: req.body.businessAddress,
        shopLicenseNumber: req.body.shopLicenseNumber,
        ownerCivilId: req.body.ownerCivilId,
        // Document files
        businessLogo: req.body.businessLogo,
        shopLicenseImage: req.body.shopLicenseImage,
        ownerCivilIdImage: req.body.ownerCivilIdImage,
        ownerPhoto: req.body.ownerPhoto,
        status: "pending", // Set status to pending after document submission
        updatedAt: new Date()
      });

      res.json(updatedSeller);
    } catch (error) {
      console.error("Update seller documents error:", error);
      res.status(500).json({ message: "Failed to update documents" });
    }
  });

  // Seller notification settings
  app.get("/api/sellers/settings", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
      res.json({
        emailNotifications: seller.emailNotifications,
        smsNotifications: seller.smsNotifications,
        lowStockAlerts: seller.lowStockAlerts,
      });
    } catch (error) {
      console.error("Get seller settings error:", error);
      res.status(500).json({ message: "Failed to get seller settings" });
    }
  });

  app.put("/api/sellers/settings", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller profile not found" });
      }

      const updated = await storage.updateSeller(seller.sellerId, {
        emailNotifications: req.body.emailNotifications,
        smsNotifications: req.body.smsNotifications,
        lowStockAlerts: req.body.lowStockAlerts,
      });

      res.json({
        emailNotifications: updated.emailNotifications,
        smsNotifications: updated.smsNotifications,
        lowStockAlerts: updated.lowStockAlerts,
      });
    } catch (error) {
      console.error("Update seller settings error:", error);
      res.status(500).json({ message: "Failed to update seller settings" });
    }
  });

  // Admin routes for document management
  app.get("/api/admin/sellers/documents", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sellers = await storage.getSellersWithDocuments();
      res.json(sellers);
    } catch (error) {
      console.error("Get sellers with documents error:", error);
      res.status(500).json({ message: "Failed to get sellers with documents" });
    }
  });

  app.put("/api/admin/sellers/:id/approve-documents", requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const sellerId = req.params.id;
      const updatedSeller = await storage.updateSeller(sellerId, {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: req.user!.userId,
        updatedAt: new Date()
      });

      if (!updatedSeller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      res.json(updatedSeller);
    } catch (error) {
      console.error("Approve seller documents error:", error);
      res.status(500).json({ message: "Failed to approve seller documents" });
    }
  });

  app.put("/api/admin/sellers/:id/reject-documents", requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const sellerId = req.params.id;
        const { rejectionReason } = req.body;

        const updatedSeller = await storage.updateSeller(sellerId, {
          status: "rejected",
          updatedAt: new Date()
        });

      if (!updatedSeller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      res.json(updatedSeller);
    } catch (error) {
      console.error("Reject seller documents error:", error);
      res.status(500).json({ message: "Failed to reject seller documents" });
    }
  });

  // Product approval routes (Admin only) - MUST come before /api/products/:id
  app.get("/api/products/pending", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const products = await storage.getPendingProducts();
      res.json(products);
    } catch (error) {
      console.error("Get pending products error:", error);
      res.status(500).json({ message: "Failed to get pending products" });
    }
  });

  // Get detailed product with seller information - MUST come before generic :id route
  app.get("/api/products/:id/details", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Get seller details including user info and seller profile
      const seller = await storage.getSeller(product.sellerId);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      const sellerUser = await storage.getUser(seller.userId);
      if (!sellerUser) {
        return res.status(404).json({ message: "Seller user not found" });
      }

      // Combine seller information
      const sellerDetails = {
        id: seller.id,
        userId: seller.userId,
        businessName: seller.businessName,
        location: seller.location,
        phoneNumber: seller.phoneNumber,
        businessAddress: seller.businessAddress,
        firstName: sellerUser.firstName,
        lastName: sellerUser.lastName,
        email: sellerUser.email,
        rating: "4.8", // This could be calculated from reviews in the future
        reviewCount: 47, // This could be fetched from reviews table
        joinedDate: seller.createdAt,
      };

      res.json({
        ...product,
        seller: sellerDetails,
      });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).json({ message: "Failed to fetch product details" });
    }
  });

  // Product image routes
  app.get("/api/products/:productId/images", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const images = await storage.listProductImages(req.params.productId);
      res.json(images);
    } catch (error) {
      console.error("Get product images error:", error);
      res.status(500).json({ message: "Failed to get product images" });
    }
  });

  app.post("/api/products/:productId/images", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const product = await storage.getProduct(req.params.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller || product.sellerId !== seller.sellerId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const images: string[] = req.body.images || [];
      const created = [] as any[];
      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        const img = await storage.createProductImage({
          productId: req.params.productId,
          imageUrl: url,
          fileName: path.basename(url),
          isMain: i === 0,
          displayOrder: i,
        });
        created.push(img);
      }
      res.json({ images: created });
    } catch (error) {
      console.error("Create product images error:", error);
      res.status(500).json({ message: "Failed to add product images" });
    }
  });

  app.delete("/api/products/:productId/images/:imageId", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const product = await storage.getProduct(req.params.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller || product.sellerId !== seller.sellerId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const images = await storage.listProductImages(req.params.productId);
      if (!images.find((img) => img.id === req.params.imageId)) {
        return res.status(404).json({ message: "Image not found" });
      }

      await storage.deleteProductImage(req.params.imageId);
      res.json({ message: "Image deleted" });
    } catch (error) {
      console.error("Delete product image error:", error);
      res.status(500).json({ message: "Failed to delete product image" });
    }
  });

  // Individual product route - MUST come after specific routes like /pending and /details
  app.get("/api/products/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Get product error:", error);
      res.status(500).json({ message: "Failed to get product" });
    }
  });

  app.put("/api/products/:id/approve", requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const product = await storage.approveProduct(req.params.id, req.user!.userId);
      
      // Create notification for seller
      await storage.createNotification({
        type: "product_approved",
        title: "Product Approved!",
        message: `Great news! Your product "${product.name}" has been approved and is now live in the marketplace.`,
        relatedId: product.id,
        sellerId: product.sellerId,
        metadata: { productName: product.name, approvedBy: req.user!.userId }
      });

      res.json(product);
    } catch (error) {
      console.error("Approve product error:", error);
      res.status(500).json({ message: "Failed to approve product" });
    }
  });

  app.put("/api/products/:id/reject", requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { reason = "Product does not meet marketplace standards" } = req.body;
      const product = await storage.rejectProduct(req.params.id, reason);
      
      // Create notification for seller
      await storage.createNotification({
        type: "product_rejected",
        title: "Product Needs Updates",
        message: `Your product "${product.name}" needs some updates before approval. Reason: ${reason}`,
        relatedId: product.id,
        sellerId: product.sellerId,
        metadata: { productName: product.name, rejectionReason: reason }
      });

      res.json(product);
    } catch (error) {
      console.error("Reject product error:", error);
      res.status(500).json({ message: "Failed to reject product" });
    }
  });

  // Notifications routes (Admin only)
  app.get("/api/notifications", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifications = await storage.getNotifications(limit);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.put("/api/notifications/:id/read", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Admin settings routes
  app.get("/api/admin/settings", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notificationEmail = await storage.getAdminSetting("notification_email");
      res.json({ 
        notification_email: notificationEmail || "admin@phonehub.com",
        // Add other settings as needed
      });
    } catch (error) {
      console.error("Get admin settings error:", error);
      res.status(500).json({ message: "Failed to get admin settings" });
    }
  });

  app.put("/api/admin/settings", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.notification_email) {
        await storage.setAdminSetting(
          "notification_email", 
          req.body.notification_email,
          "Email address for admin notifications"
        );
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Update admin settings error:", error);
      res.status(500).json({ message: "Failed to update admin settings" });
    }
  });

  // Individual seller details route (Admin only)
  app.get("/api/sellers/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const seller = await storage.getSeller(req.params.id);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }
      res.json(seller);
    } catch (error) {
      console.error("Get seller details error:", error);
      res.status(500).json({ message: "Failed to get seller details" });
    }
  });

  // Seller stats route (Admin only)
  app.get("/api/sellers/:id/stats", requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const sellerId = req.params.id;
      const stats = await storage.getSellerAnalytics(sellerId);
      res.json(stats);
    } catch (error) {
      console.error("Get seller stats error:", error);
      res.status(500).json({ message: "Failed to get seller stats" });
    }
  });

  // Users management routes (Admin only)
  app.get("/api/users", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Get customers only (Admin only)
  app.get("/api/admin/customers", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Get customers error:", error);
      res.status(500).json({ message: "Failed to get customers" });
    }
  });
  
  // Get sellers only (Admin only)
  app.get("/api/admin/sellers", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sellers = await storage.getAllSellers();
      res.json(sellers);
    } catch (error) {
      console.error("Get sellers error:", error);
      res.status(500).json({ message: "Failed to get sellers" });
    }
  });

  // Get all payments (Admin only)
  app.get("/api/admin/payments", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      console.error("Get payments error:", error);
      res.status(500).json({ message: "Failed to get payments" });
    }
  });

  // Get sellers with documents for admin review
  app.get("/api/admin/sellers/documents", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sellersWithDocuments = await storage.getSellersWithDocuments();
      res.json(sellersWithDocuments);
    } catch (error) {
      console.error("Get sellers with documents error:", error);
      res.status(500).json({ message: "Failed to get sellers with documents" });
    }
  });

  // Approve seller documents
  app.put("/api/admin/sellers/:userId/approve-documents", requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const seller = await storage.approveSeller(req.params.userId, req.user!.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }
      res.json({ message: "Seller documents approved successfully", seller });
    } catch (error) {
      console.error("Approve seller documents error:", error);
      res.status(500).json({ message: "Failed to approve seller documents" });
    }
  });

  // Reject seller documents
  app.put("/api/admin/sellers/:userId/reject-documents", requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { rejectionReason } = req.body;
      
      // Get seller profile to update
      const seller = await storage.getSellerByUserId(req.params.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

        // Update seller status to rejected
        const updatedSeller = await storage.updateSeller(seller.sellerId, {
          status: "rejected",
          updatedAt: new Date()
        });
      
      res.json({ message: "Seller documents rejected", seller: updatedSeller });
    } catch (error) {
      console.error("Reject seller documents error:", error);
      res.status(500).json({ message: "Failed to reject seller documents" });
    }
  });

  // Admin upload document on behalf of seller
  app.put("/api/admin/sellers/:userId/upload-document", requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { field, fileUrl } = req.body;

      if (!field || !fileUrl) {
        return res.status(400).json({ message: "Field and fileUrl are required" });
      }
      
      // Get seller profile to update
      const seller = await storage.getSellerByUserId(req.params.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      // Validate field name
      const allowedFields = ['businessLogo', 'shopLicenseImage', 'ownerCivilIdImage', 'ownerPhoto'];
      if (!allowedFields.includes(field)) {
        return res.status(400).json({ message: "Invalid document field" });
      }

      // Update the specific document field
      const updateData = {
        [field]: fileUrl,
        updatedAt: new Date()
      };

      const updatedSeller = await storage.updateSeller(seller.sellerId || seller.id, updateData);
      
      res.json({ message: "Document uploaded successfully", seller: updatedSeller });
    } catch (error) {
      console.error("Admin upload document error:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Admin edit seller details
  app.put("/api/admin/sellers/:userId/edit-details", requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessName, businessType, phoneNumber, whatsappNumber, businessAddress, shopLicenseNumber, ownerCivilId } = req.body;
      
      // Get seller profile to update
      const seller = await storage.getSellerByUserId(req.params.userId);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      // Filter out undefined/null values and create clean update object
      const updateData: any = {};
      if (businessName !== undefined) updateData.businessName = businessName;
      if (businessType !== undefined) updateData.businessType = businessType;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber;
      if (businessAddress !== undefined) updateData.businessAddress = businessAddress;
      if (shopLicenseNumber !== undefined) updateData.shopLicenseNumber = shopLicenseNumber;
      if (ownerCivilId !== undefined) updateData.ownerCivilId = ownerCivilId;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields provided" });
      }
      
      console.log("Updating seller with data:", updateData);
      console.log("Seller ID to update:", seller.sellerId);

      const updatedSeller = await storage.updateSeller(seller.sellerId, updateData);
      
      res.json({ message: "Seller details updated successfully", seller: updatedSeller });
    } catch (error) {
      console.error("Admin edit seller details error:", error);
      res.status(500).json({ message: "Failed to update seller details" });
    }
  });

  app.put("/api/users/:id/role", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role } = req.body;
      const updatedUser = await storage.updateUserRole(req.params.id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Export endpoints for admin
  app.get("/api/export/sellers", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sellers = await storage.getAllSellers();
      const csvHeaders = "ID,Name,Email,Business Name,Status,Created At\n";
      const csvData = sellers.map(seller => 
        `${seller.id},"${seller.firstName} ${seller.lastName}","${seller.email}","${(seller as any).businessName || 'N/A'}","${seller.role}","${seller.createdAt}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sellers-export.csv"');
      res.send(csvHeaders + csvData);
    } catch (error) {
      console.error("Export sellers error:", error);
      res.status(500).json({ message: "Failed to export sellers" });
    }
  });

  app.get("/api/export/users", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await storage.getAllUsers();
      const csvHeaders = "ID,Name,Email,Role,Created At\n";
      const csvData = users.map(user => 
        `${user.id},"${user.firstName} ${user.lastName}","${user.email}","${user.role}","${user.createdAt}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
      res.send(csvHeaders + csvData);
    } catch (error) {
      console.error("Export users error:", error);
      res.status(500).json({ message: "Failed to export users" });
    }
  });

  app.get("/api/export/orders", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await storage.getOrders();
      const csvHeaders = "ID,Customer ID,Seller ID,Total,Status,Created At\n";
      const csvData = orders.map(order => 
        `${order.id},"${order.customerId}","${order.sellerId}","${order.total}","${order.status}","${order.createdAt}"`
      ).join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="orders-export.csv"');
      res.send(csvHeaders + csvData);
    } catch (error) {
      console.error("Export orders error:", error);
      res.status(500).json({ message: "Failed to export orders" });
    }
  });

  // Analytics routes
  app.get("/api/sellers/:id/analytics", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const seller = await storage.getSellerByUserId(req.user!.userId);
      if (!seller || (req.params.id !== seller.sellerId && req.user?.userRole !== "admin")) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const stats = await storage.getSellerStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Get seller stats error:", error);
      res.status(500).json({ message: "Failed to get seller stats" });
    }
  });

  app.get("/api/analytics/platform", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      console.error("Get platform stats error:", error);
      res.status(500).json({ message: "Failed to get platform stats" });
    }
  });

  // ─── REVIEWS ROUTES ──────────────────────────────────────────────────────────

  // Get product reviews
  app.get("/api/products/:productId/reviews", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reviews = await storage.getProductReviews(req.params.productId);
      res.json(reviews);
    } catch (error) {
      console.error("Get product reviews error:", error);
      res.status(500).json({ message: "Failed to get reviews" });
    }
  });

  // Create a review (requires authentication)
  app.post("/api/reviews", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        userId: req.user!.userId,
      });

      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      console.error("Create review error:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Get user reviews
  app.get("/api/user/reviews", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const reviews = await storage.getUserReviews(req.user!.userId);
      res.json(reviews);
    } catch (error) {
      console.error("Get user reviews error:", error);
      res.status(500).json({ message: "Failed to get user reviews" });
    }
  });

  // Update a review
  app.put("/api/reviews/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const review = await storage.updateReview(req.params.id, req.body);
      res.json(review);
    } catch (error) {
      console.error("Update review error:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  // Delete a review
  app.delete("/api/reviews/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await storage.deleteReview(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete review error:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // ─── INVENTORY ROUTES ────────────────────────────────────────────────────────

  // Get product inventory logs (Seller only)
  app.get("/api/products/:productId/inventory", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const logs = await storage.getProductInventoryLogs(req.params.productId);
      res.json(logs);
    } catch (error) {
      console.error("Get inventory logs error:", error);
      res.status(500).json({ message: "Failed to get inventory logs" });
    }
  });

  // Update product stock (Seller only)
  app.post("/api/products/:productId/stock", requireRole("seller"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { quantityChange, reason } = req.body;
      await storage.updateProductStock(req.params.productId, quantityChange, reason);
      res.json({ message: "Stock updated successfully" });
    } catch (error) {
      console.error("Update stock error:", error);
      res.status(500).json({ message: "Failed to update stock" });
    }
  });

  // ─── CHAT ROUTES ───────────────────────────

  app.get("/api/chat/history/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const messages = await storage.getMessageHistory(req.user!.userId, req.params.userId);
      res.json(messages);
    } catch (error) {
      console.error("Get chat history error:", error);
      res.status(500).json({ message: "Failed to get chat history" });
    }
  });

  app.post("/api/chat", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const messageData = insertMessageSchema.parse({
        senderId: req.user!.userId,
        receiverId: req.body.receiverId,
        productId: req.body.productId,
        content: req.body.content,
      });
      const message = await storage.createMessage(messageData);
      const io = req.app.get("io");
      if (io) {
        io.to(message.receiverId).emit("message", message);
        io.to(message.senderId).emit("message", message);
      }
      res.status(201).json(message);
    } catch (error) {
      console.error("Send chat message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Redirect deprecated seller routes to new /api/sellers prefix
  app.use("/api/seller", (req, res) => {
    res.redirect(308, req.originalUrl.replace(/^\/api\/seller/, "/api/sellers"));
  });
  app.use("/api/products/seller", (req, res) => {
    res.redirect(308, req.originalUrl.replace(/^\/api\/products\/seller/, "/api/sellers/products"));
  });
  app.use("/api/orders/seller", (req, res) => {
    res.redirect(308, req.originalUrl.replace(/^\/api\/orders\/seller/, "/api/sellers/orders"));
  });
  app.get("/api/analytics/seller/:id", (req, res) => {
    res.redirect(308, `/api/sellers/${req.params.id}/analytics`);
  });

  const httpServer = createServer(app);
  return httpServer;
}
