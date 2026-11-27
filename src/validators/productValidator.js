import { body, query, param, validationResult } from 'express-validator';

const VALID_CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'other'];
const VALID_STATUSES = ['active', 'inactive', 'discontinued'];

function formatErrors(errors) {
  return errors.array().map(err => err.msg).join('; ');
}

// Custom validator for required non-empty string
const requiredString = (fieldName) => body(fieldName)
  .custom(value => {
    if (value === undefined || value === null) {
      throw new Error(`${fieldName} is required and must be a non-empty string`);
    }
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${fieldName} is required and must be a non-empty string`);
    }
    return true;
  });

// Custom validator for optional non-empty string
const optionalString = (fieldName) => body(fieldName)
  .optional()
  .custom(value => {
    if (value !== undefined && (typeof value !== 'string' || value.trim() === '')) {
      throw new Error(`${fieldName} must be a non-empty string`);
    }
    return true;
  });

export function validateCreate() {
  return [
    requiredString('name'),
    requiredString('sku'),
    body('description')
      .optional()
      .isString()
      .withMessage('description must be a string'),
    body('category')
      .optional()
      .isIn(VALID_CATEGORIES)
      .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    body('price')
      .isFloat({ gt: 0 })
      .withMessage('price must be a positive number')
      .bail()
      .custom(value => {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          throw new Error('price must have at most 2 decimal places');
        }
        return true;
      }),
    body('stock')
      .isInt({ min: 0 })
      .withMessage('stock must be a non-negative integer'),
    body('status')
      .optional()
      .isIn(VALID_STATUSES)
      .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, data: null, error: formatErrors(errors) });
      }
      next();
    }
  ];
}

export function validateUpdate() {
  return [
    optionalString('name'),
    optionalString('sku'),
    body('description')
      .optional()
      .isString()
      .withMessage('description must be a string'),
    body('category')
      .optional()
      .isIn(VALID_CATEGORIES)
      .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    body('price')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('price must be a positive number')
      .bail()
      .custom(value => {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          throw new Error('price must have at most 2 decimal places');
        }
        return true;
      }),
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('stock must be a non-negative integer'),
    body('status')
      .optional()
      .isIn(VALID_STATUSES)
      .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, data: null, error: formatErrors(errors) });
      }
      next();
    }
  ];
}

export function validateFilters() {
  return [
    query('category')
      .optional()
      .isIn(VALID_CATEGORIES)
      .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    query('status')
      .optional()
      .isIn(VALID_STATUSES)
      .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    query('minPrice')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('minPrice must be a positive number'),
    query('maxPrice')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('maxPrice must be a positive number'),
    query('search')
      .optional()
      .isString()
      .withMessage('search must be a string'),
    query('inStock')
      .optional()
      .custom(value => {
        if (value !== undefined && value !== 'true' && value !== 'false') {
          throw new Error('inStock must be true or false');
        }
        return true;
      }),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, data: null, error: formatErrors(errors) });
      }
      next();
    }
  ];
}