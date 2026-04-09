const { supabase } = require('../config/supabase');

/**
 * Validates the Bearer token sent by the client (issued by Supabase Auth).
 * Attaches req.user on success.
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Only allows users with role = 'admin' (set in user_metadata or app_metadata).
 * Must be used AFTER authenticateUser.
 */
const requireAdmin = (req, res, next) => {
  const role = req.user?.app_metadata?.role || req.user?.user_metadata?.role;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticateUser, requireAdmin };
