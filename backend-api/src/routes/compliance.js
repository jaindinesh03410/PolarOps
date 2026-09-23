import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/', requireRole('HQ_ADMIN', 'STATION_COMMANDER'), async (req, res) => {
  try {
    const { resolved } = req.query;
    let query = supabase
      .from('compliance_flags')
      .select('*')
      .order('created_at', { ascending: false });

    if (resolved !== undefined) {
      query = query.is('resolved_at', resolved === 'false' ? null : 'not.null');
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/resolve', requireRole('HQ_ADMIN'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('compliance_flags')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: req.personnel.id,
        resolution_notes: req.body.notes
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
