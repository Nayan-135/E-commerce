const { asyncHandler } = require('../middleware/error.middleware');
const mockDb = require('../config/mockDb');

exports.getAll = asyncHandler(async (req, res) => {
  res.json({ products: mockDb.products });
});

exports.getById = asyncHandler(async (req, res) => {
  const product = mockDb.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

exports.search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  res.json({ products: mockDb.products.filter(p => (p.name||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q)) });
});

exports.getCategories = asyncHandler(async (req, res) => {
  res.json({ categories: [{ id: 1, name: 'Electronics' }, { id: 2, name: 'Accessories' }] });
});

// stubs for admin
exports.create = asyncHandler(async (req, res) => res.json({}));
exports.update = asyncHandler(async (req, res) => res.json({}));
exports.remove = asyncHandler(async (req, res) => res.json({ message: 'removed' }));
