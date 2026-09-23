import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RiskBreakdownChart({ data, title, subtitle }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
      <div className="mb-6 border-b border-slate-100 pb-4">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="text-xs font-medium text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
      
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              horizontal={false} 
              stroke="#E2E8F0" 
            />
            <XAxis 
              type="number" 
              max={1.0} 
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} 
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip 
              cursor={{ fill: '#F8FAFC' }} 
              contentStyle={{ 
                borderRadius: '6px', 
                border: '1px solid #E2E8F0', 
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' 
              }} 
            />
            <Legend 
              iconType="square" 
              wrapperStyle={{ 
                fontSize: '11px', 
                paddingTop: '10px', 
                fontWeight: 600, 
                color: '#475569' 
              }} 
            />

            {/* Tactical Industrial Palette */}
            <Bar 
              dataKey="urgency" 
              name="Urgency" 
              stackId="a" 
              fill="#E11D48" 
              radius={[0, 0, 0, 0]} 
            />
            <Bar 
              dataKey="supply" 
              name="Supply Risk" 
              stackId="a" 
              fill="#F59E0B" 
            />
            <Bar 
              dataKey="impact" 
              name="Impact" 
              stackId="a" 
              fill="#0284C7" 
            />
            <Bar 
              dataKey="uncertainty" 
              name="Uncertainty" 
              stackId="a" 
              fill="#64748B" 
              radius={[0, 2, 2, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
