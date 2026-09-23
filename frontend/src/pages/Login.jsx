import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Snowflake, User } from 'lucide-react';

const DEMO_USERS = [
  {
    name: 'Dr. Rajesh Kumar',
    role: 'HQ_ADMIN',
    email: 'rajesh.kumar@ncaor.gov.in',
    description: 'HQ Administrator — full system access',
    route: '/hq-admin'
  },
  {
    name: 'Cdr. Anil Sharma',
    role: 'STATION_COMMANDER',
    email: 'anil.sharma@maitri.ant',
    description: 'Station Commander — Maitri Station',
    route: '/commander'
  },
  {
    name: 'Lt. Vikram Patel',
    role: 'LOGISTICS_OFFICER',
    email: 'vikram.patel@maitri.ant',
    description: 'Logistics Officer — cargo & routes',
    route: '/logistics'
  },
  {
    name: 'Dr. Priya Singh',
    role: 'MEDICAL_OFFICER',
    email: 'priya.singh@maitri.ant',
    description: 'Chief Medical Officer — health & rescue',
    route: '/medical'
  },
  {
    name: 'Ramesh Gupta',
    role: 'FIELD_CREW',
    email: 'ramesh.gupta@maitri.ant',
    description: 'Field Crew — glaciology specialist',
    route: '/field'
  }
];

export default function Login() {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = async (user) => {
    try {
      await demoLogin(user);
      navigate(user.route);
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-polar-dark p-6 text-ice-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.2),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(167,139,250,0.15),transparent_35%)]" />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <Snowflake className="mx-auto mb-4 h-14 w-14 text-polar-blue-light" />
          <h1 className="font-display text-4xl font-bold tracking-tight">Antarctic Station Ops</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-slate-400">SIH 26062 · mission login</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {DEMO_USERS.map((user) => (
            <button
              key={user.role}
              onClick={() => handleDemoLogin(user)}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-left shadow-elevation-3 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-polar-blue/50 hover:shadow-glow"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-polar-blue to-cyan-600">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">{user.name}</h3>
                  <p className="font-mono text-xs uppercase tracking-widest text-polar-blue-light">{user.role.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-sm text-slate-300">{user.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
