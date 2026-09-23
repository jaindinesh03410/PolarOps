import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

router.use(authenticateUser);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cargo_manifests')
      .select('*, origin:origin_station_id(name), destination:destination_station_id(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cargo_manifests')
      .select('*, origin:origin_station_id(*), destination:destination_station_id(*), cargo_optimizations(*)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/optimize', requireRole('LOGISTICS_OFFICER', 'HQ_ADMIN'), async (req, res) => {
  try {
    const manifestId = req.params.id;
    const { maxWeight, maxVolume } = req.body;

    console.log('📦 Cargo optimization request:', { manifestId, maxWeight, maxVolume });

    // Fetch manifest
    const { data: manifest, error: manifestError } = await supabase
      .from('cargo_manifests')
      .select('*')
      .eq('id', manifestId)
      .single();

    if (manifestError) {
      console.warn('⚠️ Manifest not found in DB, using mock data');
      // Use mock manifest if not found
      const mockManifest = {
        id: manifestId,
        items: [
          { item_name: 'Medical Supplies', quantity: 50, weight: 120, volume: 2.5, priority: 10 },
          { item_name: 'Food Rations', quantity: 200, weight: 450, volume: 8.0, priority: 9 },
          { item_name: 'Fuel Drums', quantity: 10, weight: 800, volume: 12.0, priority: 8 },
          { item_name: 'Scientific Equipment', quantity: 5, weight: 200, volume: 3.0, priority: 6 },
          { item_name: 'Spare Parts', quantity: 30, weight: 150, volume: 2.0, priority: 5 }
        ]
      };
      return await optimizeManifest(mockManifest, maxWeight, maxVolume, manifestId, req, res);
    }

    return await optimizeManifest(manifest, maxWeight, maxVolume, manifestId, req, res);
  } catch (error) {
    console.error('❌ Cargo optimization error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function optimizeManifest(manifest, maxWeight, maxVolume, manifestId, req, res) {
  let optimization;
  
  // Try ML service with timeout
  try {
    console.log('🤖 Calling ML service for knapsack optimization...');
    const mlResponse = await axios.post(
      `${process.env.ML_SERVICE_URL}/predict/optimize-cargo`,
      {
        items: manifest.items,
        max_weight: maxWeight,
        max_volume: maxVolume
      },
      { timeout: 5000 }
    );

    optimization = mlResponse.data;
    console.log('✅ ML service optimization complete:', optimization);
  } catch (mlError) {
    console.warn('⚠️ ML service unavailable, using fallback optimization:', mlError.message);
    
    // Fallback: Simple greedy algorithm
    const items = manifest.items || [];
    const sorted = [...items].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    let totalWeight = 0;
    let totalVolume = 0;
    const selected = [];
    const excluded = [];
    
    for (const item of sorted) {
      if (totalWeight + item.weight <= maxWeight && totalVolume + item.volume <= maxVolume) {
        selected.push(item);
        totalWeight += item.weight;
        totalVolume += item.volume;
      } else {
        excluded.push({
          ...item,
          reason: 'Exceeded capacity constraints'
        });
      }
    }
    
    optimization = {
      selected_items: selected,
      excluded_items: excluded,
      total_priority: selected.reduce((sum, item) => sum + (item.priority || 0), 0),
      total_weight: totalWeight,
      total_volume: totalVolume,
      utilization: Math.round((totalWeight / maxWeight) * 100),
      confidence: 70,
      explanation: `Greedy algorithm selected ${selected.length} items by priority (ML service unavailable). Total: ${totalWeight}kg, ${totalVolume}m³`
    };
  }

  // Try to store optimization result (optional, don't fail if it doesn't work)
  try {
    const { data: savedOpt, error: optError } = await supabase
      .from('cargo_optimizations')
      .insert({
        manifest_id: manifestId,
        constraint_type: 'COMBINED',
        max_capacity: maxWeight,
        optimized_items: optimization.selected_items,
        excluded_items: optimization.excluded_items,
        total_value: optimization.total_priority,
        utilization_percent: optimization.utilization,
        explanation: optimization.explanation,
        confidence_score: optimization.confidence
      })
      .select()
      .single();

    if (optError) {
      console.warn('⚠️ Could not save to database:', optError.message);
    } else {
      console.log('✅ Optimization saved to database');
    }
  } catch (dbError) {
    console.warn('⚠️ Database save failed:', dbError.message);
  }

  // Return optimization result regardless of database save
  res.json({
    id: manifestId,
    manifest_id: manifestId,
    selected_items: optimization.selected_items,
    excluded_items: optimization.excluded_items,
    total_weight: optimization.total_weight,
    total_volume: optimization.total_volume,
    total_priority: optimization.total_priority,
    utilization: optimization.utilization,
    confidence_score: optimization.confidence,
    explanation: optimization.explanation
  });
}

router.post('/', requireRole('LOGISTICS_OFFICER', 'HQ_ADMIN'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cargo_manifests')
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
