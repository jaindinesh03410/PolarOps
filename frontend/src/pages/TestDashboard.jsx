import { useAuth } from '../contexts/AuthContext';

export default function TestDashboard() {
  const { user, personnel } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-6">✅ Dashboard Loaded Successfully!</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded border border-green-200">
            <h2 className="font-bold text-green-900 mb-2">Authentication Status</h2>
            <pre className="text-sm">{JSON.stringify({ user, personnel }, null, 2)}</pre>
          </div>
          
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <h2 className="font-bold text-blue-900 mb-2">User Info</h2>
            <p><strong>Name:</strong> {personnel?.full_name}</p>
            <p><strong>Role:</strong> {personnel?.role}</p>
            <p><strong>Email:</strong> {personnel?.email}</p>
            <p><strong>Station:</strong> {personnel?.stations?.name}</p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded border border-purple-200">
            <h2 className="font-bold text-purple-900 mb-2">System Status</h2>
            <p>✅ React app running</p>
            <p>✅ Authentication working</p>
            <p>✅ Context providers active</p>
            <p>✅ Routing functional</p>
          </div>
        </div>
      </div>
    </div>
  );
}
