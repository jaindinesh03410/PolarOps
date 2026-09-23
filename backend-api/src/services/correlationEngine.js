import { supabase } from '../config/supabase.js';

/**
 * Cross-Dashboard Correlation Engine
 * Combines signals from wellness, inventory, and hazards to generate Combined Risk Alerts
 */

export async function analyzeStationRisks(stationId) {
  try {
    const signals = await gatherSignals(stationId);
    const correlations = detectCorrelations(signals);
    
    if (correlations.length > 0) {
      await createCombinedRiskAlerts(stationId, correlations);
    }
    
    return correlations;
  } catch (error) {
    console.error('Correlation analysis error:', error);
    return [];
  }
}

export async function gatherSignals(stationId) {
  const signals = {
    wellnessIssues: [],
    inventoryRisks: [],
    nearbyHazards: [],
    activeSOS: [],
    weatherRisks: [],   // 4th signal: real Open-Meteo data via weather_snapshots
  };

  // Wellness concerns (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: wellness } = await supabase
    .from('wellness_checkins')
    .select('*, personnel(full_name)')
    .eq('station_id', stationId)
    .gte('checkin_date', sevenDaysAgo.toISOString().split('T')[0]);

  // Identify declining wellness trends
  const personnelMap = {};
  wellness?.forEach(checkin => {
    const pid = checkin.personnel_id;
    if (!personnelMap[pid]) personnelMap[pid] = [];
    personnelMap[pid].push(checkin);
  });

  for (const [pid, checkins] of Object.entries(personnelMap)) {
    if (checkins.length >= 2) {
      checkins.sort((a, b) => new Date(a.checkin_date) - new Date(b.checkin_date));
      const recent = checkins.slice(-3);
      const avgMood = recent.reduce((sum, c) => sum + c.mood_score, 0) / recent.length;
      const avgFatigue = recent.reduce((sum, c) => sum + c.fatigue_level, 0) / recent.length;
      
      if (avgMood < 5 || avgFatigue > 7) {
        signals.wellnessIssues.push({
          personnel_id: pid,
          personnel_name: recent[0].personnel?.full_name,
          avg_mood: avgMood,
          avg_fatigue: avgFatigue,
          severity: avgMood < 4 || avgFatigue > 8 ? 'HIGH' : 'MEDIUM'
        });
      }
    }
  }

  // Inventory at risk (below threshold or forecasted depletion soon)
  const { data: inventory } = await supabase
    .from('inventory_items')
    .select('*, inventory_forecasts(*)')
    .eq('station_id', stationId);

  inventory?.forEach(item => {
    const isLow = item.current_quantity <= item.minimum_threshold;
    const forecast = item.inventory_forecasts?.[0];
    const soonDepletion = forecast && new Date(forecast.predicted_depletion_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    if (isLow || soonDepletion) {
      signals.inventoryRisks.push({
        item_id: item.id,
        item_name: item.item_name,
        category: item.category,
        current_quantity: item.current_quantity,
        severity: isLow ? 'HIGH' : 'MEDIUM',
        forecast: forecast
      });
    }
  });

  // Nearby hazards
  const { data: station } = await supabase
    .from('stations')
    .select('*')
    .eq('id', stationId)
    .single();

  if (station) {
    const { data: hazards } = await supabase
      .from('hazards')
      .select('*')
      .eq('status', 'ACTIVE');

    hazards?.forEach(hazard => {
      // Simple distance check (would use PostGIS ST_Distance in production)
      const distance = approximateDistance(
        station.latitude, station.longitude,
        hazard.latitude, hazard.longitude
      );
      
      if (distance < 10) { // Within 10km
        signals.nearbyHazards.push({
          hazard_id: hazard.id,
          hazard_type: hazard.hazard_type,
          distance_km: distance,
          severity: hazard.severity
        });
      }
    });
  }

  // Active SOS events
  const { data: sosEvents } = await supabase
    .from('sos_events')
    .select('*')
    .eq('station_id', stationId)
    .in('status', ['OPEN', 'ACKNOWLEDGED']);

  signals.activeSOS = sosEvents || [];

  // Weather risks — most recent snapshot for this station.
  // Only HIGH/CRITICAL qualify as a risk signal; lower severities are ignored
  // so the engine doesn't generate noise on routine Antarctic conditions.
  try {
    const { data: latestWeather } = await supabase
      .from('weather_snapshots')
      .select('severity, wind_speed_kmh, visibility_km, condition, fetched_at')
      .eq('station_id', stationId)
      .in('severity', ['HIGH', 'CRITICAL'])
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (latestWeather) {
      signals.weatherRisks.push({
        severity:       latestWeather.severity,
        wind_speed_kmh: latestWeather.wind_speed_kmh,
        visibility_km:  latestWeather.visibility_km,
        condition:      latestWeather.condition,
        fetched_at:     latestWeather.fetched_at,
      });
    }
  } catch (weatherErr) {
    // Degraded gracefully: weather_snapshots unavailable or no HIGH/CRITICAL row.
    // Correlation engine continues with weatherRisks: [] — existing rules unaffected.
    console.warn('⚠️  [correlationEngine] Weather snapshot query failed (non-fatal):', weatherErr.message);
  }

  return signals;
}

function detectCorrelations(signals) {
  const correlations = [];

  // Rule 1: Declining wellness + Low inventory
  if (signals.wellnessIssues.length > 0 && signals.inventoryRisks.length > 0) {
    const criticalInventory = signals.inventoryRisks.filter(i => ['FOOD', 'MEDICAL'].includes(i.category));
    if (criticalInventory.length > 0) {
      correlations.push({
        type: 'WELLNESS_INVENTORY',
        severity: 'HIGH',
        title: 'Critical: Declining Wellness & Supply Shortage',
        contributing_factors: [
          ...signals.wellnessIssues.map(w => ({ type: 'wellness', ...w })),
          ...criticalInventory.map(i => ({ type: 'inventory', ...i }))
        ],
        explanation: `${signals.wellnessIssues.length} personnel showing declining wellness metrics while ${criticalInventory.length} critical supply item(s) are running low. This combination requires immediate attention.`,
        confidence: 82
      });
    }
  }

  // Rule 2: Hazard + Low inventory + Wellness
  if (signals.nearbyHazards.length > 0 && signals.inventoryRisks.length > 0 && signals.wellnessIssues.length > 0) {
    correlations.push({
      type: 'TRIPLE_RISK',
      severity: 'CRITICAL',
      title: 'Multiple Risk Factors Detected',
      contributing_factors: [
        ...signals.wellnessIssues.map(w => ({ type: 'wellness', ...w })),
        ...signals.inventoryRisks.map(i => ({ type: 'inventory', ...i })),
        ...signals.nearbyHazards.map(h => ({ type: 'hazard', ...h }))
      ],
      explanation: `Triple risk detected: ${signals.nearbyHazards.length} hazard(s) near station, ${signals.inventoryRisks.length} supply item(s) at risk, and ${signals.wellnessIssues.length} personnel with declining wellness. Station isolation status should be reviewed.`,
      confidence: 88
    });
  }

  // Rule 3: Active SOS + Hazards
  if (signals.activeSOS.length > 0 && signals.nearbyHazards.length > 0) {
    const criticalHazards = signals.nearbyHazards.filter(h => h.severity === 'CRITICAL' || h.severity === 'HIGH');
    if (criticalHazards.length > 0) {
      correlations.push({
        type: 'SOS_HAZARD',
        severity: 'CRITICAL',
        title: 'Active Emergency Near Hazard Zone',
        contributing_factors: [
          ...signals.activeSOS.map(s => ({ type: 'sos', id: s.id, code: s.event_code })),
          ...criticalHazards.map(h => ({ type: 'hazard', ...h }))
        ],
        explanation: `${signals.activeSOS.length} active SOS event(s) with ${criticalHazards.length} critical hazard(s) nearby. Rescue operations may face elevated risk.`,
        confidence: 90
      });
    }
  }

  // Rule 4: WEATHER_INVENTORY — severe weather + tight supplies
  // Rationale: resupply flights/traverses are likely grounded during HIGH/CRITICAL
  // weather events, so an already-low inventory becomes acutely at risk.
  if (signals.weatherRisks.length > 0 && signals.inventoryRisks.length > 0) {
    const criticalSupplies = signals.inventoryRisks.filter(
      i => ['FOOD', 'FUEL', 'MEDICAL'].includes(i.category)
    );
    if (criticalSupplies.length > 0) {
      const wx = signals.weatherRisks[0];
      correlations.push({
        type: 'WEATHER_INVENTORY',
        severity: wx.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        title: 'Severe Weather Threatening Supply Resupply Window',
        contributing_factors: [
          ...signals.weatherRisks.map(w => ({ type: 'weather', ...w })),
          ...criticalSupplies.map(i => ({ type: 'inventory', ...i })),
        ],
        explanation:
          `Severe weather (${wx.condition}, wind ${wx.wind_speed_kmh ?? '?'} km/h, ` +
          `visibility ${wx.visibility_km ?? '?'} km) coincides with ` +
          `${criticalSupplies.length} critical supply item(s) running low ` +
          `(${criticalSupplies.map(i => i.item_name).join(', ')}). ` +
          `Resupply flights or ground traverses are likely delayed while stocks are already tight.`,
        confidence: 85,
      });
    }
  }

  // Rule 5: WEATHER_HAZARD — severe weather + nearby active hazards (compounding risk)
  // Rationale: e.g. whiteout conditions near an active crevasse zone or ice-shelf
  // hazard dramatically increases the danger of any field operation in that area.
  if (signals.weatherRisks.length > 0 && signals.nearbyHazards.length > 0) {
    const wx = signals.weatherRisks[0];
    const highHazards = signals.nearbyHazards.filter(
      h => h.severity === 'CRITICAL' || h.severity === 'HIGH'
    );
    if (highHazards.length > 0) {
      correlations.push({
        type: 'WEATHER_HAZARD',
        severity: 'CRITICAL',
        title: 'Severe Weather Compounding Active Hazard Risk',
        contributing_factors: [
          ...signals.weatherRisks.map(w => ({ type: 'weather', ...w })),
          ...highHazards.map(h => ({ type: 'hazard', ...h })),
        ],
        explanation:
          `Severe weather (${wx.condition}, wind ${wx.wind_speed_kmh ?? '?'} km/h, ` +
          `visibility ${wx.visibility_km ?? '?'} km) is active simultaneously with ` +
          `${highHazards.length} HIGH/CRITICAL hazard(s) near the station ` +
          `(${highHazards.map(h => h.hazard_type).join(', ')}). ` +
          `Compounding risk — e.g. whiteout conditions near an active crevasse zone. ` +
          `All field operations in the area should be suspended.`,
        confidence: 91,
      });
    }
  }

  return correlations;
}

async function createCombinedRiskAlerts(stationId, correlations) {
  for (const correlation of correlations) {
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('alert_type', 'COMBINED_RISK')
      .eq('station_id', stationId)
      .eq('title', correlation.title)
      .eq('is_read', false)
      .single();

    // Don't create duplicate unread alerts
    if (existing) continue;

    await supabase.from('alerts').insert({
      alert_type: 'COMBINED_RISK',
      severity: correlation.severity,
      title: correlation.title,
      message: correlation.explanation,
      station_id: stationId,
      correlation_data: correlation.contributing_factors,
      explanation: correlation.explanation,
      data_source: 'SIMULATED',
      confidence_score: correlation.confidence
    });
  }
}

// Haversine distance approximation
function approximateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
