const { asyncHandler } = require('../middleware/error.middleware');
const mockDb = require('../config/mockDb');

exports.getAddresses = asyncHandler(async (req, res) => {
  res.json(mockDb.billing_addresses.filter(a => a.user_id === req.user.id));
});

exports.addAddress = asyncHandler(async (req, res) => {
  const address = { id: Date.now().toString(), user_id: req.user.id, ...req.body };
  mockDb.billing_addresses.push(address);
  res.status(201).json(address);
});

exports.updateAddress = asyncHandler(async (req, res) => res.json({}));
exports.deleteAddress = asyncHandler(async (req, res) => res.json({ message: 'deleted' }));
exports.setDefault = asyncHandler(async (req, res) => res.json({}));
