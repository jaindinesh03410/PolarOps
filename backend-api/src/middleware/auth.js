import { supabase } from '../config/supabase.js';

// DEMO MODE - Bypass authentication
const DEMO_MODE = true;

export const authenticateUser = async (req, res, next) => {
  // DEMO MODE: Skip auth and set mock user with valid UUIDs
  if (DEMO_MODE) {
    req.user = { id: 'demo-user', email: 'demo@maitri.ant' };
    req.personnel = {
      id: 'b0000000-0000-0000-0000-000000000001', // Valid UUID for demo
      role: 'HQ_ADMIN', // Give all access in demo mode
      station_id: 'a0000000-0000-0000-0000-000000000001'
    };
    return next();
  }
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch personnel record for role information
    const { data: personnel, error: personnelError } = await supabase
      .from('personnel')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (personnelError || !personnel) {
      return res.status(403).json({ error: 'User not associated with personnel record' });
    }

    req.user = user;
    req.personnel = personnel;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // DEMO MODE: Skip role check
    if (DEMO_MODE) {
      return next();
    }
    
    if (!req.personnel || !allowedRoles.includes(req.personnel.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.personnel?.role 
      });
    }
    next();
  };
};
