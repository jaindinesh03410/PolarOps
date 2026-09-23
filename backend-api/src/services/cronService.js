import cron from 'node-cron';
import { supabase } from '../config/supabase.js';
import { analyzeStationRisks } from './correlationEngine.js';
import { refreshAllStationWeather } from './weatherService.js';

export function setupCronJobs() {
  // Refresh real Open-Meteo weather data every 3 hours for all active stations.
  // Antarctic weather doesn't need minute-level polling; 3h is a good balance
  // between freshness and rate-limit courtesy toward the free API.
  cron.schedule('0 */3 * * *', async () => {
    console.log('🌦️  Running scheduled weather refresh…');
    try {
      await refreshAllStationWeather();
    } catch (error) {
      // Top-level safety net — refreshAllStationWeather has per-station handling,
      // but guard the cron runner itself too.
      console.error('Weather refresh cron error:', error);
    }
  });

  // Run correlation analysis every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('Running correlation analysis...');
    try {
      const { data: stations } = await supabase
        .from('stations')
        .select('id, name')
        .in('status', ['ACTIVE', 'ISOLATED']);

      if (stations) {
        for (const station of stations) {
          await analyzeStationRisks(station.id);
        }
      }
      console.log('Correlation analysis complete');
    } catch (error) {
      console.error('Correlation cron error:', error);
    }
  });

  // Check for inventory below threshold every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Checking inventory levels...');
    try {
      const { data: lowItems } = await supabase
        .rpc('find_low_inventory'); // Would create this as a Postgres function

      // Alternative: query directly
      const { data: items } = await supabase
        .from('inventory_items')
        .select('*, stations(name)')
        .lte('current_quantity', supabase.raw('minimum_threshold'));

      if (items && items.length > 0) {
        for (const item of items) {
          // Check if alert already exists
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('alert_type', 'INVENTORY_LOW')
            .eq('related_entity_id', item.id)
            .eq('is_read', false)
            .single();

          if (!existing) {
            await supabase.from('alerts').insert({
              alert_type: 'INVENTORY_LOW',
              severity: 'HIGH',
              title: `Low Stock: ${item.item_name}`,
              message: `${item.item_name} at ${item.stations.name} is below minimum threshold`,
              station_id: item.station_id,
              related_entity_type: 'INVENTORY',
              related_entity_id: item.id,
              explanation: `Current: ${item.current_quantity} ${item.unit}, Minimum: ${item.minimum_threshold} ${item.unit}`,
              confidence_score: 100
            });
          }
        }
      }
    } catch (error) {
      console.error('Inventory check cron error:', error);
    }
  });

  console.log('✅ Cron jobs initialized (weather refresh every 3h, correlation every 30m, inventory check every 1h)');
}
