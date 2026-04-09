const mockDb = require('./mockDb');

const supabase = {
  auth: {
    getUser: async (token) => {
      const user = mockDb.users.find(u => u.token === token);
      if (user) return { data: { user } };
      return { data: { user: null }, error: new Error('Invalid mock token') };
    }
  }
};

const supabaseAdmin = {}; // Mocked in controllers explicitly to bypass

module.exports = { supabase, supabaseAdmin };
