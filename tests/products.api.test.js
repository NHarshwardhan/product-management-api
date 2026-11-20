import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { clearAll, create, archive } from '../src/models/product.js';

let app;

describe('Products API', () => {
  beforeEach(() => {
    clearAll();
    app = createApp();
  });

  after(() => {
    clearAll();
  });

  describe('GET /products', () => {
    it('should return empty array when no products', async () => {
      const res = await request(app).get('/products');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.deepEqual(res.body.data, []);
      assert.equal(res.body.error, null);
    });

    it('should return all non-archived products', async () => {
      create({ name: 'Active', sku: 'ACT-001', price: 10 });
      const archived = create({ name: 'Archived', sku: 'ARC-001', price: 20 });
      archive(archived.id);

      const res = await request(app).get('/products');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Active');
    });

    it('should filter by category', async () => {
      create({ name: 'Electronics', sku: 'ELEC-001', price: 10, category: 'electronics' });
      create({ name: 'Clothing', sku: 'CLTH-001', price: 20, category: 'clothing' });

      const res = await request(app).get('/products?category=electronics');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].category, 'electronics');
    });

    it('should filter by status', async () => {
      create({ name: 'Active', sku: 'ACT-001', price: 10, status: 'active' });
      create({ name: 'Inactive', sku: 'INACT-001', price: 20, status: 'inactive' });

      const res = await request(app).get('/products?status=active');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].status, 'active');
    });

    it('should filter by minPrice', async () => {
      create({ name: 'Cheap', sku: 'CHEAP-001', price: 5 });
      create({ name: 'Expensive', sku: 'EXP-001', price: 100 });

      const res = await request(app).get('/products?minPrice=50');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Expensive');
    });

    it('should filter by maxPrice', async () => {
      create({ name: 'Cheap', sku: 'CHEAP-001', price: 5 });
      create({ name: 'Expensive', sku: 'EXP-001', price: 100 });

      const res = await request(app).get('/products?maxPrice=50');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Cheap');
    });

    it('should filter by search term', async () => {
      create({ name: 'Wireless Headphones', sku: 'WH-001', price: 100 });
      create({ name: 'USB Cable', sku: 'USB-001', price: 10 });

      const res = await request(app).get('/products?search=wireless');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Wireless Headphones');
    });

    it('should filter by inStock', async () => {
      create({ name: 'In Stock', sku: 'IN-001', price: 10, stock: 5 });
      create({ name: 'Out of Stock', sku: 'OUT-001', price: 20, stock: 0 });

      const inStockRes = await request(app).get('/products?inStock=true');
      assert.equal(inStockRes.status, 200);
      assert.equal(inStockRes.body.data.length, 1);
      assert.equal(inStockRes.body.data[0].name, 'In Stock');

      const outOfStockRes = await request(app).get('/products?inStock=false');
      assert.equal(outOfStockRes.status, 200);
      assert.equal(outOfStockRes.body.data.length, 1);
      assert.equal(outOfStockRes.body.data[0].name, 'Out of Stock');
    });

    it('should combine multiple filters', async () => {
      create({ name: 'Electronics Active', sku: 'EA-001', price: 100, category: 'electronics', status: 'active', stock: 10 });
      create({ name: 'Electronics Inactive', sku: 'EI-001', price: 50, category: 'electronics', status: 'inactive', stock: 5 });
      create({ name: 'Clothing Active', sku: 'CA-001', price: 30, category: 'clothing', status: 'active', stock: 0 });

      const res = await request(app).get('/products?category=electronics&status=active&inStock=true');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Electronics Active');
    });

    it('should return 400 for invalid category', async () => {
      const res = await request(app).get('/products?category=invalid');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('category must be one of'));
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app).get('/products?status=invalid');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('status must be one of'));
    });

    it('should return 400 for invalid inStock', async () => {
      const res = await request(app).get('/products?inStock=maybe');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('inStock must be true or false'));
    });

    it('should sort by createdAt descending', async () => {
      const first = create({ name: 'First', sku: 'FIRST-001', price: 10 });
      // Small delay to ensure different timestamps
      await new Promise(r => setTimeout(r, 50));
      const second = create({ name: 'Second', sku: 'SECOND-001', price: 20 });

      const res = await request(app).get('/products');
      assert.equal(res.status, 200);
      assert.equal(res.body.data[0].id, second.id);
      assert.equal(res.body.data[1].id, first.id);
    });
  });

  describe('GET /products/:id', () => {
    it('should return product by ID', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });

      const res = await request(app).get(`/products/${created.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, created.id);
      assert.equal(res.body.data.name, 'Test');
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app).get('/products/550e8400-e29b-41d4-a716-446655440000');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });

    it('should return 404 for archived product', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      archive(created.id);

      const res = await request(app).get(`/products/${created.id}`);
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });
  });

  describe('POST /products', () => {
    it('should create a product with minimal fields', async () => {
      const res = await request(app)
        .post('/products')
        .send({ name: 'New Product', sku: 'NP-001', price: 29.99 });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.equal(res.body.data.name, 'New Product');
      assert.equal(res.body.data.sku, 'NP-001');
      assert.equal(res.body.data.price, 29.99);
      assert.equal(res.body.data.stock, 0);
      assert.equal(res.body.data.status, 'active');
      assert.equal(res.body.data.category, 'other');
      assert.ok(res.body.data.createdAt);
      assert.equal(res.body.data.archivedAt, null);
    });

    it('should create a product with all fields', async () => {
      const res = await request(app)
        .post('/products')
        .send({
          name: 'Full Product',
          sku: 'FULL-001',
          description: 'A full product',
          category: 'electronics',
          price: 99.99,
          stock: 10,
          status: 'inactive'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.description, 'A full product');
      assert.equal(res.body.data.category, 'electronics');
      assert.equal(res.body.data.stock, 10);
      assert.equal(res.body.data.status, 'inactive');
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/products')
        .send({ sku: 'NP-001', price: 29.99 });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('name is required'));
    });

    it('should return 400 for missing sku', async () => {
      const res = await request(app)
        .post('/products')
        .send({ name: 'New Product', price: 29.99 });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('sku is required'));
    });

    it('should return 400 for missing price', async () => {
      const res = await request(app)
        .post('/products')
        .send({ name: 'New Product', sku: 'NP-001' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('price is required'));
    });

    it('should return 400 for invalid price', async () => {
      const res = await request(app)
        .post('/products')
        .send({ name: 'New Product', sku: 'NP-001', price: -5 });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('price must be a positive number'));
    });

    it('should return 400 for price with too many decimals', async () => {
      const res = await request(app)
        .post('/products')
        .send({ name: 'New Product', sku: 'NP-001', price: 10.123 });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('price must have at most 2 decimal places'));
    });

    it('should return 409 for duplicate SKU', async () => {
      await request(app).post('/products').send({ name: 'Product 1', sku: 'DUP-001', price: 10 });
      const res = await request(app).post('/products').send({ name: 'Product 2', sku: 'DUP-001', price: 20 });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('SKU must be unique'));
    });

    it('should return 400 for invalid category', async () => {
      const res = await request(app)
        .post('/products')
        .send({ name: 'New Product', sku: 'NP-001', price: 10, category: 'invalid' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('category must be one of'));
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .post('/products')
        .send({ name: 'New Product', sku: 'NP-001', price: 10, status: 'invalid' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('status must be one of'));
    });

    it('should return 400 for negative stock', async () => {
      const res = await request(app)
        .post('/products')
        .send({ name: 'New Product', sku: 'NP-001', price: 10, stock: -1 });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('stock must be a non-negative integer'));
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update product fields', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });

      const res = await request(app)
        .patch(`/products/${created.id}`)
        .send({ name: 'Updated', price: 20 });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Updated');
      assert.equal(res.body.data.price, 20);
      assert.equal(res.body.data.sku, 'TEST-001');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .patch('/products/550e8400-e29b-41d4-a716-446655440000')
        .send({ name: 'Updated' });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });

    it('should return 404 for archived product', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      archive(created.id);

      const res = await request(app)
        .patch(`/products/${created.id}`)
        .send({ name: 'Updated' });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });

    it('should return 400 for invalid price', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });

      const res = await request(app)
        .patch(`/products/${created.id}`)
        .send({ price: -5 });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('price must be a positive number'));
    });

    it('should return 409 for duplicate SKU', async () => {
      create({ name: 'Test 1', sku: 'TEST-001', price: 10 });
      const product2 = create({ name: 'Test 2', sku: 'TEST-002', price: 20 });

      const res = await request(app)
        .patch(`/products/${product2.id}`)
        .send({ sku: 'TEST-001' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('SKU must be unique'));
    });

    it('should ignore immutable fields (id, createdAt)', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      const originalId = created.id;
      const originalCreatedAt = created.createdAt.toISOString();

      const res = await request(app)
        .patch(`/products/${created.id}`)
        .send({ id: 'new-id', createdAt: '2020-01-01', name: 'Updated' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, originalId);
      assert.equal(res.body.data.createdAt, originalCreatedAt);
      assert.equal(res.body.data.name, 'Updated');
    });

    it('should allow partial updates', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10, stock: 5, status: 'active' });

      const res = await request(app)
        .patch(`/products/${created.id}`)
        .send({ stock: 20 });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.stock, 20);
      assert.equal(res.body.data.name, 'Test');
      assert.equal(res.body.data.price, 10);
      assert.equal(res.body.data.status, 'active');
    });
  });

  describe('DELETE /products/:id (archive)', () => {
    it('should archive a product', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });

      const res = await request(app).delete(`/products/${created.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.message, 'Product archived successfully');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).delete('/products/550e8400-e29b-41d4-a716-446655440000');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });

    it('should return 404 for already archived product', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      await request(app).delete(`/products/${created.id}`);

      const res = await request(app).delete(`/products/${created.id}`);
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });

    it('should exclude archived product from listings', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      await request(app).delete(`/products/${created.id}`);

      const res = await request(app).get('/products');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 0);
    });

    it('should make SKU available for reuse after archive', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      await request(app).delete(`/products/${created.id}`);

      const res = await request(app).post('/products').send({ name: 'New', sku: 'TEST-001', price: 20 });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.sku, 'TEST-001');
    });
  });

  describe('DELETE /products/:id/restore', () => {
    it('should restore an archived product', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      await request(app).delete(`/products/${created.id}`);

      const res = await request(app).delete(`/products/${created.id}/restore`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.message, 'Product restored successfully');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).delete('/products/550e8400-e29b-41d4-a716-446655440000/restore');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });

    it('should return 404 for never-archived product', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });

      const res = await request(app).delete(`/products/${created.id}/restore`);
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });

    it('should make restored product findable again', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      await request(app).delete(`/products/${created.id}`);
      await request(app).delete(`/products/${created.id}/restore`);

      const res = await request(app).get(`/products/${created.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Test');
    });

    it('should make restored product appear in listings', async () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      await request(app).delete(`/products/${created.id}`);
      await request(app).delete(`/products/${created.id}/restore`);

      const res = await request(app).get('/products');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Test');
    });
  });
});