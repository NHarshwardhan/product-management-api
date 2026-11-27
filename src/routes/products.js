import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  archiveProduct,
  restoreProduct
} from '../controllers/productController.js';
import { validateCreate, validateUpdate, validateFilters } from '../validators/productValidator.js';

const router = Router();

router.get('/', validateFilters(), getProducts);
router.get('/:id', getProductById);
router.post('/', validateCreate(), createProduct);
router.patch('/:id', validateUpdate(), updateProduct);
router.delete('/:id/restore', restoreProduct);
router.delete('/:id', archiveProduct);

export default router;