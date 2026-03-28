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
      <p className="text-sm text-gray-400">{label}</p>
      <div className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
              i < pin.length
                ? 'border-violet-500 bg-violet-500/20 text-white'
                : 'border-gray-600 bg-gray-800/50'
            }`}
          >
            {i < pin.length ? '•' : ''}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-64">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
          <button
            key={key || 'empty'}
            className={`h-14 rounded-xl text-xl font-semibold transition-all active:scale-95 ${
              key === 'del'
                ? 'bg-gray-700 text-gray-300 active:bg-gray-600'
                : key === ''
                ? 'invisible'
                : 'bg-gray-800 text-white active:bg-gray-700'
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
