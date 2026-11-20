import {
  findAll,
  findById,
  findBySku,
  create,
  update,
  archive,
  restore
} from '../models/product.js';

/**
 * Creates a standardized API response envelope.
 * @param {boolean} success - Whether the request succeeded
 * @param {*} [data=null] - Response payload (object, array, or null)
 * @param {string} [error=null] - Error message if success is false
 * @returns {Object} Response object with success, data, and error properties
 */
function createResponse(success, data = null, error = null) {
  return { success, data, error };
}

/**
 * GET /products - List products with optional filtering.
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Request["query"]} req.query - Query parameters
 * @param {string} [req.query.category] - Filter by category (electronics|clothing|food|books|other)
 * @param {string} [req.query.status] - Filter by status (active|inactive|discontinued)
 * @param {string} [req.query.minPrice] - Minimum price (inclusive)
 * @param {string} [req.query.maxPrice] - Maximum price (inclusive)
 * @param {string} [req.query.search] - Case-insensitive partial match on name/SKU/description
 * @param {string} [req.query.inStock] - 'true' for stock > 0, 'false' for stock === 0
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @response 200 - Success: { success: true, data: Product[] }
 * @response 400 - Validation error on query params (from validator middleware)
 * @response 500 - Internal server error (unhandled exception)
 */
export async function getProducts(req, res, next) {
  try {
    const filters = {
      category: req.query.category,
      status: req.query.status,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      search: req.query.search,
      inStock: req.query.inStock
    };

    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

    const products = findAll(filters);
    res.json(createResponse(true, products));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /products/:id - Retrieve a single product by UUID.
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Request["params"]} req.params - Route parameters
 * @param {string} req.params.id - Product UUID
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @response 200 - Success: { success: true, data: Product }
 * @response 404 - Product not found or archived: { success: false, error: "Product not found" }
 * @response 500 - Internal server error (unhandled exception)
 */
export async function getProductById(req, res, next) {
  try {
    const product = findById(req.params.id);
    if (!product) {
      return res.status(404).json(createResponse(false, null, 'Product not found'));
    }
    res.json(createResponse(true, product));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /products - Create a new product.
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Request["body"]} req.body - Product data
 * @param {string} req.body.name - Product name (required, non-empty)
 * @param {string} req.body.sku - Stock Keeping Unit (required, non-empty, unique)
 * @param {string} [req.body.description] - Optional description
 * @param {string} [req.body.category='other'] - Category (electronics|clothing|food|books|other)
 * @param {number} req.body.price - Price (required, positive, max 2 decimal places)
 * @param {number} [req.body.stock=0] - Stock quantity (non-negative integer)
 * @param {string} [req.body.status='active'] - Status (active|inactive|discontinued)
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @response 201 - Created: { success: true, data: Product } (with id, createdAt, archivedAt: null)
 * @response 400 - Validation error: { success: false, error: "name is required..." / "sku is required..." / "price must be a positive number" / "price must have at most 2 decimal places" / "stock must be a non-negative integer" / "category must be one of..." / "status must be one of..." / "description must be a string" }
 * @response 409 - Conflict (duplicate SKU): { success: false, error: "SKU must be unique" }
 * @response 500 - Internal server error (unhandled exception)
 */
export async function createProduct(req, res, next) {
  try {
    const product = create(req.body);
    res.status(201).json(createResponse(true, product));
  } catch (err) {
    if (err.message.includes('unique') || err.message.includes('required') ||
        err.message.includes('must be') || err.message.includes('decimal')) {
      return res.status(400).json(createResponse(false, null, err.message));
    }
    next(err);
  }
}

/**
 * PATCH /products/:id - Partially update a product.
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Request["params"]} req.params - Route parameters
 * @param {string} req.params.id - Product UUID
 * @param {import("express").Request["body"]} req.body - Partial product data
 * @param {string} [req.body.name] - New name (non-empty string)
 * @param {string} [req.body.description] - New description (string)
 * @param {string} [req.body.category] - New category (electronics|clothing|food|books|other)
 * @param {number} [req.body.price] - New price (positive, max 2 decimal places)
 * @param {number} [req.body.stock] - New stock (non-negative integer)
 * @param {string} [req.body.status] - New status (active|inactive|discontinued)
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @response 200 - Success: { success: true, data: Product } (immutable fields id, sku, createdAt preserved)
 * @response 400 - Validation error on provided fields: { success: false, error: "..." }
 * @response 404 - Product not found or archived: { success: false, error: "Product not found" }
 * @response 500 - Internal server error (unhandled exception)
 * @note Fields id, sku, and createdAt are immutable — any values in body are ignored.
 * @note Unknown fields in body are silently stripped (allow-list: name, description, category, price, stock, status).
 */
export async function updateProduct(req, res, next) {
  try {
    const product = update(req.params.id, req.body);
    if (!product) {
      return res.status(404).json(createResponse(false, null, 'Product not found'));
    }
    res.json(createResponse(true, product));
  } catch (err) {
    if (err.message.includes('unique') || err.message.includes('must be') ||
        err.message.includes('decimal')) {
      return res.status(400).json(createResponse(false, null, err.message));
    }
    next(err);
  }
}

/**
 * DELETE /products/:id - Soft-archive a product (sets archivedAt).
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Request["params"]} req.params - Route parameters
 * @param {string} req.params.id - Product UUID
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @response 200 - Archived: { success: true, data: { message: "Product archived successfully" } }
 * @response 404 - Product not found or already archived: { success: false, error: "Product not found" }
 * @response 500 - Internal server error (unhandled exception)
 * @note Soft-archive: product remains in storage but is hidden from GET /products and GET /products/:id.
 * @note SKU becomes available for reuse. Use DELETE /products/:id/restore to undo.
 */
export async function archiveProduct(req, res, next) {
  try {
    const archived = archive(req.params.id);
    if (!archived) {
      return res.status(404).json(createResponse(false, null, 'Product not found'));
    }
    res.json(createResponse(true, { message: 'Product archived successfully' }));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /products/:id/restore - Restore a previously archived product.
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Request["params"]} req.params - Route parameters
 * @param {string} req.params.id - Product UUID
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends JSON response
 * @response 200 - Restored: { success: true, data: { message: "Product restored successfully" } }
 * @response 404 - Product not found or not archived: { success: false, error: "Product not found" }
 * @response 500 - Internal server error (unhandled exception)
 * @note Only works on products that have been archived (archivedAt !== null).
 * @note Restored product reappears in GET /products and GET /products/:id.
 */
export async function restoreProduct(req, res, next) {
  try {
    const restored = restore(req.params.id);
    if (!restored) {
      return res.status(404).json(createResponse(false, null, 'Product not found'));
    }
    res.json(createResponse(true, { message: 'Product restored successfully' }));
  } catch (err) {
    next(err);
  }
}