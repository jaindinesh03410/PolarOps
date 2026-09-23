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
      .from('hazards')
      .select('*')
      .order('detected_at', { ascending: false });

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

router.post('/detect', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    // Call ML service for YOLOv8 detection
    const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/predict/hazard-detect`, {
      image_url: imageUrl
    });

    const detections = mlResponse.data.detections || [];

    // Save detected hazards to database
    const savedHazards = [];
    for (const detection of detections) {
      const { data, error } = await supabase
        .from('hazards')
        .insert({
          hazard_type: detection.type,
          latitude: detection.latitude,
          longitude: detection.longitude,
          location: `POINT(${detection.longitude} ${detection.latitude})`,
          bounding_box: detection.bounding_box,
          severity: detection.severity,
          detection_method: 'YOLOV8',
          source_image_url: imageUrl,
          detection_confidence: detection.confidence,
          reported_by: req.personnel.id,
          data_source: 'MEASURED',
          confidence_score: detection.confidence
        })
        .select()
        .single();

      if (!error) savedHazards.push(data);
    }

    res.json({
      count: savedHazards.length,
      hazards: savedHazards,
      explanation: mlResponse.data.explanation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const hazardData = {
      ...req.body,
      reported_by: req.personnel.id,
      detection_method: 'MANUAL'
    };

    const { data, error } = await supabase
      .from('hazards')
      .insert(hazardData)
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
      .from('hazards')
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
