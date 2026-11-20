import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { createApp } from '../src/app.js';
import * as productModel from '../src/models/product.js';

describe('Products API', () => {
  let app;
  let request;

  beforeEach(() => {
    productModel.clearAll();
    app = createApp();
    request = supertest(app);
  });

  // Seed data for each test group
  let product1, product2;

  beforeEach(async () => {
    product1 = productModel.create({
      name: 'Wireless Headphones',
      sku: 'WH-001',
      category: 'electronics',
      price: 99.99,
      stock: 10,
      description: 'Premium wireless headphones with noise cancellation'
    });

    product2 = productModel.create({
      name: 'Cotton T-Shirt',
      sku: 'CT-001',
      category: 'clothing',
      price: 19.99,
      stock: 0,
      description: '100% organic cotton t-shirt'
    });
  });

  describe('GET /products', () => {
    it('returns 200 and an array', async () => {
      const res = await request.get('/products').expect(200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it('returns only non-archived products', async () => {
      productModel.archive(product1.id);
      const res = await request.get('/products').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].id, product2.id);
    });

    it('?category=electronics returns only matching products', async () => {
      const res = await request.get('/products?category=electronics').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].category, 'electronics');
      assert.equal(res.body.data[0].name, 'Wireless Headphones');
    });

    it('?category=unknown returns 400 (invalid enum)', async () => {
      const res = await request.get('/products?category=unknown').expect(400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('category must be one of'));
    });

    it('?minPrice and ?maxPrice filter correctly', async () => {
      // price range 50-150 should only match Wireless Headphones (99.99)
      const res = await request.get('/products?minPrice=50&maxPrice=150').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Wireless Headphones');
      assert.ok(res.body.data[0].price >= 50 && res.body.data[0].price <= 150);
    });

    it('?minPrice=abc (non-numeric) returns 400', async () => {
      const res = await request.get('/products?minPrice=abc').expect(400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('minPrice must be a positive number'));
    });

    it('?maxPrice=abc (non-numeric) returns 400', async () => {
      const res = await request.get('/products?maxPrice=xyz').expect(400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('maxPrice must be a positive number'));
    });

    it('?inStock=true returns products with stock > 0', async () => {
      const res = await request.get('/products?inStock=true').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Wireless Headphones');
      assert.ok(res.body.data[0].stock > 0);
    });

    it('?search=<term> matches on name and description', async () => {
      // Search for "wireless" - matches name of product1
      const res1 = await request.get('/products?search=wireless').expect(200);
      assert.equal(res1.body.data.length, 1);
      assert.equal(res1.body.data[0].name, 'Wireless Headphones');

      // Search for "cotton" - matches description of product2
      const res2 = await request.get('/products?search=cotton').expect(200);
      assert.equal(res2.body.data.length, 1);
      assert.equal(res2.body.data[0].name, 'Cotton T-Shirt');
    });
  });

  describe('GET /products/:id', () => {
    it('returns 200 with the correct product', async () => {
      const res = await request.get(`/products/${product1.id}`).expect(200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, product1.id);
      assert.equal(res.body.data.name, 'Wireless Headphones');
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request.get('/products/00000000-0000-0000-0000-000000000000').expect(404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });

    it('returns 404 for an archived product id', async () => {
      productModel.archive(product1.id);
      const res = await request.get(`/products/${product1.id}`).expect(404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });
  });

  describe('POST /products', () => {
    it('returns 201 with the created product including id and createdAt', async () => {
      const res = await request
        .post('/products')
        .send({
          name: 'New Product',
          sku: 'NP-001',
          category: 'books',
          price: 29.99,
          stock: 5
        })
        .expect(201);

      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.match(res.body.data.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      assert.ok(res.body.data.createdAt);
      assert.equal(res.body.data.name, 'New Product');
      assert.equal(res.body.data.sku, 'NP-001');
      assert.equal(res.body.data.status, 'active');
      assert.equal(res.body.data.archivedAt, null);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request
        .post('/products')
        .send({
          sku: 'NP-001',
          category: 'books',
          price: 29.99,
          stock: 5
        })
        .expect(400);

      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('name is required'));
    });

    it('returns 400 when sku format is invalid', async () => {
      const res = await request
        .post('/products')
        .send({
          name: 'New Product',
          sku: '',  // empty sku
          category: 'books',
          price: 29.99,
          stock: 5
        })
        .expect(400);

      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('sku is required'));
    });

    it('returns 400 when price is negative', async () => {
      const res = await request
        .post('/products')
        .send({
          name: 'New Product',
          sku: 'NP-001',
          category: 'books',
          price: -10,
          stock: 5
        })
        .expect(400);

      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('price must be a positive number'));
    });

    it('returns 400 when price is zero (must be positive)', async () => {
      const res = await request
        .post('/products')
        .send({
          name: 'New Product',
          sku: 'NP-002',
          category: 'books',
          price: 0,
          stock: 5
        })
        .expect(400);

      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('price must be a positive number'));
    });

    it('accepts stock = 0 (out of stock is valid)', async () => {
      const res = await request
        .post('/products')
        .send({
          name: 'Out of Stock Product',
          sku: 'OS-001',
          category: 'books',
          price: 29.99,
          stock: 0
        })
        .expect(201);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.stock, 0);
      assert.equal(res.body.data.status, 'active');
    });

    it('returns 400 when sku already exists (conflict)', async () => {
      // First create a product with this SKU
      await request
        .post('/products')
        .send({
          name: 'First Product',
          sku: 'DUPLICATE-SKU',
          category: 'books',
          price: 29.99,
          stock: 5
        })
        .expect(201);

      // Try to create another with same SKU
      const res = await request
        .post('/products')
        .send({
          name: 'Second Product',
          sku: 'DUPLICATE-SKU',
          category: 'electronics',
          price: 99.99,
          stock: 10
        })
        .expect(400);

      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('SKU must be unique'));
    });

    it('two concurrent POSTs with same SKU - only one succeeds', async () => {
      const payload = {
        name: 'Concurrent Product',
        sku: 'CONCURRENT-SKU',
        category: 'books',
        price: 29.99,
        stock: 5
      };

      // Fire two requests concurrently
      const [res1, res2] = await Promise.all([
        request.post('/products').send(payload),
        request.post('/products').send(payload)
      ]);

      const statusCodes = [res1.status, res2.status].sort();
      // One should succeed (201), one should fail (400)
      assert.deepEqual(statusCodes, [201, 400]);
      const successRes = res1.status === 201 ? res1 : res2;
      assert.equal(successRes.body.success, true);
      assert.equal(successRes.body.data.sku, 'CONCURRENT-SKU');
    });
  });

  describe('PATCH /products/:id', () => {
    it('returns 200 with only the patched fields changed', async () => {
      const res = await request
        .patch(`/products/${product1.id}`)
        .send({ name: 'Updated Headphones', price: 79.99 })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Updated Headphones');
      assert.equal(res.body.data.price, 79.99);
      // Unchanged fields
      assert.equal(res.body.data.sku, 'WH-001');
      assert.equal(res.body.data.stock, 10);
      assert.equal(res.body.data.category, 'electronics');
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request
        .patch('/products/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Updated' })
        .expect(404);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });

    it('returns 200 when the body is empty (no changes)', async () => {
      const res = await request
        .patch(`/products/${product1.id}`)
        .send({})
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Wireless Headphones');
    });

    it('does not allow updating sku or id', async () => {
      const originalId = product1.id;
      const originalSku = product1.sku;

      const res = await request
        .patch(`/products/${product1.id}`)
        .send({ id: 'hacked-id', sku: 'HACKED-SKU', name: 'Updated Name' })
        .expect(200);

      assert.equal(res.body.data.id, originalId);
      assert.equal(res.body.data.sku, originalSku);
      assert.equal(res.body.data.name, 'Updated Name');
    });

    it('strips unknown fields from patch', async () => {
      const res = await request
        .patch(`/products/${product1.id}`)
        .send({ name: 'Updated', unknownField: 'should be ignored', another: 123 })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Updated');
      assert.ok(!('unknownField' in res.body.data));
      assert.ok(!('another' in res.body.data));
    });

    it('returns 404 when patching an archived product', async () => {
      productModel.archive(product1.id);
      const res = await request
        .patch(`/products/${product1.id}`)
        .send({ name: 'Updated' })
        .expect(404);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });
  });

  describe('DELETE /products/:id (archive)', () => {
    it('returns 200 with success message', async () => {
      const res = await request.delete(`/products/${product1.id}`).expect(200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.message, 'Product archived successfully');
    });

    it('subsequent GET /products/:id returns 404', async () => {
      await request.delete(`/products/${product1.id}`).expect(200);
      const res = await request.get(`/products/${product1.id}`).expect(404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });
  });

  describe('DELETE /products/:id/restore', () => {
    it('returns 200 and product reappears in GET /products', async () => {
      // Archive first
      await request.delete(`/products/${product1.id}`).expect(200);

      // Restore
      const res = await request.delete(`/products/${product1.id}/restore`).expect(200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.message, 'Product restored successfully');

      // Verify it reappears in list
      const listRes = await request.get('/products').expect(200);
      assert.equal(listRes.body.data.length, 2);
      const restored = listRes.body.data.find(p => p.id === product1.id);
      assert.ok(restored);
      assert.equal(restored.name, 'Wireless Headphones');
    });

    it('returns 404 when restoring a product that was never archived', async () => {
      const res = await request.delete(`/products/${product1.id}/restore`).expect(404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Product not found');
    });
  });
});