import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

router.use(authenticateUser);

// Create new inventory item
router.post('/', async (req, res) => {
  try {
    const itemData = {
      ...req.body,
      last_resupply_date: req.body.last_resupply_date || new Date().toISOString().split('T')[0],
      data_source: req.body.data_source || 'MANUAL_ENTRY',
      confidence_score: req.body.confidence_score || 95.0
    };

    const { data, error } = await supabase
      .from('inventory_items')
      .insert(itemData)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/station/:stationId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, inventory_forecasts(*)')
      .eq('station_id', req.params.stationId)
      .order('category');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, inventory_forecasts(*), stations(*)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/forecast', async (req, res) => {
  try {
    const itemId = req.params.id;
    
    // Fetch inventory item
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    let forecast;
    let isMLServiceAvailable = false;

    // Try ML service first
    try {
      // Pull last 45 days + next 16 days of weather for this item's station.
      // Mapped to {ds, severity_score} shape that Prophet's regressor expects.
      // Degrades gracefully: if the query fails weather_history stays null and
      // forecast_depletion runs exactly as before (no regressor — strict opt-in).
      let weatherHistory = null;
      try {
        const severityScoreMap = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
        const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();

        const { data: weatherRows, error: weatherErr } = await supabase
          .from('weather_snapshots')
          .select('fetched_at, severity')
          .eq('station_id', item.station_id)
          .gte('fetched_at', fortyFiveDaysAgo)
          .order('fetched_at', { ascending: true });

        if (!weatherErr && weatherRows && weatherRows.length >= 2) {
          weatherHistory = weatherRows.map(row => ({
            ds:             row.fetched_at.split('T')[0], // date only (YYYY-MM-DD)
            severity_score: severityScoreMap[row.severity] ?? 0,
          }));
        }
      } catch (weatherQueryErr) {
        console.warn('⚠️  Weather history query failed — proceeding without regressor:', weatherQueryErr.message);
      }

      const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/predict/forecast`, {
        current_quantity: item.current_quantity,
        daily_consumption: item.daily_consumption_rate,
        item_name: item.item_name,
        historical_data: [],
        weather_history: weatherHistory,
      }, { timeout: 3000 });

      forecast = mlResponse.data;
      isMLServiceAvailable = true;
    } catch (mlError) {
      console.log('⚠️  ML service unavailable, using mock forecast');
      
      // Generate mock forecast using simple calculation
      const daysRemaining = item.daily_consumption_rate > 0 
        ? Math.ceil(item.current_quantity / item.daily_consumption_rate)
        : 30;
      
      const depletionDate = new Date();
      depletionDate.setDate(depletionDate.getDate() + daysRemaining);
      
      forecast = {
        predicted_date: depletionDate.toISOString().split('T')[0],
        confidence_band: {
          lower: Math.max(0, item.current_quantity * 0.85),
          upper: item.current_quantity * 1.15
        },
        confidence: 75,
        explanation: `Simple linear forecast: ${daysRemaining} days until depletion at current consumption rate (${item.daily_consumption_rate} ${item.unit}/day). ML service unavailable.`,
        model_version: 'MOCK_v1.0'
      };
    }

    // Convert date string to proper date format for PostgreSQL
    let depletionDate = forecast.predicted_date;
    if (typeof depletionDate === 'string') {
      depletionDate = depletionDate.split('T')[0];
    }

    // Store forecast result
    const { data: savedForecast, error: forecastError } = await supabase
      .from('inventory_forecasts')
      .insert({
        inventory_item_id: itemId,
        predicted_depletion_date: depletionDate,
        confidence_lower: forecast.confidence_band?.lower,
        confidence_upper: forecast.confidence_band?.upper,
        confidence_score: forecast.confidence,
        explanation: forecast.explanation,
        model_version: forecast.model_version,
        data_source: isMLServiceAvailable ? 'SIMULATED' : 'MANUAL_ENTRY'
      })
      .select()
      .single();

    if (forecastError) throw forecastError;

    res.json(savedForecast);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
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

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
