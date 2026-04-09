const { asyncHandler } = require('../middleware/error.middleware');
const mockDb = require('../config/mockDb');

exports.create = asyncHandler(async (req, res) => {
  const { items, billing_address_id } = req.body;
  
  if (!items || items.length === 0) return res.status(400).json({ error: 'No items specified in the order' });
  
  // Calculate a fake total based on items in mockDb
  let total = 0;
  const enrichedItems = items.map(item => {
    const product = mockDb.products.find(p => p.id === item.product_id) || { name: 'Unknown', price: 999 };
    const cost = product.price * item.quantity;
    total += cost;
    return { ...item, product_name: product.name, unit_price: product.price, total_price: cost };
  });

  const order = {
    id: 'ORD' + Date.now().toString(),
    user_id: req.user.id,
    status: 'confirmed',
    items: enrichedItems,
    billing_address_id,
    subtotal: total, tax_amount: Math.round(total * 0.18), shipping_amount: 0, total_amount: Math.round(total * 1.18),
    created_at: new Date().toISOString()
  };
  
  mockDb.orders.push(order);
  
  // Note: Email sending logic completely removed as per request
  
  res.status(201).json(order);
});

exports.getMyOrders = asyncHandler(async (req, res) => {
  res.json({ data: mockDb.orders.filter(o => o.user_id === req.user.id) });
});

exports.getById = asyncHandler(async (req, res) => res.json({}));
exports.getAll = asyncHandler(async (req, res) => res.json({}));
exports.updateStatus = asyncHandler(async (req, res) => res.json({}));
exports.cancel = asyncHandler(async (req, res) => res.json({ message: 'Cancelled' }));
