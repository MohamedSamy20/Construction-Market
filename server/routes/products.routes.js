import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { list, featured, rentals, getById, getBySlug, listMyProducts, create, update, remove, addImage, validateCreateProduct, validateUpdateProduct } from '../controllers/products.controller.js';

const router = express.Router();

router.get('/', list);
router.get('/featured', featured);
router.get('/rentals', rentals);
router.get('/merchant/my-products', protect, requireRoles('Merchant', 'Admin'), listMyProducts);
router.get('/slug/:slug', getBySlug);
router.get('/:id', getById);

router.post('/', protect, requireRoles('Merchant', 'Admin'), validateCreateProduct, create);
router.put('/:id', protect, requireRoles('Merchant', 'Admin'), validateUpdateProduct, update);
router.delete('/:id', protect, requireRoles('Merchant', 'Admin'), remove);

router.post('/:id/images', protect, requireRoles('Merchant', 'Admin'), addImage);

export default router;
