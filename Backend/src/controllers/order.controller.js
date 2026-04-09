const { asyncHandler } = require('../middleware/error.middleware');
const { supabase, supabaseAdmin } = require('../config/supabase');

exports.create = asyncHandler(async (req, res) => {
  const { items, billing_address_id } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'No items specified in the order' });
  
  let total = 0;
  items.forEach(i => total += (i.unit_price * i.quantity));

  // 1. Insert Order using Service Role explicitly to bypass RLS in the background.
  const { data: orderData, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert([{
      user_id: req.user.id,
      status: 'confirmed',
      subtotal: total.toFixed(2),
      tax_amount: (total * 0.18).toFixed(2),
      total_amount: (total * 1.18).toFixed(2),
      billing_address_id: billing_address_id || null
    }])
    .select()
    .single();

  if (orderError || !orderData) return res.status(500).json({ error: orderError?.message || 'Order failed' });

  // 2. Insert Order Items using Service Role
  const orderItems = items.map(item => ({
    order_id: orderData.id,
    product_id: item.product_id,
    product_name: item.product_name || 'Item',
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity
  }));

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems);
  if (itemsError) return res.status(500).json({ error: itemsError.message });

  // Attach items for frontend render bypass
  const fullOrder = { ...orderData, items: orderItems };
  res.status(201).json(fullOrder);
});

exports.getMyOrders = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

exports.getById = asyncHandler(async (req, res) => res.json({}));
exports.getAll = asyncHandler(async (req, res) => res.json({}));
exports.updateStatus = asyncHandler(async (req, res) => res.json({}));
exports.cancel = asyncHandler(async (req, res) => res.json({ message: 'Cancelled' }));
