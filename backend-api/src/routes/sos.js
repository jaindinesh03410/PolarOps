import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

router.use(authenticateUser);

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('sos_events')
      .select('*, personnel(*), stations(*)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { message, latitude, longitude, severity, personnel_id, station_id } = req.body;

    console.log('📥 SOS Request received:', { message, personnel_id: personnel_id || req.personnel?.id, station_id: station_id || req.personnel?.station_id });

    // Use provided IDs or fall back to authenticated personnel
    const finalPersonnelId = personnel_id || req.personnel?.id;
    const finalStationId = station_id || req.personnel?.station_id;

    if (!finalPersonnelId || !finalStationId) {
      return res.status(400).json({ error: 'Personnel ID and Station ID are required' });
    }

    // Call ML service for NLP triage if message provided
    let triageResult = null;
    if (message) {
      try {
        const mlResponse = await axios.post(
          `${process.env.ML_SERVICE_URL}/predict/triage`,
          { message },
          { timeout: 3000 }
        );
        triageResult = mlResponse.data;
        console.log('✅ ML triage successful:', triageResult.predicted_category);
      } catch (mlError) {
        console.warn('⚠️ ML triage failed, using defaults:', mlError.message);
        // Use basic categorization
        triageResult = {
          predicted_severity: 'MEDIUM',
          predicted_category: 'OTHER',
          confidence: 50,
          explanation: 'ML service unavailable, manual categorization applied'
        };
      }
    }

    // Generate event code
    const eventCode = `SOS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Prepare SOS data
    const sosData = {
      event_code: eventCode,
      personnel_id: finalPersonnelId,
      station_id: finalStationId,
      message: message || 'Emergency - No details provided',
      latitude: latitude || null,
      longitude: longitude || null,
      severity: severity || triageResult?.predicted_severity || 'MEDIUM',
      category: triageResult?.predicted_category || 'OTHER',
      triage_result: triageResult,
      status: 'OPEN',
      data_source: 'MEASURED'
    };

    console.log('💾 Saving SOS event:', sosData);

    // Insert SOS event
    const insertResult = await supabase
      .from('sos_events')
      .insert(sosData)
      .select()
      .single();

    if (insertResult.error) {
      console.error('❌ Database error:', insertResult.error);
      throw insertResult.error;
    }

    const data = insertResult.data;
    console.log('✅ SOS saved with ID:', data.id);

    // Update location separately using PostGIS if coordinates provided
    if (latitude && longitude) {
      try {
        await supabase.rpc('update_sos_location', {
          sos_id: data.id,
          lat: latitude,
          lng: longitude
        });
      } catch (locError) {
        console.warn('⚠️ Location update failed:', locError.message);
      }
    }

    // Create alert
    try {
      await supabase.from('alerts').insert({
        alert_type: 'SOS_TRIGGERED',
        severity: data.severity,
        title: `SOS: ${eventCode}`,
        message: `Emergency reported: ${message || 'No details'}`,
        station_id: data.station_id,
        related_entity_type: 'SOS',
        related_entity_id: data.id,
        explanation: triageResult?.explanation || 'Manual SOS trigger',
        confidence_score: triageResult?.confidence || 100,
        data_source: 'MEASURED'
      });
    } catch (alertError) {
      console.warn('⚠️ Alert creation failed:', alertError.message);
    }

    console.log('✅ SOS complete - Event:', eventCode);

    res.json(data);
  } catch (error) {
    console.error('❌ SOS creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/acknowledge', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sos_events')
      .update({
        status: 'ACKNOWLEDGED',
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

router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sos_events')
      .update(req.body)
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
