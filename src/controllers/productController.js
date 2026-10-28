import { ProductModel } from '../models/product.js';

export const productController = {
  getAllProducts: (req, res, next) => {
    try {
      const products = ProductModel.findAll(req.query);
      res.json({
        success: true,
        data: products,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  },

  getProductById: (req, res, next) => {
    try {
      const product = ProductModel.findById(req.params.id);
      if (!product) {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Product not found',
        });
      }
      res.json({
        success: true,
        data: product,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  },

  createProduct: (req, res, next) => {
    try {
      const product = ProductModel.create(req.body);
      res.status(201).json({
        success: true,
        data: product,
        error: null,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        data: null,
        error: error.message,
      });
    }
  },

  updateProduct: (req, res, next) => {
    try {
      const product = ProductModel.update(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Product not found',
        });
      }
      res.json({
        success: true,
        data: product,
        error: null,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        data: null,
        error: error.message,
      });
    }
  },

  deleteProduct: (req, res, next) => {
    try {
      const deleted = ProductModel.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Product not found',
        });
      }
      res.json({
        success: true,
        data: null,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  },
};
