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
        let color = 'bg-card-bg border border-cyan/10'; // future
        if (d.day_number <= currentDay) {
          if (d.ocr_status === 'approved') color = 'bg-lime shadow-[0_0_6px_rgba(0,255,159,0.4)]';
          else if (d.ocr_status === 'pending') color = 'bg-gold shadow-[0_0_6px_rgba(255,204,0,0.4)]';
          else if (d.ocr_status === 'rejected' || d.ocr_status === 'ocr_failed') color = 'bg-magenta shadow-[0_0_6px_rgba(255,51,153,0.4)]';
          else color = 'bg-magenta/50'; // no submission
        }
        return (
          <div key={d.day_number} className={`${dotSize} rounded-full ${color}`} />
        );
      })}
    </div>
  );
}
