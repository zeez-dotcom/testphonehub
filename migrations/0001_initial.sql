-- ─────────────────────────────────────────────────────────────────────────────
-- 0001_initial.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) ENUMS
CREATE TYPE user_role AS ENUM ('customer', 'seller', 'admin');
CREATE TYPE seller_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('card', 'cash', 'digital_wallet', 'bank_transfer');
CREATE TYPE product_condition AS ENUM ('new', 'like_new', 'good', 'fair');
CREATE TYPE product_status AS ENUM ('pending', 'approved', 'rejected');

-- 2) SESSIONS
CREATE TABLE sessions (
  sid           VARCHAR PRIMARY KEY,
  sess          JSONB   NOT NULL,
  expire        TIMESTAMP NOT NULL
);
CREATE INDEX IDX_session_expire ON sessions(expire);

-- 3) USERS
CREATE TABLE users (
  id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email            VARCHAR UNIQUE NOT NULL,
  password         TEXT    NOT NULL,
  first_name       VARCHAR,
  last_name        VARCHAR,
  role             user_role NOT NULL DEFAULT 'customer',
  profile_image_url VARCHAR,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP NOT NULL DEFAULT now()
);

-- 4) SELLERS
CREATE TABLE sellers (
  id                    VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name         VARCHAR NOT NULL,
  business_type         VARCHAR,
  location              VARCHAR,
  experience            TEXT,
  status                seller_status NOT NULL DEFAULT 'pending',

  shop_license_number   VARCHAR,
  shop_license_image    VARCHAR,
  owner_civil_id        VARCHAR,
  owner_civil_id_image  VARCHAR,
  owner_photo           VARCHAR,
  phone_number          VARCHAR,
  whatsapp_number       VARCHAR,
  business_address      TEXT,
  emirates_id           VARCHAR,
  passport_number       VARCHAR,

  business_logo         VARCHAR,
  business_email        VARCHAR,
  business_website      VARCHAR,

  approved_at           TIMESTAMP,
  approved_by           VARCHAR REFERENCES users(id),
  created_at            TIMESTAMP NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP NOT NULL DEFAULT now()
);

-- 5) PRODUCTS
CREATE TABLE products (
  id               VARCHAR   PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id        VARCHAR   NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name             VARCHAR   NOT NULL,
  description      TEXT,
  brand            VARCHAR,
  category         VARCHAR   NOT NULL,
  price            NUMERIC(10,2) NOT NULL,
  original_price   NUMERIC(10,2),
  stock            INTEGER   NOT NULL DEFAULT 0,
  condition        product_condition NOT NULL DEFAULT 'new',
  status           product_status    NOT NULL DEFAULT 'pending',
  image_url        VARCHAR,
  sku              VARCHAR   UNIQUE,
  is_active        BOOLEAN   NOT NULL DEFAULT true,
  rating           NUMERIC(3,2) NOT NULL DEFAULT 0,      -- <— numeric default
  review_count     INTEGER   NOT NULL DEFAULT 0,
  approved_at      TIMESTAMP,
  approved_by      VARCHAR   REFERENCES users(id),
  rejection_reason TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP NOT NULL DEFAULT now()
);

-- 6) PRODUCT_IMAGES
CREATE TABLE product_images (
  id            VARCHAR  PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    VARCHAR  NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url     VARCHAR  NOT NULL,
  file_name     VARCHAR  NOT NULL,
  file_size     INTEGER,
  mime_type     VARCHAR,
  is_main       BOOLEAN  NOT NULL DEFAULT false,
  display_order INTEGER  NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);

-- 7) ORDERS
CREATE TABLE orders (
  id                VARCHAR  PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       VARCHAR  NOT NULL REFERENCES users(id),
  seller_id         VARCHAR  REFERENCES sellers(id),
  total             NUMERIC(10,2) NOT NULL,
  status            order_status NOT NULL DEFAULT 'pending',
  is_pos_order      BOOLEAN  NOT NULL DEFAULT false,
  shipping_address  JSONB,
  items             JSONB    NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

-- 8) PAYMENTS
CREATE TABLE payments (
  id             VARCHAR  PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       VARCHAR  NOT NULL REFERENCES orders(id),
  amount         NUMERIC(10,2) NOT NULL,
  method         payment_method NOT NULL,
  status         payment_status  NOT NULL DEFAULT 'pending',
  transaction_id VARCHAR,
  metadata       JSONB,
  created_at     TIMESTAMP NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- 9) CART
CREATE TABLE cart (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  VARCHAR NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- 10) NOTIFICATIONS
CREATE TABLE notifications (
  id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  type         VARCHAR NOT NULL,
  title        VARCHAR NOT NULL,
  message      TEXT    NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  related_id   VARCHAR,
  seller_id    VARCHAR REFERENCES sellers(id),
  metadata     JSONB,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);

-- 11) ADMIN_SETTINGS
CREATE TABLE admin_settings (
  id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  key          VARCHAR NOT NULL UNIQUE,
  value        TEXT    NOT NULL,
  description  TEXT,
  updated_at   TIMESTAMP NOT NULL DEFAULT now()
);

