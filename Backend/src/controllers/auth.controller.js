const { asyncHandler } = require('../middleware/error.middleware');
const { supabase } = require('../config/supabase');

exports.register = asyncHandler(async (req, res) => {
  const { email, password, full_name, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone }
    }
  });

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ message: 'Registration successful', user: data.user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
  
  // Fetch profile hook
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
  
  res.json({ token: data.session.access_token, refresh_token: data.session.refresh_token, user: { ...data.user, profile } });
});

exports.logout = asyncHandler(async (req, res) => {
  await supabase.auth.signOut();
  res.json({ message: 'Logged out successfully' });
});

exports.getProfile = asyncHandler(async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error || !profile) {
    // If the database trigger failed to make a Profile, gracefully fallback to base auth object so they don't get logged out
    return res.json({ user: { id: req.user.id, email: req.user.email, full_name: 'Nexus Shopper' } });
  }
  
  res.json({ user: profile });
});

// Stubs for remaining functions
exports.updateProfile = asyncHandler(async (req,res) => res.json({}));
exports.forgotPassword = asyncHandler(async (req,res) => res.json({ message: 'Mock link sent' }));
exports.resetPassword = asyncHandler(async (req,res) => res.json({ message: 'Mock reset done' }));
exports.changePassword = asyncHandler(async (req,res) => res.json({ message: 'Mock changed' }));
