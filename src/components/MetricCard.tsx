interface MetricCardProps {
  label: string;
  value: string | number;
  color?: 'default' | 'green' | 'red' | 'amber';
}

const colorMap = {
  default: 'text-white',
  green: 'text-emerald-400',
  red: 'text-red-400',
  amber: 'text-amber-400',
};

export function MetricCard({ label, value, color = 'default' }: MetricCardProps) {
  return (
    <div className="bg-gray-800/60 rounded-2xl p-4 flex flex-col items-center gap-1">
      <span className={`text-2xl font-bold ${colorMap[color]}`}>{value}</span>
      <span className="text-xs text-gray-400 text-center">{label}</span>
    </div>
  );
}
