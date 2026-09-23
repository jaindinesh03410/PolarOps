import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/', requireRole('HQ_ADMIN'), async (req, res) => {
  try {
    const { entityType, limit = 100 } = req.query;
    let query = supabase
      .from('audit_logs')
      .select('*, personnel(full_name, role)')
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/entity/:type/:id', requireRole('HQ_ADMIN'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, personnel(full_name, role)')
      .eq('entity_type', req.params.type)
      .eq('entity_id', req.params.id)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
