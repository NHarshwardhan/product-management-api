import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  create,
  findAll,
  findById,
  findBySku,
  update,
  archive,
  restore,
  clearAll,
} from './product.js';

describe('Product Model', () => {
  beforeEach(() => {
    clearAll();
  });

  afterEach(() => {
    clearAll();
  });

  describe('create', () => {
    it('should create a product with all required fields', () => {
      const product = create({
        name: 'Test Product',
        sku: 'TEST-001',
        category: 'electronics',
        price: 99.99,
        stock: 10,
      });

      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.name).toBe('Test Product');
      expect(product.sku).toBe('TEST-001');
      expect(product.category).toBe('electronics');
      expect(product.price).toBe(99.99);
      expect(product.stock).toBe(10);
      expect(product.status).toBe('active');
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.archivedAt).toBeNull();
    });

    it('should create a product with optional fields', () => {
      const product = create({
        name: 'Test Product',
        sku: 'TEST-002',
        description: 'A test product',
        category: 'books',
        price: 29.99,
        stock: 5,
        status: 'inactive',
      });

      expect(product.description).toBe('A test product');
      expect(product.status).toBe('inactive');
    });

    it('should default category to "other" if not provided', () => {
      const product = create({
        name: 'Test Product',
        sku: 'TEST-003',
        price: 10,
        stock: 1,
      });

      expect(product.category).toBe('other');
    });

    it('should default status to "active" if not provided', () => {
      const product = create({
        name: 'Test Product',
        sku: 'TEST-004',
        price: 10,
        stock: 1,
      });

      expect(product.status).toBe('active');
    });

    it('should trim whitespace from name, sku, and description', () => {
      const product = create({
        name: '  Test Product  ',
        sku: '  TEST-005  ',
        description: '  Description  ',
        price: 10,
        stock: 1,
      });

      expect(product.name).toBe('Test Product');
      expect(product.sku).toBe('TEST-005');
      expect(product.description).toBe('Description');
    });

    it('should accept and store price with 2 decimal places', () => {
      const product = create({
        name: 'Test Product',
        sku: 'TEST-006',
        price: 99.99,
        stock: 1,
      });

      expect(product.price).toBe(99.99);
    });

    it('should handle floating point precision correctly', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      const product = create({
        name: 'Test Product',
        sku: 'TEST-007',
        price: 0.1 + 0.2,
        stock: 1,
      });

      // Model rounds to 2 decimal places, fixing floating point issues
      expect(product.price).toBe(0.3);
    });

    it('should throw error for missing name', () => {
      expect(() => create({ sku: 'TEST-007', price: 10, stock: 1 })).toThrow(
        'name is required and must be a non-empty string',
      );
    });

    it('should throw error for missing sku', () => {
      expect(() => create({ name: 'Test', price: 10, stock: 1 })).toThrow(
        'sku is required and must be a non-empty string',
      );
    });

    it('should throw error for invalid category', () => {
      expect(() =>
        create({ name: 'Test', sku: 'TEST-008', category: 'invalid', price: 10, stock: 1 }),
      ).toThrow('category must be one of: electronics, clothing, food, books, other');
    });

    it('should throw error for invalid status', () => {
      expect(() =>
        create({ name: 'Test', sku: 'TEST-009', price: 10, stock: 1, status: 'invalid' }),
      ).toThrow('status must be one of: active, inactive, discontinued');
    });

    it('should throw error for non-positive price', () => {
      expect(() =>
        create({ name: 'Test', sku: 'TEST-010', price: 0, stock: 1 }),
      ).toThrow('price must be a positive number');
    });

    it('should throw error for negative price', () => {
      expect(() =>
        create({ name: 'Test', sku: 'TEST-011', price: -5, stock: 1 }),
      ).toThrow('price must be a positive number');
    });

    it('should throw error for negative stock', () => {
      expect(() =>
        create({ name: 'Test', sku: 'TEST-012', price: 10, stock: -1 }),
      ).toThrow('stock must be a non-negative integer');
    });

    it('should throw error for non-integer stock', () => {
      expect(() =>
        create({ name: 'Test', sku: 'TEST-013', price: 10, stock: 1.5 }),
      ).toThrow('stock must be a non-negative integer');
    });

    it('should throw error for duplicate SKU', () => {
      create({ name: 'Test', sku: 'TEST-014', price: 10, stock: 1 });
      expect(() => create({ name: 'Test 2', sku: 'TEST-014', price: 20, stock: 2 })).toThrow(
        'SKU must be unique',
      );
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      create({ name: 'Product A', sku: 'A-001', category: 'electronics', price: 100, stock: 5 });
      create({ name: 'Product B', sku: 'B-002', category: 'clothing', price: 50, stock: 0 });
      create({ name: 'Product C', sku: 'C-003', category: 'electronics', price: 200, stock: 10 });
    });

    it('should return all non-archived products', () => {
      const products = findAll();
      expect(products).toHaveLength(3);
    });

    it('should filter by category', () => {
      const products = findAll({ category: 'electronics' });
      expect(products).toHaveLength(2);
      expect(products.every((p) => p.category === 'electronics')).toBe(true);
    });

    it('should filter by status', () => {
      const products = findAll({ status: 'active' });
      expect(products).toHaveLength(3);
    });

    it('should filter by minPrice', () => {
      const products = findAll({ minPrice: 150 });
      expect(products).toHaveLength(1);
      expect(products[0].price).toBeGreaterThanOrEqual(150);
    });

    it('should filter by maxPrice', () => {
      const products = findAll({ maxPrice: 75 });
      expect(products).toHaveLength(1);
      expect(products[0].price).toBeLessThanOrEqual(75);
    });

    it('should filter by search term in name', () => {
      const products = findAll({ search: 'Product A' });
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Product A');
    });

    it('should filter by search term in sku', () => {
      const products = findAll({ search: 'B-002' });
      expect(products).toHaveLength(1);
      expect(products[0].sku).toBe('B-002');
    });

    it('should filter inStock=true', () => {
      const products = findAll({ inStock: true });
      expect(products).toHaveLength(2);
      expect(products.every((p) => p.stock > 0)).toBe(true);
    });

    it('should filter inStock=false', () => {
      const products = findAll({ inStock: false });
      expect(products).toHaveLength(1);
      expect(products[0].stock).toBe(0);
    });

    it('should sort by createdAt descending', () => {
      const products = findAll();
      expect(products[0].createdAt >= products[1].createdAt).toBe(true);
      expect(products[1].createdAt >= products[2].createdAt).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return product by id', () => {
      const created = create({ name: 'Test', sku: 'TEST-015', price: 10, stock: 1 });
      const found = findById(created.id);
      expect(found).toEqual(created);
    });

    it('should return null for non-existent id', () => {
      const found = findById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should return null for archived product', () => {
      const created = create({ name: 'Test', sku: 'TEST-016', price: 10, stock: 1 });
      archive(created.id);
      const found = findById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('findBySku', () => {
    it('should return product by sku', () => {
      const created = create({ name: 'Test', sku: 'TEST-017', price: 10, stock: 1 });
      const found = findBySku('TEST-017');
      expect(found).toEqual(created);
    });

    it('should return null for non-existent sku', () => {
      const found = findBySku('NON-EXISTENT');
      expect(found).toBeNull();
    });

    it('should return null for archived product', () => {
      const created = create({ name: 'Test', sku: 'TEST-018', price: 10, stock: 1 });
      archive(created.id);
      const found = findBySku('TEST-018');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update product fields', () => {
      const created = create({ name: 'Test', sku: 'TEST-019', price: 10, stock: 1 });
      const updated = update(created.id, { name: 'Updated', price: 20 });

      expect(updated.name).toBe('Updated');
      expect(updated.price).toBe(20);
      expect(updated.sku).toBe('TEST-019');
    });

    it('should return null for non-existent id', () => {
      const updated = update('non-existent', { name: 'Updated' });
      expect(updated).toBeNull();
    });

    it('should return null for archived product', () => {
      const created = create({ name: 'Test', sku: 'TEST-020', price: 10, stock: 1 });
      archive(created.id);
      const updated = update(created.id, { name: 'Updated' });
      expect(updated).toBeNull();
    });

    it('should throw error for duplicate sku', () => {
      create({ name: 'Test 1', sku: 'TEST-021', price: 10, stock: 1 });
      const created = create({ name: 'Test 2', sku: 'TEST-022', price: 20, stock: 2 });
      expect(() => update(created.id, { sku: 'TEST-021' })).toThrow('SKU must be unique');
    });

    it('should throw error for invalid category', () => {
      const created = create({ name: 'Test', sku: 'TEST-023', price: 10, stock: 1 });
      expect(() => update(created.id, { category: 'invalid' })).toThrow(
        'category must be one of: electronics, clothing, food, books, other',
      );
    });

    it('should validate price decimal places', () => {
      const created = create({ name: 'Test', sku: 'TEST-024', price: 10, stock: 1 });
      expect(() => update(created.id, { price: 99.999 })).toThrow(
        'price must have at most 2 decimal places',
      );
    });
  });

  describe('archive', () => {
    it('should archive a product', () => {
      const created = create({ name: 'Test', sku: 'TEST-025', price: 10, stock: 1 });
      const archived = archive(created.id);

      expect(archived).toBe(true);
      expect(findById(created.id)).toBeNull();
    });

    it('should return false for non-existent id', () => {
      const archived = archive('non-existent');
      expect(archived).toBe(false);
    });

    it('should return false for already archived product', () => {
      const created = create({ name: 'Test', sku: 'TEST-026', price: 10, stock: 1 });
      archive(created.id);
      const archived = archive(created.id);
      expect(archived).toBe(false);
    });
  });

  describe('restore', () => {
    it('should restore an archived product', () => {
      const created = create({ name: 'Test', sku: 'TEST-027', price: 10, stock: 1 });
      archive(created.id);
      const restored = restore(created.id);

      expect(restored).toEqual(created);
      expect(findById(created.id)).toEqual(created);
    });

    it('should return null for non-existent id', () => {
      const restored = restore('non-existent');
      expect(restored).toBeNull();
    });

    it('should return null for non-archived product', () => {
      const created = create({ name: 'Test', sku: 'TEST-028', price: 10, stock: 1 });
      const restored = restore(created.id);
      expect(restored).toBeNull();
    });
  });
});