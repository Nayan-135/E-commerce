const { asyncHandler } = require('../middleware/error.middleware');
const { supabase } = require('../config/supabase');

exports.getAll = asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data });
});

exports.getById = asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('products').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Product not found' });
  res.json(data);
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
