import { v4 as uuidv4 } from 'uuid';

const VALID_CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'other'];
const VALID_STATUSES = ['active', 'inactive', 'discontinued'];

const products = new Map();

function validateProduct(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push('name is required and must be a non-empty string');
    }
    if (!data.sku || typeof data.sku !== 'string' || data.sku.trim() === '') {
      errors.push('sku is required and must be a non-empty string');
    }
  } else {
    if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim() === '')) {
      errors.push('name must be a non-empty string');
    }
    if (data.sku !== undefined && (typeof data.sku !== 'string' || data.sku.trim() === '')) {
      errors.push('sku must be a non-empty string');
    }
  }

  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push('description must be a string');
  }

  if (data.category !== undefined) {
    if (!VALID_CATEGORIES.includes(data.category)) {
      errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
  }

  if (data.price !== undefined) {
    if (typeof data.price !== 'number' || data.price <= 0 || !Number.isFinite(data.price)) {
      errors.push('price must be a positive number');
    } else if (Math.abs(Math.round(data.price * 100) - data.price * 100) > 0.001) {
      errors.push('price must have at most 2 decimal places');
    }
  }

  if (data.stock !== undefined) {
    if (!Number.isInteger(data.stock) || data.stock < 0) {
      errors.push('stock must be a non-negative integer');
    }
  }

  if (data.status !== undefined) {
    if (!VALID_STATUSES.includes(data.status)) {
      errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
  }

  return errors;
}

function checkSkuUniqueness(sku, excludeId = null) {
  for (const product of products.values()) {
    if (product.sku === sku && product.id !== excludeId) {
      return false;
    }
  }
  return true;
}

export function findAll(filters = {}) {
  let result = Array.from(products.values());

  if (filters.category) {
    result = result.filter(p => p.category === filters.category);
  }
  if (filters.status) {
    result = result.filter(p => p.status === filters.status);
  }
  if (filters.minPrice !== undefined) {
    result = result.filter(p => p.price >= filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    result = result.filter(p => p.price <= filters.maxPrice);
  }
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.sku.toLowerCase().includes(searchLower) ||
      (p.description && p.description.toLowerCase().includes(searchLower))
    );
  }

  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function findById(id) {
  return products.get(id) || null;
}

export function findBySku(sku) {
  for (const product of products.values()) {
    if (product.sku === sku) {
      return product;
    }
  }
  return null;
}

export function create(data) {
  const errors = validateProduct(data);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  if (!checkSkuUniqueness(data.sku)) {
    throw new Error('SKU must be unique');
  }

  const product = {
    id: uuidv4(),
    name: data.name.trim(),
    sku: data.sku.trim(),
    description: data.description?.trim() || '',
    category: data.category || 'other',
    price: Number(data.price.toFixed(2)),
    stock: data.stock || 0,
    status: data.status || 'active',
    createdAt: new Date()
  };

  products.set(product.id, product);
  return product;
}

export function update(id, patch) {
  const existing = products.get(id);
  if (!existing) {
    return null;
  }

  const errors = validateProduct(patch, true);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  if (patch.sku && !checkSkuUniqueness(patch.sku, id)) {
    throw new Error('SKU must be unique');
  }

  const updated = {
    ...existing,
    ...patch,
    name: patch.name?.trim() ?? existing.name,
    sku: patch.sku?.trim() ?? existing.sku,
    description: patch.description?.trim() ?? existing.description,
    category: patch.category ?? existing.category,
    price: patch.price !== undefined ? Number(patch.price.toFixed(2)) : existing.price,
    stock: patch.stock !== undefined ? patch.stock : existing.stock,
    status: patch.status ?? existing.status
  };

  products.set(id, updated);
  return updated;
}

export function remove(id) {
  const existed = products.has(id);
  products.delete(id);
  return existed;
}

export function clearAll() {
  products.clear();
}