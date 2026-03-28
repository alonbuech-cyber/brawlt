interface MetricCardProps {
  label: string;
  value: string | number;
  color?: 'default' | 'green' | 'red' | 'amber';
}

const colorMap = {
  default: 'text-white',
  green: 'text-lime',
  red: 'text-magenta',
  amber: 'text-gold',
};

export function MetricCard({ label, value, color = 'default' }: MetricCardProps) {
  return (
    <div className="brawl-card p-4 flex flex-col items-center gap-1">
      <span className={`text-2xl font-bold font-brawl ${colorMap[color]}`}>{value}</span>
      <span className="text-xs text-text-secondary text-center">{label}</span>
    </div>
  );
}
