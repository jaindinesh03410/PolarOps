import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useOffline } from '../contexts/OfflineContext';
import { api } from '../lib/api';
import { AlertTriangle, Heart, Send, CheckCircle } from 'lucide-react';
import { EnvironmentalMonitor } from '../components/EnvironmentalMonitor';

export default function FieldCrewDashboard() {
  const { personnel } = useAuth();
  const toast = useToast();
  const { isOnline, queueAction, queuedActions } = useOffline();
  const [sosMessage, setSOSMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [wellness, setWellness] = useState({ mood_score: 7, fatigue_level: 3, stress_level: 3, sleep_hours: 7 });
  const [myWellness, setMyWellness] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    console.log('👤 Personnel data in FieldCrewDashboard:', personnel);
    if (personnel) {
      console.log('👤 Personnel ID:', personnel.id);
      console.log('👤 Personnel type:', typeof personnel.id);
      loadData();
    }
  }, [personnel]);

  const loadData = async () => {
    if (!isOnline || !personnel) return;
    
    try {
      // Fetch wellness data
      let wellnessData = [];
      try {
        wellnessData = await api.getPersonnelWellness(personnel.id);
      } catch (err) {
        console.warn('Wellness fetch failed:', err);
      }
      
      // Fetch inventory data
      let inventoryData = [];
      try {
        inventoryData = await api.getStationInventory(personnel.station_id);
      } catch (err) {
        console.warn('Inventory fetch failed:', err);
      }

      setMyWellness(wellnessData || []);
      setInventory(inventoryData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const triggerSOS = async () => {
    if (!sosMessage.trim()) {
      toast.error('Please enter SOS message');
      return;
    }

    if (!personnel) {
      toast.error('Personnel data not available. Please refresh and try again.');
      return;
    }

    setSending(true);

    const sosData = {
      message: sosMessage,
      latitude: null,
      longitude: null,
      severity: 'MEDIUM',
      personnel_id: personnel.id,
      station_id: personnel.station_id
    };

    if (isOnline) {
      try {
        console.log('📡 Sending SOS:', sosData);
        const result = await api.createSOS(sosData);
        console.log('✅ SOS sent successfully:', result);
        toast.success('SOS sent successfully! Emergency teams notified.');
        setSOSMessage('');
      } catch (error) {
        console.error('❌ Failed to send SOS:', error);
        toast.error(`Failed to send SOS: ${error.message}`);
      } finally {
        setSending(false);
      }
    } else {
      try {
        await queueAction({
          type: 'api',
          url: `${import.meta.env.VITE_API_URL}/sos`,
          method: 'POST',
          data: sosData
        });
        toast.info('SOS queued - will send when online!');
        setSOSMessage('');
      } catch (error) {
        toast.error('Failed to queue SOS');
      } finally {
        setSending(false);
      }
    }
  };

  const submitWellness = async () => {
    if (!personnel || !personnel.id) {
      toast.error('Personnel data not available. Please refresh and login again.');
      return;
    }

    console.log('💚 Submitting wellness for personnel:', personnel.id);

    const wellnessData = {
      personnel_id: personnel.id,
      mood_score: wellness.mood_score,
      fatigue_level: wellness.fatigue_level,
      stress_level: wellness.stress_level,
      sleep_hours: wellness.sleep_hours,
      checkin_date: new Date().toISOString().split('T')[0]
    };

    console.log('💚 Wellness data:', wellnessData);

    if (isOnline) {
      try {
        const result = await api.submitWellness(wellnessData);
        console.log('✅ Wellness submitted:', result);
        toast.success('Wellness check-in submitted!');
        await loadData();
      } catch (error) {
        console.error('❌ Wellness error:', error);
        toast.error(`Failed: ${error.message}`);
      }
    } else {
      try {
        await queueAction({
          type: 'api',
          url: `${import.meta.env.VITE_API_URL}/wellness`,
          method: 'POST',
          data: wellnessData
        });
        toast.info('Wellness check-in queued!');
      } catch (error) {
        toast.error('Failed to queue wellness data');
      }
    }
  };

  const slider = 'h-3 w-full accent-black';

  return (
    <div className="space-y-6 text-polar-dark">
      <div>
        <h1 className="font-heading text-4xl font-bold leading-tight">Field Crew</h1>
        <p className="mt-1 text-lg font-medium font-mono">{personnel?.stations?.name}</p>
        {!isOnline && (
          <div className="mt-3 border-4 border-black bg-amber-300 p-4 text-base font-bold">
            OFFLINE MODE — saved on this device
            {queuedActions.length > 0 && ` (${queuedActions.length} queued)`}
          </div>
        )}
      </div>

      <div className="rounded-2xl border-4 border-red-800 bg-red-600 p-5 text-white shadow-lg">
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-black">
          <AlertTriangle className="h-8 w-8" />
          Emergency SOS
        </h2>
        <textarea
          value={sosMessage}
          onChange={(e) => setSOSMessage(e.target.value)}
          placeholder="Describe the emergency…"
          className="mb-3 w-full rounded-xl border-4 border-black p-4 text-lg text-black"
          rows={3}
        />
        <button
          onClick={triggerSOS}
          disabled={sending || !sosMessage.trim()}
          className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-black text-xl font-black text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-all"
        >
          <Send className="h-6 w-6" />
          {sending ? 'SENDING...' : isOnline ? 'SEND SOS NOW' : 'QUEUE SOS (SYNC LATER)'}
        </button>
        <p className="mt-3 text-sm font-semibold text-red-100">
          Works with zero connectivity. The message leaves this phone when the link returns.
        </p>
      </div>

      <div className="rounded-2xl border-4 border-black bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <Heart className="h-7 w-7 text-pink-700" />
          Daily wellness
        </h2>
        <div className="space-y-5 text-lg">
          <div>
            <label className="mb-2 block font-bold">Mood (1-10): {wellness.mood_score}</label>
            <input type="range" min="1" max="10" value={wellness.mood_score} onChange={(e) => setWellness({ ...wellness, mood_score: parseInt(e.target.value) })} className={slider} />
          </div>
          <div>
            <label className="mb-2 block font-bold">Fatigue (1-10): {wellness.fatigue_level}</label>
            <input type="range" min="1" max="10" value={wellness.fatigue_level} onChange={(e) => setWellness({ ...wellness, fatigue_level: parseInt(e.target.value) })} className={slider} />
          </div>
          <div>
            <label className="mb-2 block font-bold">Stress (1-10): {wellness.stress_level}</label>
            <input type="range" min="1" max="10" value={wellness.stress_level} onChange={(e) => setWellness({ ...wellness, stress_level: parseInt(e.target.value) })} className={slider} />
          </div>
          <div>
            <label className="mb-2 block font-bold">Sleep hours</label>
            <input
              type="number"
              step="0.5"
              value={wellness.sleep_hours}
              onChange={(e) => setWellness({ ...wellness, sleep_hours: parseFloat(e.target.value) })}
              className="min-h-[52px] w-full rounded-xl border-4 border-black p-3 text-lg"
            />
          </div>
          <button onClick={submitWellness} className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-polar-blue text-lg font-bold text-white">
            <CheckCircle className="h-6 w-6" />
            Submit check-in
          </button>
        </div>
      </div>

      <div className="rounded-2xl border-4 border-black bg-white p-5">
        <h3 className="mb-3 text-xl font-bold">Your recent check-ins</h3>
        <div className="space-y-3">
          {myWellness.slice(0, 5).map(w => (
            <div key={w.id} className="border-l-8 border-polar-blue pl-3 text-base">
              <div className="font-bold">{new Date(w.checkin_date).toLocaleDateString()}</div>
              <div>Mood {w.mood_score}/10 · Fatigue {w.fatigue_level}/10 · Stress {w.stress_level}/10</div>
            </div>
          ))}
        </div>
      </div>

      {/* Environmental Monitoring */}
      <EnvironmentalMonitor location="Field Operations" />

      <div className="rounded-2xl border-4 border-black bg-white p-5">
        <h3 className="mb-3 text-xl font-bold">Station inventory</h3>
        <div className="space-y-3">
          {inventory.slice(0, 5).map(item => (
            <div key={item.id} className="flex items-center justify-between border-b-2 border-black/20 pb-2 text-lg">
              <div>
                <div className="font-bold">{item.item_name}</div>
                <div className="text-base">{item.category}</div>
              </div>
              <div className={`font-mono text-xl font-black ${item.current_quantity <= item.minimum_threshold ? 'text-red-700' : 'text-emerald-800'}`}>
                {item.current_quantity} {item.unit}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
