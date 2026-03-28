import type { SubmissionDot } from '@/types/database';

interface StreakDotsProps {
  dots: SubmissionDot[];
  currentDay: number;
  size?: 'sm' | 'md';
}

export function StreakDots({ dots, currentDay, size = 'md' }: StreakDotsProps) {
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-4 h-4';
  const gap = size === 'sm' ? 'gap-1' : 'gap-1.5';

  return (
    <div className={`flex ${gap}`}>
      {dots.map((d) => {
        let color = 'bg-gray-600'; // future
        if (d.day_number <= currentDay) {
          if (d.ocr_status === 'approved') color = 'bg-emerald-500';
          else if (d.ocr_status === 'pending') color = 'bg-amber-500';
          else if (d.ocr_status === 'rejected' || d.ocr_status === 'ocr_failed') color = 'bg-red-500';
          else color = 'bg-red-500'; // no submission = DNF
        }
        return (
          <div key={d.day_number} className={`${dotSize} rounded-full ${color}`} />
        );
      })}
    </div>
  );
}
