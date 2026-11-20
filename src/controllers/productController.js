import {
  findAll,
  findById,
  findBySku,
  create,
  update,
  archive,
  restore
} from '../models/product.js';

function createResponse(success, data = null, error = null) {
  return { success, data, error };
}

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

export async function createProduct(req, res, next) {
  try {
    const product = create(req.body);
    res.status(201).json(createResponse(true, product));
  } catch (err) {
    if (err.message.includes('unique')) {
      return res.status(409).json(createResponse(false, null, err.message));
    }
    if (err.message.includes('required') || err.message.includes('must be') || err.message.includes('decimal')) {
      return res.status(400).json(createResponse(false, null, err.message));
    }
    next(err);
  }
}

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