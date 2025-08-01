# PhoneHub - Multi-Vendor Mobile Marketplace & POS Platform

## Overview

PhoneHub is a comprehensive e-commerce platform specifically designed for phones and accessories. It features a multi-vendor marketplace with an integrated Point of Sale (POS) system, enabling sellers to manage both online and in-person sales through a unified platform. The system supports multiple user roles (customers, sellers, and admins) with role-based access control and comprehensive business features.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 2025)

### File Upload System Improvements
- **Complete file upload workflow**: Fixed all file type restrictions to accept any format (*/*.png/jpg/pdf/etc)
- **Visual file management**: Added file preview, upload status indicators, and removal functionality
- **Upload blocking**: Prevents duplicate uploads when file limit is reached, shows "File uploaded" status
- **Form integration**: All uploaded files properly connect to seller document form fields
- **Admin panel compatibility**: File upload system works for both seller self-upload and admin uploads on behalf of sellers
- **Error handling**: Fixed translation issues causing false "upload_failed" messages despite successful uploads

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL store
- **Authentication**: Session-based authentication with bcrypt password hashing

## Key Components

### User Management
- **Multi-role system**: Customers, sellers, and admins with distinct capabilities
- **Unified authentication**: Single login/register flow handling all user types
- **Session-based security**: Secure session management with role-based middleware
- **Seller approval workflow**: Admin approval process for new seller accounts

### Product Management
- **Multi-vendor catalog**: Each seller manages their own product inventory
- **Rich product schema**: Comprehensive product details including condition, pricing, and inventory
- **Category system**: Organized product categorization (smartphones, audio, accessories, protection)
- **Search and filtering**: Advanced product search with multiple filter options

### Sales Channels
- **Online marketplace**: Traditional e-commerce storefront for customer purchases
- **POS system**: In-store sales interface for sellers with real-time inventory management
- **Shopping cart**: Persistent cart functionality with quantity management
- **Order processing**: Complete order lifecycle from creation to fulfillment

### Administrative Features
- **Seller management**: Approval workflow for pending seller applications
- **Platform analytics**: Business metrics and performance tracking
- **Order oversight**: Administrative view of all platform orders
- **Content moderation**: Product and seller approval processes

## Data Flow

### Authentication Flow
1. Users authenticate through unified login/register interface
2. Session established with role-based permissions stored
3. Role-based route protection enforces access control
4. Different dashboards rendered based on user role

### Product Discovery Flow
1. Customers browse marketplace with filtering and search
2. Product data fetched from database with seller information
3. Real-time inventory checks ensure product availability
4. Shopping cart maintains state across sessions

### Order Processing Flow
1. Cart items processed through checkout workflow
2. Payment simulation with multiple payment methods
3. Order creation with inventory adjustment
4. Order tracking and status updates

### POS Sales Flow
1. Sellers access POS interface for in-store sales
2. Product lookup and cart management for walk-in customers
3. Immediate payment processing and receipt generation
4. Real-time inventory synchronization between online and POS

## External Dependencies

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle Kit**: Database migration and schema management
- **connect-pg-simple**: PostgreSQL session store for Express

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Component variant management

### Development & Build
- **Vite**: Fast build tool with HMR support
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Backend bundling for production
- **PostCSS**: CSS processing with Tailwind

### Authentication & Security
- **bcrypt**: Password hashing for secure authentication
- **express-session**: Session management middleware
- **Passport.js**: OAuth authentication with Google and Apple
- **JWT**: Token-based authentication for API access
- **Multi-provider auth**: Email/password, Google OAuth, Apple OAuth
- **Replit integration**: Development environment optimizations

## Deployment Strategy

### Development Environment
- **Vite dev server**: Frontend development with hot module replacement
- **Express server**: Backend API with TypeScript compilation via tsx
- **Database migrations**: Drizzle Kit for schema updates
- **Environment variables**: Secure configuration management

### Production Build
- **Frontend**: Vite builds optimized static assets to dist/public
- **Backend**: ESBuild bundles Node.js application to dist/index.js
- **Database**: PostgreSQL with connection pooling for scalability
- **Static serving**: Express serves frontend assets in production

### Key Architectural Decisions

1. **Monorepo Structure**: Unified codebase with shared types and schemas reduces duplication and ensures type safety between frontend and backend.

2. **Session-based Authentication**: Chosen over JWT for simplicity and security, with PostgreSQL session store providing persistence and scalability.

3. **Drizzle ORM**: Selected for its TypeScript-first approach and type safety, providing better developer experience than traditional ORMs.

4. **Component Library Strategy**: shadcn/ui provides pre-built accessible components while maintaining customization flexibility through Tailwind CSS.

5. **Multi-channel Sales**: Unified inventory system supports both online marketplace and POS sales, ensuring real-time consistency across channels.

6. **Role-based Architecture**: Clear separation of concerns with distinct user roles enables scalable permission management and feature isolation.