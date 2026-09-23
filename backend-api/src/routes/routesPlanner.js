import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

router.use(authenticateUser);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/compute', async (req, res) => {
  try {
    const { start, end, avoidHazards = true } = req.body;

    console.log('🗺️ Route computation request:', { start, end, avoidHazards });

    // Fetch active hazards if needed
    let hazards = [];
    if (avoidHazards) {
      const { data: hazardData } = await supabase
        .from('hazards')
        .select('*')
        .eq('status', 'ACTIVE');
      hazards = hazardData || [];
      console.log(`📍 Found ${hazards.length} active hazards`);
    }

    // Fetch HIGH/CRITICAL weather snapshots from the last 6 hours.
    // These are passed as weather_cells to the A* router so storm corridors
    // inflate path cost the same way hazard cells do.
    // Degrades gracefully: if the query fails, weather_cells stays [] and the
    // route is computed exactly as before.
    let weatherCells = [];
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data: weatherData, error: weatherError } = await supabase
        .from('weather_snapshots')
        .select('latitude, longitude, severity, condition, wind_speed_kmh, visibility_km')
        .in('severity', ['HIGH', 'CRITICAL'])
        .gte('fetched_at', sixHoursAgo);

      if (!weatherError && weatherData) {
        weatherCells = weatherData.map(w => ({
          lat:          w.latitude,
          lng:          w.longitude,
          severity:     w.severity,
          type:         'WEATHER',
          condition:    w.condition,
          wind_speed_kmh: w.wind_speed_kmh,
          visibility_km:  w.visibility_km,
        }));
        console.log(`🌦️  Found ${weatherCells.length} HIGH/CRITICAL weather cell(s) in last 6h`);
      }
    } catch (weatherQueryError) {
      console.warn('⚠️  Weather snapshot query failed — proceeding without weather cells:', weatherQueryError.message);
    }

    let routeResult;
    
    // Try ML service with timeout
    try {
      console.log('🤖 Calling ML service at:', process.env.ML_SERVICE_URL);
      const mlResponse = await axios.post(
        `${process.env.ML_SERVICE_URL}/predict/route`,
        {
          start: start,
          end: end,
          hazards: hazards.map(h => ({
            lat: h.latitude,
            lng: h.longitude,
            severity: h.severity,
            type: h.hazard_type
          })),
          weather_cells: weatherCells
        },
        { timeout: 5000 } // 5 second timeout
      );

      routeResult = mlResponse.data;
      console.log('✅ ML service responded:', routeResult);
    } catch (mlError) {
      console.warn('⚠️ ML service unavailable, using fallback:', mlError.message);
      
      // Fallback: Simple direct route calculation
      const distance = Math.sqrt(
        Math.pow((end.lat - start.lat) * 111, 2) +
        Math.pow((end.lng - start.lng) * 85, 2)
      );
      
      routeResult = {
        path_geojson: {
          type: 'LineString',
          coordinates: [
            [start.lng, start.lat],
            [end.lng, end.lat]
          ]
        },
        waypoints: [start, end],
        distance_km: parseFloat(distance.toFixed(2)),
        estimated_hours: parseFloat((distance / 25).toFixed(1)),
        hazards_avoided: [],
        confidence: 70,
        explanation: 'Direct route calculated (ML service unavailable). For optimal pathfinding with hazard avoidance, ensure ML service is running.'
      };
    }

    // Save route to database
    const routeData = {
      route_name: req.body.name || `Route ${start.lat},${start.lng} to ${end.lat},${end.lng}`,
      waypoints: routeResult.waypoints,
      path_geojson: routeResult.path_geojson,
      total_distance_km: routeResult.distance_km,
      estimated_time_hours: routeResult.estimated_hours,
      hazards_avoided: routeResult.hazards_avoided,
      weather_avoided: routeResult.weather_avoided || [],
      explanation: routeResult.explanation,
      confidence_score: routeResult.confidence,
      created_by: req.personnel.id
    };

    console.log('💾 Saving route to database...');
    
    const { data: savedRoute, error: routeError } = await supabase
      .from('routes')
      .insert(routeData)
      .select()
      .single();

    if (routeError) {
      console.error('❌ Database error:', routeError);
      throw routeError;
    }

    console.log('✅ Route saved:', savedRoute.id);

    // Return route with readable coordinates for frontend
    const responseRoute = {
      ...savedRoute,
      start_latitude: start.lat,
      start_longitude: start.lng,
      end_latitude: end.lat,
      end_longitude: end.lng
    };

    res.json(responseRoute);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
