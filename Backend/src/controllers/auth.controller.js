const { asyncHandler } = require('../middleware/error.middleware');
const mockDb = require('../config/mockDb');

exports.register = asyncHandler(async (req, res) => {
  const { email, password, full_name, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  
  const id = Date.now().toString();
  const token = 'mock-token-' + id;
  
  const user = { id, email, token };
  mockDb.users.push(user);
  mockDb.profiles.push({ id, email, full_name, phone });
  
  res.status(201).json({ message: 'Registration successful via Mock.', user: { id, email } });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  
  let user = mockDb.users.find(u => u.email === email);
  if (!user) {
    // dynamically create if missing for mock simplicity
    user = { id: Date.now().toString(), email, token: 'mock-token-' + Date.now() };
    mockDb.users.push(user);
    mockDb.profiles.push({ id: user.id, email, full_name: email.split('@')[0] });
  }
  
  const profile = mockDb.profiles.find(p => p.id === user.id) || {};
  
  res.json({ token: user.token, refresh_token: 'mock-refresh', user: { ...user, profile } });
});

exports.logout = asyncHandler(async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

exports.getProfile = asyncHandler(async (req, res) => {
  const profile = mockDb.profiles.find(p => p.id === req.user.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

// Stubs for remaining functions
exports.updateProfile = asyncHandler(async (req,res) => res.json({}));
exports.forgotPassword = asyncHandler(async (req,res) => res.json({ message: 'Mock link sent' }));
exports.resetPassword = asyncHandler(async (req,res) => res.json({ message: 'Mock reset done' }));
exports.changePassword = asyncHandler(async (req,res) => res.json({ message: 'Mock changed' }));
