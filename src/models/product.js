import { v4 as uuidv4 } from 'uuid';

const VALID_CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'other'];
const VALID_STATUSES = ['active', 'inactive', 'discontinued'];

// Primary index: O(1) lookup by id
const productsById = new Map();
// Secondary index: O(1) lookup by sku (only active products)
const productsBySku = new Map();

/**
 * Validates product input data.
 * @param {Object} data - Product data to validate
 * @param {boolean} [isUpdate=false] - Whether this is an update (partial) or create (full) validation
 * @returns {string[]} Array of error messages (empty if valid)
 * @throws Never throws; returns errors as array
 */
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

/**
 * Checks if a SKU is unique among active products.
 * @param {string} sku - SKU to check
 * @param {string|null} [excludeId=null] - Product ID to exclude from check (for updates)
 * @returns {boolean} True if SKU is unique, false if already exists
 */
function checkSkuUniqueness(sku, excludeId = null) {
  const existing = productsBySku.get(sku);
  return !existing || existing.id === excludeId;
}

/**
 * Determines if a product is not archived.
 * @param {Object} product - Product object
 * @returns {boolean} True if product is active (not archived)
 */
function filterArchived(product) {
  return !product.archivedAt;
}

/**
 * Checks if a product matches all provided filters.
 * @param {Object} product - Product to test
 * @param {Object} filters - Filter criteria
 * @returns {boolean} True if product matches all filters
 */
function matchesFilters(product, filters) {
  if (filters.category && product.category !== filters.category) return false;
  if (filters.status && product.status !== filters.status) return false;
  if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
  if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;
  if (filters.inStock !== undefined) {
    const inStock = filters.inStock === 'true' || filters.inStock === true;
    if (inStock && product.stock <= 0) return false;
    if (!inStock && product.stock > 0) return false;
  }
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    const nameMatch = product.name.toLowerCase().includes(searchLower);
    const skuMatch = product.sku.toLowerCase().includes(searchLower);
    const descMatch = product.description && product.description.toLowerCase().includes(searchLower);
    if (!nameMatch && !skuMatch && !descMatch) return false;
  }
  return true;
}

/**
 * Retrieves all non-archived products, optionally filtered.
 * @param {Object} [filters={}] - Filter criteria
 * @param {string} [filters.category] - Filter by category (electronics|clothing|food|books|other)
 * @param {string} [filters.status] - Filter by status (active|inactive|discontinued)
 * @param {number} [filters.minPrice] - Minimum price (inclusive)
 * @param {number} [filters.maxPrice] - Maximum price (inclusive)
 * @param {string|boolean} [filters.inStock] - 'true' for stock > 0, 'false' for stock === 0
 * @param {string} [filters.search] - Case-insensitive partial match on name, SKU, or description
 * @returns {Object[]} Array of product objects, sorted by createdAt descending (newest first)
 * @throws Never throws
 * @note Returns empty array if no products match. Archived products (archivedAt !== null) are always excluded.
 * @note Uses single-pass filtering for O(n) performance with early-exit on non-matching fields.
 */
export function findAll(filters = {}) {
  // Early exit: no filters = return all active (already sorted by createdAt desc in create)
  if (Object.keys(filters).length === 0) {
    return Array.from(productsById.values()).filter(filterArchived);
  }

  // For filtered queries, iterate and apply all filters in single pass
  const result = [];
  for (const product of productsById.values()) {
    if (!filterArchived(product)) continue;
    if (matchesFilters(product, filters)) {
      result.push(product);
    }
  }

  // Sort by createdAt descending (most recent first)
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return result;
}

/**
 * Retrieves a single product by its UUID.
 * @param {string} id - Product UUID
 * @returns {Object|null} Product object if found and not archived, null otherwise
 * @throws Never throws
 * @note Returns null for both non-existent IDs and archived products (soft-archive hides them).
 * @note O(1) lookup via productsById Map.
 */
export function findById(id) {
  const product = productsById.get(id);
  if (!product || product.archivedAt) {
    return null;
  }
  return product;
}

/**
 * Retrieves a single product by its SKU.
 * @param {string} sku - Product SKU
 * @returns {Object|null} Product object if found and not archived, null otherwise
 * @throws Never throws
 * @note Returns null for both non-existent SKUs and archived products.
 * @note O(1) lookup via productsBySku Map (only active products indexed).
 */
export function findBySku(sku) {
  const product = productsBySku.get(sku);
  if (!product || product.archivedAt) {
    return null;
  }
  return product;
}

/**
 * Creates a new product with validation and uniqueness checks.
 * @param {Object} data - Product data
 * @param {string} data.name - Product name (required, non-empty)
 * @param {string} data.sku - Stock Keeping Unit (required, non-empty, unique)
 * @param {string} [data.description=''] - Optional description
 * @param {string} [data.category='other'] - Category (electronics|clothing|food|books|other)
 * @param {number} data.price - Price (required, positive, max 2 decimal places)
 * @param {number} [data.stock=0] - Stock quantity (non-negative integer)
 * @param {string} [data.status='active'] - Status (active|inactive|discontinued)
 * @returns {Object} Created product with generated UUID, timestamps, and defaults
 * @throws {Error} If validation fails: "name is required...", "sku is required...", "price must be a positive number", "price must have at most 2 decimal places", "stock must be a non-negative integer", "category must be one of...", "status must be one of...", "description must be a string"
 * @throws {Error} If SKU already exists: "SKU must be unique"
 * @note SKU uniqueness is enforced across all active (non-archived) products.
 * @note Archived products with the same SKU do not block creation (SKU is reclaimed).
 * @note New products get: UUID v4 id, createdAt timestamp, archivedAt: null, status: 'active'.
 */
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
    description: data.description ? data.description.trim() : '',
    category: data.category || 'other',
    price: Number(data.price.toFixed(2)),
    stock: data.stock || 0,
    status: data.status || 'active',
    createdAt: new Date(),
    archivedAt: null
  };

  productsById.set(product.id, product);
  productsBySku.set(product.sku, product);
  return product;
}

const ALLOWED_UPDATE_FIELDS = ['name', 'description', 'category', 'price', 'stock', 'status'];

/**
 * Updates an existing product with partial data.
 * @param {string} id - Product UUID to update
 * @param {Object} patch - Partial product data (only allowed fields applied)
 * @param {string} [patch.name] - New name (non-empty string)
 * @param {string} [patch.description] - New description (string)
 * @param {string} [patch.category] - New category (electronics|clothing|food|books|other)
 * @param {number} [patch.price] - New price (positive, max 2 decimal places)
 * @param {number} [patch.stock] - New stock (non-negative integer)
 * @param {string} [patch.status] - New status (active|inactive|discontinued)
 * @returns {Object|null} Updated product object, or null if not found/archived
 * @throws {Error} If validation fails on provided fields (same messages as create)
 * @throws {Error} If attempting to change SKU to one that already exists: "SKU must be unique"
 * @note Immutable fields (id, sku, createdAt) are preserved — any values in patch are ignored.
 * @note Unknown fields in patch are silently stripped (allow-list approach).
 * @note Archived products cannot be updated (returns null).
 * @note SKU cannot be changed via update; use archive+create if needed.
 */
export function update(id, patch) {
  const existing = productsById.get(id);
  if (!existing || existing.archivedAt) {
    return null;
  }

  const errors = validateProduct(patch, true);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  // Only pick allowed fields from patch (strip unknown fields)
  const filteredPatch = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (patch[key] !== undefined) {
      filteredPatch[key] = patch[key];
    }
  }

  const updated = {
    ...existing,
    // Explicitly preserve immutable fields
    id: existing.id,
    sku: existing.sku,
    createdAt: existing.createdAt,
    name: filteredPatch.name !== undefined ? filteredPatch.name.trim() : existing.name,
    description: filteredPatch.description !== undefined ? (filteredPatch.description ? filteredPatch.description.trim() : '') : existing.description,
    category: filteredPatch.category !== undefined ? filteredPatch.category : existing.category,
    price: filteredPatch.price !== undefined ? Number(filteredPatch.price.toFixed(2)) : existing.price,
    stock: filteredPatch.stock !== undefined ? filteredPatch.stock : existing.stock,
    status: filteredPatch.status !== undefined ? filteredPatch.status : existing.status
  };

  productsById.set(id, updated);
  return updated;
}

/**
 * Soft-archives a product (sets archivedAt timestamp).
 * @param {string} id - Product UUID to archive
 * @returns {boolean} True if archived, false if not found or already archived
 * @throws Never throws
 * @note Soft-archive: product remains in storage but is excluded from findAll, findById, findBySku.
 * @note Product is removed from productsBySku index (SKU becomes available for reuse).
 * @note Use restore(id) to undo. Does not permanently delete data.
 */
export function archive(id) {
  const existing = productsById.get(id);
  if (!existing || existing.archivedAt) {
    return false;
  }
  existing.archivedAt = new Date();
  productsById.set(id, existing);
  // Remove from SKU index (archived products not findable by SKU)
  productsBySku.delete(existing.sku);
  return true;
}

/**
 * Restores a previously archived product.
 * @param {string} id - Product UUID to restore
 * @returns {Object|null} Restored product object, or null if not found or not archived
 * @throws Never throws
 * @note Clears archivedAt timestamp, making product visible in findAll/findById/findBySku again.
 * @note Re-adds product to productsBySku index (SKU must be unique among active products).
 * @note Returns null if product was never archived (idempotent: restore only works once).
 */
export function restore(id) {
  const existing = productsById.get(id);
  if (!existing || !existing.archivedAt) {
    return null;
  }
  existing.archivedAt = null;
  productsById.set(id, existing);
  // Re-add to SKU index
  productsBySku.set(existing.sku, existing);
  return existing;
}

/**
 * Clears all products from the in-memory store (for testing).
 * @returns {void}
 * @throws Never throws
 * @note Test utility only — removes all data from both indexes.
 */
export function clearAll() {
  productsById.clear();
  productsBySku.clear();
}// End of product model
