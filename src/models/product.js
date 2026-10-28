import { v4 as uuidv4 } from 'uuid';

const products = new Map();

const VALID_CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'other'];
const VALID_STATUSES = ['active', 'inactive', 'discontinued'];

export const ProductModel = {
  findAll: (filters = {}) => {
    let result = Array.from(products.values());

    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }
    if (filters.status) {
      result = result.filter(p => p.status === filters.status);
    }

    return result;
  },

  findById: (id) => {
    return products.get(id);
  },

  findBySku: (sku) => {
    return Array.from(products.values()).find(p => p.sku === sku);
  },

  create: (data) => {
    // Validate required fields
    if (!data.name || !data.sku) {
      throw new Error('Name and SKU are required');
    }

    // Unique SKU check
    if (ProductModel.findBySku(data.sku)) {
      throw new Error('Product with this SKU already exists');
    }

    // Category validation
    if (data.category && !VALID_CATEGORIES.includes(data.category)) {
      throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    // Price validation
    if (data.price !== undefined && (typeof data.price !== 'number' || data.price <= 0)) {
      throw new Error('Price must be a positive number');
    }

    // Stock validation
    if (data.stock !== undefined && (typeof data.stock !== 'number' || data.stock < 0)) {
      throw new Error('Stock must be a non-negative integer');
    }

    // Status validation
    if (data.status && !VALID_STATUSES.includes(data.status)) {
      throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const id = uuidv4();
    const product = {
      id,
      name: data.name,
      sku: data.sku,
      description: data.description || '',
      category: data.category || 'other',
      price: data.price ? parseFloat(data.price.toFixed(2)) : 0,
      stock: Math.floor(data.stock || 0),
      status: data.status || 'active',
      createdAt: new Date(),
    };

    products.set(id, product);
    return product;
  },

  update: (id, patch) => {
    const product = products.get(id);
    if (!product) return null;

    // Unique SKU check if SKU is being changed
    if (patch.sku && patch.sku !== product.sku) {
      if (ProductModel.findBySku(patch.sku)) {
        throw new Error('Product with this SKU already exists');
      }
    }

    // Category validation
    if (patch.category && !VALID_CATEGORIES.includes(patch.category)) {
      throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    // Price validation
    if (patch.price !== undefined && (typeof patch.price !== 'number' || patch.price <= 0)) {
      throw new Error('Price must be a positive number');
    }

    // Stock validation
    if (patch.stock !== undefined && (typeof patch.stock !== 'number' || patch.stock < 0)) {
      throw new Error('Stock must be a non-negative integer');
    }

    // Status validation
    if (patch.status && !VALID_STATUSES.includes(patch.status)) {
      throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const updatedProduct = {
      ...product,
      ...patch,
      price: patch.price ? parseFloat(patch.price.toFixed(2)) : product.price,
      stock: patch.stock !== undefined ? Math.floor(patch.stock) : product.stock,
    };

    products.set(id, updatedProduct);
    return updatedProduct;
  },

  delete: (id) => {
    return products.delete(id);
  },
};
