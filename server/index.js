import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Routes
import authRoutes from './routes/auth.routes.js';
import uploadRoutes from './routes/uploads.routes.js';
import productsRoutes from './routes/products.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import vendorsRoutes from './routes/vendors.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminOptionsRoutes from './routes/adminOptions.routes.js';
import optionsRoutes from './routes/options.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import projectsAdminRoutes from './routes/projectsAdmin.routes.js';
import offersRoutes from './routes/offers.routes.js';
import servicesRoutes from './routes/services.routes.js';
import rentalsRoutes from './routes/rentals.routes.js';
import addressesRoutes from './routes/addresses.routes.js';
import cartRoutes from './routes/cart.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import chatRoutes from './routes/chat.routes.js';
import projectChatRoutes from './routes/projectChat.routes.js';
import vendorAnalyticsRoutes from './routes/vendorAnalytics.routes.js';
import commissionsRoutes from './routes/commissions.routes.js';
import techniciansRoutes from './routes/technicians.routes.js';

import { errorHandler, notFound } from './middlewares/error.js';

dotenv.config();
configureCloudinary();

const app = express();

// CORS
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
}));

// Security
app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
});
app.use(limiter);

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// DB
await connectDB();

// Health
app.get('/health', (req, res) => res.json({ ok: true, service: 'construction-marketplace-backend' }));

// Root welcome (prevents 404 on GET /)
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Construction Marketplace API',
    docs: '/api',
    health: '/health',
  });
});

// Quiet the favicon 404s
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Mount routes (prefix /api)
app.use('/api/Auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/Products', productsRoutes);
app.use('/api/Categories', categoriesRoutes);
app.use('/api/Orders', ordersRoutes);
app.use('/api/Vendors', vendorsRoutes);
app.use('/api/Admin', adminRoutes);
app.use('/api/AdminOptions', adminOptionsRoutes);
app.use('/api/Options', optionsRoutes);
app.use('/api/Projects', projectsRoutes);
app.use('/api/ProjectsAdmin', projectsAdminRoutes);
app.use('/api/Offers', offersRoutes);
app.use('/api/Services', servicesRoutes);
app.use('/api/Rentals', rentalsRoutes);
app.use('/api/Addresses', addressesRoutes);
app.use('/api/Cart', cartRoutes);
app.use('/api/Wishlist', wishlistRoutes);
app.use('/api/Chat', chatRoutes);
app.use('/api/ProjectChat', projectChatRoutes);
app.use('/api/VendorAnalytics', vendorAnalyticsRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/Technicians', techniciansRoutes);

// 404 and error
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
