import { useState, useRef, useEffect } from 'react';

interface CodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
}

export function CodeInput({ length = 5, onComplete }: CodeInputProps) {
  const [chars, setChars] = useState<string[]>(Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!char) return;

    const next = [...chars];
    next[index] = char[0];
    setChars(next);

    if (index < length - 1) {
      refs.current[index + 1]?.focus();
    }

    if (next.every(c => c !== '')) {
      onComplete(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      const next = [...chars];
      if (next[index]) {
        next[index] = '';
        setChars(next);
      } else if (index > 0) {
        next[index - 1] = '';
        setChars(next);
        refs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="text"
          maxLength={1}
          value={c}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-14 h-16 text-center text-2xl font-mono font-bold rounded-2xl border-3 bg-card-bg/80 text-white uppercase transition-all ${
            c ? 'border-gold glow-gold' : 'border-cyan/20 focus:border-cyan focus:glow-cyan'
          } focus:outline-none`}
        />
      ))}
    </div>
  );
}
