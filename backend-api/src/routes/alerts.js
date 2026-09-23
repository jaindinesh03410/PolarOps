import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/', async (req, res) => {
  try {
    const { severity, type, isRead } = req.query;
    let query = supabase
      .from('alerts')
      .select('*, stations(name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (severity) query = query.eq('severity', severity);
    if (type) query = query.eq('alert_type', type);
    if (isRead !== undefined) query = query.eq('is_read', isRead === 'true');

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/acknowledge', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({
        is_read: true,
        acknowledged_by: req.personnel.id,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
