import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { clearAll } from '../models/product.js';

describe('Product Routes', () => {
  let app;

  beforeEach(() => {
    clearAll();
    app = createApp();
  });

  afterEach(() => {
    clearAll();
  });

  describe('POST /products', () => {
    it('should create a product and return 201', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Test Product',
          sku: 'TEST-001',
          category: 'electronics',
          price: 99.99,
          stock: 10,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Product');
      expect(response.body.data.sku).toBe('TEST-001');
      expect(response.body.data.price).toBe(99.99);
      expect(response.body.data.stock).toBe(10);
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          sku: 'TEST-002',
          price: 10,
          stock: 1,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('name is required');
    });

    it('should return 400 for missing sku', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Test',
          price: 10,
          stock: 1,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('sku is required');
    });

    it('should return 400 for invalid category', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Test',
          sku: 'TEST-003',
          category: 'invalid',
          price: 10,
          stock: 1,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('category must be one of');
    });

    it('should return 400 for non-positive price', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Test',
          sku: 'TEST-004',
          price: 0,
          stock: 1,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('price must be a positive number');
    });

    it('should return 400 for negative stock', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Test',
          sku: 'TEST-005',
          price: 10,
          stock: -1,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('stock must be a non-negative integer');
    });

    it('should return 400 for duplicate SKU', async () => {
      await request(app)
        .post('/products')
        .send({
          name: 'Test 1',
          sku: 'TEST-006',
          price: 10,
          stock: 1,
        })
        .expect(201);

      const response = await request(app)
        .post('/products')
        .send({
          name: 'Test 2',
          sku: 'TEST-006',
          price: 20,
          stock: 2,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('SKU must be unique');
    });

    it('should create product with optional fields', async () => {
      const response = await request(app)
        .post('/products')
        .send({
          name: 'Test Product',
          sku: 'TEST-007',
          description: 'A description',
          category: 'books',
          price: 29.99,
          stock: 5,
          status: 'inactive',
        })
        .expect(201);

      expect(response.body.data.description).toBe('A description');
      expect(response.body.data.category).toBe('books');
      expect(response.body.data.status).toBe('inactive');
    });
  });

  describe('GET /products', () => {
    beforeEach(async () => {
      await request(app).post('/products').send({
        name: 'Product A',
        sku: 'A-001',
        category: 'electronics',
        price: 100,
        stock: 5,
      });
      await request(app).post('/products').send({
        name: 'Product B',
        sku: 'B-002',
        category: 'clothing',
        price: 50,
        stock: 0,
      });
    });

    it('should return all products', async () => {
      const response = await request(app).get('/products').expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by category', async () => {
      const response = await request(app).get('/products?category=electronics').expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('electronics');
    });

    it('should filter by minPrice', async () => {
      const response = await request(app).get('/products?minPrice=75').expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].price).toBeGreaterThanOrEqual(75);
    });

    it('should filter by maxPrice', async () => {
      const response = await request(app).get('/products?maxPrice=75').expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].price).toBeLessThanOrEqual(75);
    });

    it('should filter by search', async () => {
      const response = await request(app).get('/products?search=Product A').expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Product A');
    });

    it('should filter by inStock=true', async () => {
      const response = await request(app).get('/products?inStock=true').expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].stock).toBeGreaterThan(0);
    });

    it('should filter by inStock=false', async () => {
      const response = await request(app).get('/products?inStock=false').expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].stock).toBe(0);
    });
  });

  describe('GET /products/:id', () => {
    it('should return product by id', async () => {
      const createResponse = await request(app).post('/products').send({
        name: 'Test Product',
        sku: 'TEST-008',
        price: 10,
        stock: 1,
      });
      const created = createResponse.body.data;

      const response = await request(app).get(`/products/${created.id}`).expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(created.id);
    });

    it('should return 404 for non-existent id', async () => {
      const response = await request(app).get('/products/non-existent-id').expect(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update a product', async () => {
      const createResponse = await request(app).post('/products').send({
        name: 'Test Product',
        sku: 'TEST-009',
        price: 10,
        stock: 1,
      });
      const created = createResponse.body.data;

      const response = await request(app)
        .patch(`/products/${created.id}`)
        .send({
          name: 'Updated Product',
          price: 20,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Product');
      expect(response.body.data.price).toBe(20);
      expect(response.body.data.sku).toBe('TEST-009');
    });

    it('should return 404 for non-existent id', async () => {
      const response = await request(app)
        .patch('/products/non-existent-id')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });

    it('should return 400 for invalid data', async () => {
      const createResponse = await request(app).post('/products').send({
        name: 'Test Product',
        sku: 'TEST-010',
        price: 10,
        stock: 1,
      });
      const created = createResponse.body.data;

      const response = await request(app)
        .patch(`/products/${created.id}`)
        .send({ price: -5 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('price must be a positive number');
    });
  });

  describe('DELETE /products/:id (archive)', () => {
    it('should archive a product', async () => {
      const createResponse = await request(app).post('/products').send({
        name: 'Test Product',
        sku: 'TEST-011',
        price: 10,
        stock: 1,
      });
      const created = createResponse.body.data;

      const response = await request(app).delete(`/products/${created.id}`).expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Product archived successfully');

      // Verify it's archived
      await request(app).get(`/products/${created.id}`).expect(404);
    });

    it('should return 404 for non-existent id', async () => {
      const response = await request(app).delete('/products/non-existent-id').expect(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });
  });

  describe('DELETE /products/:id/restore', () => {
    it('should restore an archived product', async () => {
      const createResponse = await request(app).post('/products').send({
        name: 'Test Product',
        sku: 'TEST-012',
        price: 10,
        stock: 1,
      });
      const created = createResponse.body.data;

      // Archive first
      await request(app).delete(`/products/${created.id}`).expect(200);

      // Restore
      const response = await request(app).delete(`/products/${created.id}/restore`).expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Product restored successfully');

      // Verify it's restored
      await request(app).get(`/products/${created.id}`).expect(200);
    });

    it('should return 404 for non-existent id', async () => {
      const response = await request(app).delete('/products/non-existent-id/restore').expect(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });
  });
});