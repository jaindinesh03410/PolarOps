import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/dashboard', async (req, res) => {
  try {
    const stationId = req.params.id;

    // Aggregate data for station dashboard
    const [station, personnel, inventory, alerts, recentSOS] = await Promise.all([
      supabase.from('stations').select('*').eq('id', stationId).single(),
      supabase.from('personnel').select('*').eq('station_id', stationId).eq('is_active', true),
      supabase.from('inventory_items').select('*').eq('station_id', stationId),
      supabase.from('alerts').select('*').eq('station_id', stationId).eq('is_read', false).order('created_at', { ascending: false }).limit(10),
      supabase.from('sos_events').select('*').eq('station_id', stationId).in('status', ['OPEN', 'ACKNOWLEDGED']).order('created_at', { ascending: false })
    ]);

    res.json({
      station: station.data,
      personnel: personnel.data || [],
      inventory: inventory.data || [],
      alerts: alerts.data || [],
      activeSOS: recentSOS.data || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
