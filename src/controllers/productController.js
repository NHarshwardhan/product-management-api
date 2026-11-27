/**
 * Product Controller
 * @module controllers/productController
 * @description Handles HTTP requests for product management operations including
 * CRUD operations, search, filtering, and soft archive/restore functionality.
 */

import {
  findAll,
  findById,
  findBySku,
  create,
  update,
  archive,
  restore,
} from "../models/product.js";

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
      inStock: req.query.inStock,
    };

    Object.keys(filters).forEach(
      (key) => filters[key] === undefined && delete filters[key],
    );

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
      return res
        .status(404)
        .json(createResponse(false, null, "Product not found"));
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
    if (
      err.message.includes("unique") ||
      err.message.includes("required") ||
      err.message.includes("must be") ||
      err.message.includes("decimal")
    ) {
      return res.status(400).json(createResponse(false, null, err.message));
    }
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = update(req.params.id, req.body);
    if (!product) {
      return res
        .status(404)
        .json(createResponse(false, null, "Product not found"));
    }
    res.json(createResponse(true, product));
  } catch (err) {
    if (
      err.message.includes("unique") ||
      err.message.includes("must be") ||
      err.message.includes("decimal")
    ) {
      return res.status(400).json(createResponse(false, null, err.message));
    }
    next(err);
  }
}

export async function archiveProduct(req, res, next) {
  try {
    const archived = archive(req.params.id);
    if (!archived) {
      return res
        .status(404)
        .json(createResponse(false, null, "Product not found"));
    }
    res.json(
      createResponse(true, { message: "Product archived successfully" }),
    );
  } catch (err) {
    next(err);
  }
}

export async function restoreProduct(req, res, next) {
  try {
    const restored = restore(req.params.id);
    if (!restored) {
      return res
        .status(404)
        .json(createResponse(false, null, "Product not found"));
    }
    res.json(
      createResponse(true, { message: "Product restored successfully" }),
    );
  } catch (err) {
    next(err);
  }
}

export async function searchData(req, res, next) {
  try {
    const dummyData = [
      {
        id: "1",
        name: "Wireless Headphones",
        category: "Electronics",
        price: 79.99,
        inStock: true,
      },
      {
        id: "2",
        name: "Running Shoes",
        category: "Sports",
        price: 129.99,
        inStock: true,
      },
      {
        id: "3",
        name: "Coffee Maker",
        category: "Home",
        price: 49.99,
        inStock: false,
      },
      {
        id: "4",
        name: "Yoga Mat",
        category: "Sports",
        price: 24.99,
        inStock: true,
      },
      {
        id: "5",
        name: "Bluetooth Speaker",
        category: "Electronics",
        price: 59.99,
        inStock: true,
      },
    ];
    res.json(createResponse(true, dummyData));
  } catch (err) {
    next(err);
  }
}

export async function searchDataDemo(req, res, next) {
  try {
    const dummyData = [
      {
        id: "demo-1",
        name: "Smart Watch Series 5",
        category: "Electronics",
        price: 299.99,
        inStock: true,
        sku: "SW5-001",
        description: "Latest smartwatch with health tracking",
      },
      {
        id: "demo-2",
        name: "Mechanical Keyboard",
        category: "Electronics",
        price: 149.99,
        inStock: true,
        sku: "MK-87PRO",
        description: "RGB backlit mechanical keyboard",
      },
      {
        id: "demo-3",
        name: "Ergonomic Office Chair",
        category: "Furniture",
        price: 399.99,
        inStock: false,
        sku: "EOC-300",
        description: "Adjustable lumbar support chair",
      },
      {
        id: "demo-4",
        name: "Portable SSD 1TB",
        category: "Electronics",
        price: 129.99,
        inStock: true,
        sku: "PSSD-1TB",
        description: "High-speed external storage",
      },
      {
        id: "demo-5",
        name: "Standing Desk Converter",
        category: "Furniture",
        price: 199.99,
        inStock: true,
        sku: "SDC-PRO",
        description: "Gas-spring height adjustable converter",
      },
      {
        id: "demo-6",
        name: "USB-C Hub 7-in-1",
        category: "Electronics",
        price: 49.99,
        inStock: true,
        sku: "UCH-7IN1",
        description: "Multi-port adapter for laptops",
      },
    ];
    res.json(createResponse(true, dummyData));
  } catch (err) {
    next(err);
  }
}

export async function searchDataDemoNew(req, res, next) {
  try {
    const dummyData = [
      {
        id: "new-1",
        name: "4K Webcam Pro",
        category: "Electronics",
        price: 189.99,
        inStock: true,
        sku: "4KWP-200",
        description: "Ultra HD webcam with auto-focus and privacy cover",
        rating: 4.7,
        tags: ["streaming", "work-from-home", "recording"],
      },
      {
        id: "new-2",
        name: "Noise-Canceling Earbuds",
        category: "Electronics",
        price: 249.99,
        inStock: true,
        sku: "NCE-BUDS",
        description: "Active noise cancellation with 30hr battery life",
        rating: 4.8,
        tags: ["audio", "travel", "commuting"],
      },
      {
        id: "new-3",
        name: "Smart Garden Kit",
        category: "Home & Garden",
        price: 89.99,
        inStock: true,
        sku: "SGK-STARTER",
        description: "Automated indoor herb garden with LED grow lights",
        rating: 4.5,
        tags: ["gardening", "smart-home", "indoor"],
      },
      {
        id: "new-4",
        name: "Wireless Charging Pad Trio",
        category: "Electronics",
        price: 79.99,
        inStock: false,
        sku: "WCP-3X",
        description: "Charge phone, watch, and earbuds simultaneously",
        rating: 4.6,
        tags: ["charging", "accessories", "convenience"],
      },
      {
        id: "new-5",
        name: "Compact Air Purifier",
        category: "Home & Garden",
        price: 159.99,
        inStock: true,
        sku: "CAP-MINI",
        description: "HEPA filtration for rooms up to 300 sq ft",
        rating: 4.4,
        tags: ["health", "air-quality", "bedroom"],
      },
      {
        id: "new-6",
        name: "Foldable Solar Panel 20W",
        category: "Outdoor",
        price: 119.99,
        inStock: true,
        sku: "FSP-20W",
        description: "Portable solar charger for camping and emergencies",
        rating: 4.3,
        tags: ["solar", "camping", "off-grid", "renewable"],
      },
      {
        id: "new-7",
        name: "Smart Water Bottle",
        category: "Health & Fitness",
        price: 69.99,
        inStock: true,
        sku: "SWB-HYDRATE",
        description: "Tracks hydration and glows to remind you to drink",
        rating: 4.2,
        tags: ["health", "fitness", "smart-device", "hydration"],
      },
      {
        id: "new-8",
        name: "Magnetic Cable Organizer Set",
        category: "Accessories",
        price: 24.99,
        inStock: true,
        sku: "MCO-SET",
        description: "Keep cables tidy with strong magnetic clips",
        rating: 4.6,
        tags: ["organization", "desk-setup", "cable-management"],
      },
    ];
    res.json(createResponse(true, dummyData));
  } catch (err) {
    next(err);
  }
}
