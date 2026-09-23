import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateUser);

// Get all wellness check-ins
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wellness_checkins')
      .select('*, personnel(full_name, role)')
      .order('checkin_date', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/personnel/:personnelId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wellness_checkins')
      .select('*')
      .eq('personnel_id', req.params.personnelId)
      .order('checkin_date', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/station/:stationId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wellness_checkins')
      .select('*, personnel(full_name, role)')
      .eq('station_id', req.params.stationId)
      .order('checkin_date', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('💚 Wellness POST received:', req.body);
    
    // Get personnel_id from body or authenticated user
    const personnelId = req.body.personnel_id || req.personnel?.id;
    const stationId = req.body.station_id || req.personnel?.station_id;
    
    console.log('💚 Personnel ID:', personnelId, 'Type:', typeof personnelId);
    console.log('💚 Station ID:', stationId);
    
    if (!personnelId || !stationId) {
      return res.status(400).json({ error: 'Personnel ID and Station ID are required' });
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(personnelId)) {
      console.error('❌ Invalid UUID format for personnel_id:', personnelId);
      return res.status(400).json({ error: `Invalid personnel_id format: ${personnelId}` });
    }

    const checkinData = {
      personnel_id: personnelId,
      station_id: stationId,
      mood_score: req.body.mood_score,
      fatigue_level: req.body.fatigue_level,
      stress_level: req.body.stress_level,
      sleep_hours: req.body.sleep_hours,
      checkin_date: req.body.checkin_date || new Date().toISOString().split('T')[0],
      notes: req.body.notes || null,
      data_source: 'MANUAL_ENTRY'
    };

    console.log('💾 Saving wellness checkin:', checkinData);

    const insertResult = await supabase
      .from('wellness_checkins')
      .insert(checkinData)
      .select()
      .single();

    if (insertResult.error) {
      console.error('❌ Database error:', insertResult.error);
      throw insertResult.error;
    }

    const data = insertResult.data;
    console.log('✅ Wellness saved with ID:', data.id);

    // Check for concerning patterns and create alert if needed
    if (data.mood_score <= 4 || data.fatigue_level >= 8 || data.stress_level >= 8) {
      try {
        await supabase.from('alerts').insert({
          alert_type: 'WELLNESS_CONCERN',
          severity: 'MEDIUM',
          title: 'Personnel Wellness Alert',
          message: `Concerning wellness metrics reported`,
          station_id: stationId,
          related_entity_type: 'WELLNESS',
          related_entity_id: data.id,
          explanation: `Mood: ${data.mood_score}/10, Fatigue: ${data.fatigue_level}/10, Stress: ${data.stress_level}/10`,
          confidence_score: 100,
          data_source: 'MEASURED'
        });
      } catch (alertError) {
        console.warn('⚠️ Alert creation failed:', alertError.message);
      }
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Wellness creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
