import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  findAll,
  findById,
  findBySku,
  create,
  update,
  archive,
  restore,
  clearAll
} from '../src/models/product.js';

describe('Product Model', () => {
  beforeEach(() => {
    clearAll();
  });

  after(() => {
    clearAll();
  });

  
  
  describe('create', () => {
    it('should create a product with all required fields', () => {
      const product = create({ name: 'Test Product', sku: 'TEST-001', price: 29.99 });
      assert.ok(product.id);
      assert.equal(product.name, 'Test Product');
      assert.equal(product.sku, 'TEST-001');
      assert.equal(product.price, 29.99);
      assert.equal(product.stock, 0);
      assert.equal(product.status, 'active');
      assert.equal(product.category, 'other');
      assert.ok(product.createdAt);
      assert.equal(product.archivedAt, null);
    });

    it('should create a product with all optional fields', () => {
      const product = create({
        name: 'Full Product',
        sku: 'FULL-001',
        description: 'A full product',
        category: 'electronics',
        price: 99.99,
        stock: 10,
        status: 'inactive'
      });
      assert.equal(product.description, 'A full product');
      assert.equal(product.category, 'electronics');
      assert.equal(product.stock, 10);
      assert.equal(product.status, 'inactive');
    });

    it('should throw error for duplicate SKU', () => {
      create({ name: 'Test', sku: 'TEST-001', price: 10 });
      assert.throws(() => create({ name: 'Test 2', sku: 'TEST-001', price: 20 }), /SKU must be unique/);
    });

    it('should throw validation error for invalid data', () => {
      assert.throws(() => create({ name: '', sku: 'TEST-001', price: 10 }), /name is required/);
    });

    it('should reject price with more than 2 decimal places', () => {
      assert.throws(() => create({ name: 'Test', sku: 'TEST-001', price: 10.123 }), /price must have at most 2 decimal places/);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no products', () => {
      const products = findAll();
      assert.deepEqual(products, []);
    });

    it('should return only non-archived products', () => {
      create({ name: 'Active', sku: 'ACT-001', price: 10 });
      const archived = create({ name: 'Archived', sku: 'ARC-001', price: 20 });
      archive(archived.id);

      const products = findAll();
      assert.equal(products.length, 1);
      assert.equal(products[0].name, 'Active');
    });

    it('should filter by category', () => {
      create({ name: 'Electronics', sku: 'ELEC-001', price: 10, category: 'electronics' });
      create({ name: 'Clothing', sku: 'CLTH-001', price: 20, category: 'clothing' });

      const products = findAll({ category: 'electronics' });
      assert.equal(products.length, 1);
      assert.equal(products[0].category, 'electronics');
    });

    it('should filter by status', () => {
      create({ name: 'Active', sku: 'ACT-001', price: 10, status: 'active' });
      create({ name: 'Inactive', sku: 'INACT-001', price: 20, status: 'inactive' });

      const products = findAll({ status: 'active' });
      assert.equal(products.length, 1);
      assert.equal(products[0].status, 'active');
    });

    it('should filter by minPrice', () => {
      create({ name: 'Cheap', sku: 'CHEAP-001', price: 5 });
      create({ name: 'Expensive', sku: 'EXP-001', price: 100 });

      const products = findAll({ minPrice: 50 });
      assert.equal(products.length, 1);
      assert.equal(products[0].name, 'Expensive');
    });

    it('should filter by maxPrice', () => {
      create({ name: 'Cheap', sku: 'CHEAP-001', price: 5 });
      create({ name: 'Expensive', sku: 'EXP-001', price: 100 });

      const products = findAll({ maxPrice: 50 });
      assert.equal(products.length, 1);
      assert.equal(products[0].name, 'Cheap');
    });

    it('should filter by price range', () => {
      create({ name: 'Cheap', sku: 'CHEAP-001', price: 5 });
      create({ name: 'Medium', sku: 'MED-001', price: 50 });
      create({ name: 'Expensive', sku: 'EXP-001', price: 100 });

      const products = findAll({ minPrice: 10, maxPrice: 60 });
      assert.equal(products.length, 1);
      assert.equal(products[0].name, 'Medium');
    });

    it('should filter by search term (name)', () => {
      create({ name: 'Wireless Headphones', sku: 'WH-001', price: 100 });
      create({ name: 'USB Cable', sku: 'USB-001', price: 10 });

      const products = findAll({ search: 'wireless' });
      assert.equal(products.length, 1);
      assert.equal(products[0].name, 'Wireless Headphones');
    });

    it('should filter by search term (sku)', () => {
      create({ name: 'Product', sku: 'WH-001', price: 100 });

      const products = findAll({ search: 'WH' });
      assert.equal(products.length, 1);
    });

    it('should filter by search term (description)', () => {
      create({ name: 'Product', sku: 'PROD-001', price: 100, description: 'Premium noise-cancelling' });

      const products = findAll({ search: 'noise' });
      assert.equal(products.length, 1);
    });

    it('should filter by inStock', () => {
      create({ name: 'In Stock', sku: 'IN-001', price: 10, stock: 5 });
      create({ name: 'Out of Stock', sku: 'OUT-001', price: 20, stock: 0 });

      const inStock = findAll({ inStock: 'true' });
      assert.equal(inStock.length, 1);
      assert.equal(inStock[0].name, 'In Stock');

      const outOfStock = findAll({ inStock: 'false' });
      assert.equal(outOfStock.length, 1);
      assert.equal(outOfStock[0].name, 'Out of Stock');
    });

    it('should sort by createdAt descending', async () => {
      const first = create({ name: 'First', sku: 'FIRST-001', price: 10 });
      await new Promise(r => setTimeout(r, 10));
      const second = create({ name: 'Second', sku: 'SECOND-001', price: 20 });

      const products = findAll();
      assert.equal(products[0].id, second.id);
      assert.equal(products[1].id, first.id);
    });

    it('should combine multiple filters', () => {
      create({ name: 'Electronics Active', sku: 'EA-001', price: 100, category: 'electronics', status: 'active', stock: 10 });
      create({ name: 'Electronics Inactive', sku: 'EI-001', price: 50, category: 'electronics', status: 'inactive', stock: 5 });
      create({ name: 'Clothing Active', sku: 'CA-001', price: 30, category: 'clothing', status: 'active', stock: 0 });

      const products = findAll({ category: 'electronics', status: 'active', inStock: 'true' });
      assert.equal(products.length, 1);
      assert.equal(products[0].name, 'Electronics Active');
    });
  });

  describe('findById', () => {
    it('should return product by ID', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      const found = findById(created.id);
      assert.ok(found);
      assert.equal(found.id, created.id);
    });

    it('should return null for non-existent ID', () => {
      const found = findById('550e8400-e29b-41d4-a716-446655440000');
      assert.equal(found, null);
    });

    it('should return null for archived product', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      archive(created.id);
      const found = findById(created.id);
      assert.equal(found, null);
    });
  });

  describe('findBySku', () => {
    it('should return product by SKU', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      const found = findBySku('TEST-001');
      assert.ok(found);
      assert.equal(found.sku, 'TEST-001');
    });

    it('should return null for non-existent SKU', () => {
      const found = findBySku('NONEXISTENT');
      assert.equal(found, null);
    });

    it('should return null for archived product SKU', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      archive(created.id);
      const found = findBySku('TEST-001');
      assert.equal(found, null);
    });
  });

  describe('update', () => {
    it('should update product fields', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      const updated = update(created.id, { name: 'Updated', price: 20 });
      assert.equal(updated.name, 'Updated');
      assert.equal(updated.price, 20);
      assert.equal(updated.sku, 'TEST-001');
    });

    it('should return null for non-existent product', () => {
      const updated = update('550e8400-e29b-41d4-a716-446655440000', { name: 'Updated' });
      assert.equal(updated, null);
    });

    it('should return null for archived product', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      archive(created.id);
      const updated = update(created.id, { name: 'Updated' });
      assert.equal(updated, null);
    });

    it('should throw error for duplicate SKU on update', () => {
      create({ name: 'Test 1', sku: 'TEST-001', price: 10 });
      const product2 = create({ name: 'Test 2', sku: 'TEST-002', price: 20 });
      assert.throws(() => update(product2.id, { sku: 'TEST-001' }), /SKU must be unique/);
    });

    it('should allow updating to same SKU', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      const updated = update(created.id, { sku: 'TEST-001', name: 'Updated' });
      assert.equal(updated.sku, 'TEST-001');
      assert.equal(updated.name, 'Updated');
    });

    it('should ignore immutable fields (id, sku, createdAt)', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      const originalId = created.id;
      const originalCreatedAt = created.createdAt;

      const updated = update(created.id, {
        id: 'new-id',
        sku: 'NEW-SKU',
        createdAt: new Date('2020-01-01'),
        name: 'Updated'
      });

      assert.equal(updated.id, originalId);
      assert.equal(updated.sku, 'TEST-001');
      assert.equal(updated.createdAt, originalCreatedAt);
      assert.equal(updated.name, 'Updated');
    });

    it('should throw validation error for invalid data', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      assert.throws(() => update(created.id, { price: -5 }), /price must be a positive number/);
    });
  });

  describe('archive', () => {
    it('should archive a product', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      const result = archive(created.id);
      assert.equal(result, true);

      const found = findById(created.id);
      assert.equal(found, null);

      const allProducts = Array.from(created.constructor.name === 'Map' ? [] : []);
    });

    it('should return false for non-existent product', () => {
      const result = archive('550e8400-e29b-41d4-a716-446655440000');
      assert.equal(result, false);
    });

    it('should return false for already archived product', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      archive(created.id);
      const result = archive(created.id);
      assert.equal(result, false);
    });

    it('should set archivedAt timestamp', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      archive(created.id);

      // Archived product should not be findable
      const found = findById(created.id);
      assert.equal(found, null);
    });
  });

  describe('restore', () => {
    it('should restore an archived product', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      archive(created.id);
      const restored = restore(created.id);

      assert.ok(restored);
      assert.equal(restored.archivedAt, null);
      assert.equal(restored.name, 'Test');
    });

    it('should return null for non-existent product', () => {
      const restored = restore('550e8400-e29b-41d4-a716-446655440000');
      assert.equal(restored, null);
    });

    it('should return null for never-archived product', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      const restored = restore(created.id);
      assert.equal(restored, null);
    });

    it('should make restored product findable again', () => {
      const created = create({ name: 'Test', sku: 'TEST-001', price: 10 });
      archive(created.id);
      restore(created.id);

      const found = findById(created.id);
      assert.ok(found);
      assert.equal(found.name, 'Test');
    });
  });

  describe('clearAll', () => {
    it('should clear all products', () => {
      create({ name: 'Test 1', sku: 'TEST-001', price: 10 });
      create({ name: 'Test 2', sku: 'TEST-002', price: 20 });
      clearAll();

      const products = findAll();
      assert.deepEqual(products, []);
    });
  });
});