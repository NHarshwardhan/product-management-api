import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import * as productModel from '../src/models/product.js';

describe('productModel', () => {
  beforeEach(() => {
    productModel.clearAll();
  });

  describe('create()', () => {
    it('returns a product with all required fields including a uuid id', () => {
      const p = productModel.create({
        name: 'Test Product',
        sku: 'TP-001',
        category: 'other',
        price: 9.99,
        stock: 10
      });
      expect(p).to.have.property('id');
      expect(p.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(p.name).to.equal('Test Product');
      expect(p.sku).to.equal('TP-001');
      expect(p.category).to.equal('other');
      expect(p.price).to.equal(9.99);
      expect(p.stock).to.equal(10);
      expect(p.description).to.equal('');
    });

    it('sets status to "active" and archivedAt to null by default', () => {
      const p = productModel.create({
        name: 'Test Product',
        sku: 'TP-001',
        category: 'other',
        price: 9.99,
        stock: 10
      });
      expect(p.status).to.equal('active');
      expect(p.archivedAt).to.be.null;
    });

    it('throws if name is missing', () => {
      expect(() => productModel.create({
        sku: 'TP-001',
        category: 'other',
        price: 9.99,
        stock: 10
      })).to.throw('name is required');
    });

    it('throws if sku is missing', () => {
      expect(() => productModel.create({
        name: 'Test Product',
        category: 'other',
        price: 9.99,
        stock: 10
      })).to.throw('sku is required');
    });

    it('throws if price is zero or negative', () => {
      expect(() => productModel.create({
        name: 'Test Product',
        sku: 'TP-001',
        category: 'other',
        price: 0,
        stock: 10
      })).to.throw('price must be a positive number');
      expect(() => productModel.create({
        name: 'Test Product',
        sku: 'TP-002',
        category: 'other',
        price: -5,
        stock: 10
      })).to.throw('price must be a positive number');
    });

    it('accepts stock = 0 (out of stock is valid)', () => {
      const p = productModel.create({
        name: 'Test Product',
        sku: 'TP-001',
        category: 'other',
        price: 9.99,
        stock: 0
      });
      expect(p.stock).to.equal(0);
      expect(p.status).to.equal('active');
    });

    it('throws if a product with the same sku already exists', () => {
      productModel.create({
        name: 'Test Product',
        sku: 'TP-001',
        category: 'other',
        price: 9.99,
        stock: 10
      });
      expect(() => productModel.create({
        name: 'Another Product',
        sku: 'TP-001',
        category: 'other',
        price: 19.99,
        stock: 5
      })).to.throw('SKU must be unique');
    });
  });

  describe('findAll({})', () => {
    it('returns all non-archived products', () => {
      productModel.create({ name: 'A', sku: 'A-001', price: 10, stock: 1 });
      productModel.create({ name: 'B', sku: 'B-001', price: 20, stock: 2 });
      const p3 = productModel.create({ name: 'C', sku: 'C-001', price: 30, stock: 3 });
      productModel.archive(p3.id);

      const all = productModel.findAll({});
      expect(all).to.have.length(2);
      expect(all.every(p => !p.archivedAt)).to.be.true;
    });

    it('returns empty array when the store is empty', () => {
      const all = productModel.findAll({});
      expect(all).to.deep.equal([]);
    });
  });

  describe('findAll({ category })', () => {
    it('returns only products matching the category', () => {
      productModel.create({ name: 'Electronics', sku: 'E-001', category: 'electronics', price: 10, stock: 1 });
      productModel.create({ name: 'Clothing', sku: 'C-001', category: 'clothing', price: 20, stock: 2 });
      productModel.create({ name: 'Another Electronic', sku: 'E-002', category: 'electronics', price: 30, stock: 3 });

      const electronics = productModel.findAll({ category: 'electronics' });
      expect(electronics).to.have.length(2);
      expect(electronics.every(p => p.category === 'electronics')).to.be.true;
    });

    it('unknown category returns empty array (no enum validation at model level)', () => {
      productModel.create({ name: 'Test', sku: 'T-001', category: 'electronics', price: 10, stock: 1 });
      const results = productModel.findAll({ category: 'unknown' });
      expect(results).to.have.length(0);
    });
  });

  describe('findAll({ minPrice, maxPrice })', () => {
    it('returns products with price within the range (inclusive)', () => {
      productModel.create({ name: 'Cheap', sku: 'C-001', price: 5, stock: 1 });
      productModel.create({ name: 'Mid', sku: 'M-001', price: 50, stock: 1 });
      productModel.create({ name: 'Expensive', sku: 'E-001', price: 200, stock: 1 });

      const mid = productModel.findAll({ minPrice: 10, maxPrice: 100 });
      expect(mid).to.have.length(1);
      expect(mid[0].name).to.equal('Mid');
      expect(mid[0].price).to.be.within(10, 100);
    });

    it('non-numeric minPrice/maxPrice (NaN) - comparisons with NaN always false, so filter passes', () => {
      productModel.create({ name: 'Test', sku: 'T-001', price: 50, stock: 1 });
      // In JS: 50 < NaN is false, 50 > NaN is false, so product passes both checks
      // This is the actual behavior - validator at API level should reject non-numeric
      const results = productModel.findAll({ minPrice: NaN, maxPrice: NaN });
      expect(results).to.have.length(1);
    });
  });

  describe('findAll({ inStock: "true" })', () => {
    it('returns only products with stock > 0', () => {
      productModel.create({ name: 'In Stock', sku: 'IS-001', price: 10, stock: 5 });
      productModel.create({ name: 'Out of Stock', sku: 'OS-001', price: 10, stock: 0 });

      const inStock = productModel.findAll({ inStock: 'true' });
      expect(inStock).to.have.length(1);
      expect(inStock[0].name).to.equal('In Stock');
      expect(inStock[0].stock).to.be.greaterThan(0);
    });
  });

  describe('findAll({ search: "wireless" })', () => {
    it('returns products whose name or description contains the term', () => {
      productModel.create({ name: 'Wireless Headphones', sku: 'WH-001', price: 99, stock: 1 });
      productModel.create({ name: 'Wired Keyboard', sku: 'WK-001', description: 'No wireless here', price: 50, stock: 1 });
      productModel.create({ name: 'Bluetooth Speaker', sku: 'BS-001', price: 80, stock: 1 });

      const results = productModel.findAll({ search: 'wireless' });
      expect(results).to.have.length(2);
      expect(results.some(p => p.name.toLowerCase().includes('wireless'))).to.be.true;
      expect(results.some(p => p.description.toLowerCase().includes('wireless'))).to.be.true;
    });
  });

  describe('findById(id)', () => {
    it('returns the correct product', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      const found = productModel.findById(created.id);
      expect(found).to.deep.equal(created);
    });

    it('returns null for unknown id', () => {
      const found = productModel.findById('non-existent-id');
      expect(found).to.be.null;
    });

    it('returns null for an archived product id', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      productModel.archive(created.id);
      const found = productModel.findById(created.id);
      expect(found).to.be.null;
    });
  });

  describe('findBySku(sku)', () => {
    it('returns the correct product', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      const found = productModel.findBySku('T-001');
      expect(found).to.deep.equal(created);
    });

    it('returns null for unknown sku', () => {
      const found = productModel.findBySku('NONEXISTENT');
      expect(found).to.be.null;
    });
  });

  describe('update(id, patch)', () => {
    it('updates only the provided fields', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      const updated = productModel.update(created.id, { name: 'Updated', price: 20 });
      expect(updated.name).to.equal('Updated');
      expect(updated.price).to.equal(20);
      expect(updated.sku).to.equal('T-001'); // unchanged
      expect(updated.stock).to.equal(1); // unchanged
    });

    it('does not allow overwriting id or createdAt', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      const originalId = created.id;
      const originalCreatedAt = created.createdAt;
      const updated = productModel.update(created.id, { id: 'hacked-id', createdAt: new Date('2000-01-01') });
      expect(updated.id).to.equal(originalId);
      expect(updated.createdAt.toISOString()).to.equal(originalCreatedAt.toISOString());
    });

    it('strips unknown fields from patch', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      const updated = productModel.update(created.id, { name: 'Updated', unknownField: 'should be ignored', another: 123 });
      expect(updated.name).to.equal('Updated');
      expect(updated).to.not.have.property('unknownField');
      expect(updated).to.not.have.property('another');
    });

    it('returns null when updating an archived product', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      productModel.archive(created.id);
      const updated = productModel.update(created.id, { name: 'Updated' });
      expect(updated).to.be.null;
    });
  });

  describe('delete(id)', () => {
    it('sets archivedAt (soft archive, record is kept)', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      const result = productModel.archive(created.id);
      expect(result).to.be.true;
      // Verify archivedAt is set by restoring
      const restored = productModel.restore(created.id);
      expect(restored.archivedAt).to.be.null;
    });

    it('archived product excluded from findAll()', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      productModel.archive(created.id);
      const all = productModel.findAll({});
      expect(all).to.have.length(0);
    });
  });

  describe('restore(id)', () => {
    it('clears archivedAt', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      productModel.archive(created.id);
      const restored = productModel.restore(created.id);
      expect(restored.archivedAt).to.be.null;
    });

    it('restored product reappears in findAll()', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      productModel.archive(created.id);
      productModel.restore(created.id);
      const all = productModel.findAll({});
      expect(all).to.have.length(1);
      expect(all[0].id).to.equal(created.id);
    });

    it('returns null when restoring a product that was never archived', () => {
      const created = productModel.create({ name: 'Test', sku: 'T-001', price: 10, stock: 1 });
      const result = productModel.restore(created.id);
      expect(result).to.be.null;
    });
  });
});