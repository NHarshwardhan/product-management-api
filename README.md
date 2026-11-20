# Product Management API

A RESTful API for managing a product catalogue with full CRUD operations, advanced filtering, soft-archive (delete/restore), and SKU uniqueness enforcement. Built with Express.js and ES modules, featuring dual Map indexes for O(1) lookups by ID and SKU.

---

## Prerequisites

- **Node.js v20** or higher
- **npm v10** or higher

---

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd product-management-api

# Install dependencies
npm install
```

---

## Running the Server

```bash
# Production
npm start

# Development (auto-reload on file changes)
npm run dev
```

The server starts on **http://localhost:3000** by default.

---

## Running Tests

```bash
# Run all tests (unit + integration)
npm test

# Run tests with coverage report
npm run test:coverage
```

---

## Response Format

All API responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` for successful requests, `false` for errors |
| `data` | object/array/null | Response payload on success; `null` on error |
| `error` | string/null | Error message when `success` is `false`; `null` on success |

**Error responses** (`success: false`):
```json
{ "success": false, "data": null, "error": "Product not found" }
```

Common HTTP status codes: `200` (OK), `201` (Created), `400` (Validation Error), `404` (Not Found), `409` (Conflict), `500` (Server Error).

---

## API Endpoints

| Method | Path | Description | Example curl |
|--------|------|-------------|--------------|
| `GET` | `/products` | List products with optional filters | `curl "http://localhost:3000/products?category=electronics&inStock=true"` |
| `GET` | `/products/:id` | Get a single product by UUID | `curl "http://localhost:3000/products/550e8400-e29b-41d4-a716-446655440000"` |
| `POST` | `/products` | Create a new product | `curl -X POST http://localhost:3000/products -H "Content-Type: application/json" -d '{"name":"Wireless Headphones","sku":"WH-001","category":"electronics","price":99.99,"stock":10,"description":"Premium noise-cancelling"}'` |
| `PATCH` | `/products/:id` | Partially update a product | `curl -X PATCH http://localhost:3000/products/550e8400-e29b-41d4-a716-446655440000 -H "Content-Type: application/json" -d '{"price":79.99,"stock":15}'` |
| `DELETE` | `/products/:id` | Soft-archive a product (sets `archivedAt`) | `curl -X DELETE http://localhost:3000/products/550e8400-e29b-41d4-a716-446655440000` |
| `DELETE` | `/products/:id/restore` | Restore an archived product | `curl -X DELETE http://localhost:3000/products/550e8400-e29b-41d4-a716-446655440000/restore` |

> **Note:** Archived products are excluded from `GET /products` and `GET /products/:id`. Use `DELETE /products/:id/restore` to restore. SKU and `id` are immutable — they cannot be changed via `PATCH`.

---

## Query Parameters for GET /products

All parameters are optional and combinable.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category` | string | Filter by category: `electronics`, `clothing`, `food`, `books`, `other` | `?category=electronics` |
| `status` | string | Filter by status: `active`, `inactive`, `discontinued` | `?status=active` |
| `minPrice` | number | Minimum price (inclusive) | `?minPrice=10` |
| `maxPrice` | number | Maximum price (inclusive) | `?maxPrice=100` |
| `inStock` | string | `true` = stock > 0, `false` = stock === 0 | `?inStock=true` |
| `search` | string | Case-insensitive partial match on name, SKU, or description | `?search=wireless` |

**Combined example:**
```bash
curl "http://localhost:3000/products?category=electronics&minPrice=50&maxPrice=200&inStock=true&search=pro"
```

**Minimal POST example** (only required fields):
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"New Product","sku":"NP-001","price":29.99}'
```

---

## Product Schema

### Request (POST /products) — `ProductInput`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Product name, non-empty |
| `sku` | string | **Yes** | Stock Keeping Unit, unique across active products |
| `description` | string | No | Optional description (default: `""`) |
| `category` | string | No | One of: `electronics`, `clothing`, `food`, `books`, `other` (default: `other`) |
| `price` | number | **Yes** | Positive number, max 2 decimal places |
| `stock` | integer | No | Non-negative integer (default: `0`) |
| `status` | string | No | One of: `active`, `inactive`, `discontinued` (default: `active`) |

### Request (PATCH /products/:id) — `ProductPatch`

All fields optional. Immutable fields (`id`, `sku`, `createdAt`) are ignored if sent. Unknown fields are silently stripped.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Product name, non-empty |
| `description` | string | Product description |
| `category` | string | One of: `electronics`, `clothing`, `food`, `books`, `other` |
| `price` | number | Positive number, max 2 decimal places |
| `stock` | integer | Non-negative integer |
| `status` | string | One of: `active`, `inactive`, `discontinued` |

### Response — `Product`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID v4) | Unique identifier, generated on create |
| `name` | string | Product name |
| `sku` | string | Stock Keeping Unit (unique among active products) |
| `description` | string | Product description |
| `category` | string | One of: `electronics`, `clothing`, `food`, `books`, `other` |
| `price` | number | Price (positive, max 2 decimal places) |
| `stock` | integer | Available stock quantity |
| `status` | string | One of: `active`, `inactive`, `discontinued` |
| `createdAt` | string (ISO 8601) | Creation timestamp |
| `archivedAt` | string (ISO 8601) \| null | `null` for active products, timestamp when archived |

**Example product object:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Wireless Headphones",
  "sku": "WH-001",
  "description": "Premium noise-cancelling headphones",
  "category": "electronics",
  "price": 99.99,
  "stock": 10,
  "status": "active",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "archivedAt": null
}
```

---

## Project Folder Structure

```
product-management-api/
├── src/
│   ├── index.js                 # Entry point, starts Express server
│   ├── app.js                   # Express app factory (createApp)
│   ├── controllers/
│   │   └── productController.js # Request handlers (6 endpoints)
│   ├── models/
│   │   └── product.js           # In-memory store + business logic
│   ├── routes/
│   │   └── products.js          # Route definitions + validators
│   ├── validators/
│   │   └── productValidator.js  # express-validator chains
│   └── middleware/
│       └── errorHandler.js      # Centralized error handling
├── tests/
│   ├── product.model.test.js    # Unit tests (26 tests)
│   └── products.api.test.js     # Integration tests (33 tests)
├── package.json
└── README.md
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |

**Example:**
```bash
PORT=8080 NODE_ENV=production npm start
```

---

## Contributing

1. Fork the repository and create a feature branch
2. Write tests for new functionality (unit + integration)
3. Ensure all tests pass (`npm test`) and coverage stays above 85%
4. Follow existing code style (ES modules, JSDoc comments on exports)
5. Submit a pull request with a clear description of changes

---

## License

MIT License — see `package.json` for details.