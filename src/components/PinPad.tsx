import { useState } from 'react';
import { Delete } from 'lucide-react';

interface PinPadProps {
  length?: number;
  onComplete: (pin: string) => void;
  label?: string;
}

export function PinPad({ length = 4, onComplete, label = 'Enter PIN' }: PinPadProps) {
  const [pin, setPin] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length >= length) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === length) onComplete(next);
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-text-secondary">{label}</p>
      <div className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`w-14 h-16 rounded-2xl border-3 flex items-center justify-center text-2xl font-bold transition-all ${
              i < pin.length
                ? 'border-gold bg-gold/10 text-gold glow-gold'
                : 'border-cyan/20 bg-card-bg/80'
            }`}
          >
            {i < pin.length ? '•' : ''}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-72">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
          <button
            key={key || 'empty'}
            className={`h-16 rounded-2xl text-xl font-bold transition-all active:scale-95 ${
              key === 'del'
                ? 'bg-card-bg/80 text-magenta border-2 border-magenta/20'
                : key === ''
                ? 'invisible'
                : 'bg-card-bg/80 text-white border-2 border-cyan/10 active:border-cyan/30 active:glow-cyan'
            }`}
            onClick={() => {
              if (key === 'del') handleDelete();
              else if (key !== '') handleDigit(key);
            }}
            disabled={key === ''}
          >
            {key === 'del' ? <Delete className="w-5 h-5 mx-auto" /> : key}
          </button>
        ))}
      </div>
    </div>
  );
}
