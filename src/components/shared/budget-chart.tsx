'use client';

import dynamic from 'next/dynamic';

const COLORS = ['#0a0a0a', '#e5e5e5', '#22c55e'];

const RechartsPie = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const RechartsPieComponent = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const RechartsCell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const RechartsResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

interface BudgetChartProps {
  used: number;
  remaining: number;
}

export function BudgetChart({ used, remaining }: BudgetChartProps) {
  const data = [
    { name: 'Used', value: used },
    { name: 'Remaining', value: remaining },
  ];

  return (
    <RechartsResponsiveContainer width="100%" height={100}>
      <RechartsPie>
        <RechartsPieComponent
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={25}
          outerRadius={40}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((_, idx) => (
            <RechartsCell key={idx} fill={COLORS[idx]} />
          ))}
        </RechartsPieComponent>
      </RechartsPie>
    </RechartsResponsiveContainer>
  );
}
