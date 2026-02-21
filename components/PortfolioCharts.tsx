
import * as React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { PortfolioRow } from '../types';

interface Props {
  data: PortfolioRow[];
  full?: boolean;
}

const COLORS = [
  '#4f46e5', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

export const PortfolioCharts: React.FC<Props> = ({ data, full }) => {
  const chartData = data.map(item => ({
    name: item.ticker.split('.')[0],
    value: item.totalValue,
    pl: item.profitOrLoss,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 italic">
        No data to visualize
      </div>
    );
  }

  return (
    <div className={`w-full ${full ? 'space-y-12' : ''}`}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => `LKR ${value.toLocaleString()}`}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            />
            {!full && <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />}
          </PieChart>
        </ResponsiveContainer>
      </div>

      {full && (
        <div className="h-80 w-full mt-8">
          <h3 className="text-center font-bold text-gray-700 mb-4">Profit / Loss by Ticker</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                formatter={(value: number) => [`LKR ${value.toLocaleString()}`, 'Profit/Loss']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="pl">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pl >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
