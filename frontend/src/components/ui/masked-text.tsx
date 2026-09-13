import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { maskPhone, maskId, maskEmail, maskBirthDate } from '../../utils/dataMasking';

interface MaskedTextProps {
  value: string | null | undefined;
  type?: 'phone' | 'id' | 'email' | 'birthdate' | 'custom';
  maskFn?: (val: string) => string;
  className?: string;
  defaultRevealed?: boolean;
}

export function MaskedText({
  value,
  type = 'phone',
  maskFn,
  className = '',
  defaultRevealed = false,
}: MaskedTextProps) {
  const [revealed, setRevealed] = useState(defaultRevealed);

  if (!value || value === '—') {
    return <span className={className}>—</span>;
  }

  const raw = String(value);

  const getMasked = () => {
    if (maskFn) return maskFn(raw);
    switch (type) {
      case 'phone':
        return maskPhone(raw);
      case 'id':
        return maskId(raw);
      case 'email':
        return maskEmail(raw);
      case 'birthdate':
        return maskBirthDate(raw);
      default:
        return maskPhone(raw);
    }
  };

  const displayText = revealed ? raw : getMasked();

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono ${className}`}>
      <span>{displayText}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setRevealed((prev) => !prev);
        }}
        className="p-0.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        title={revealed ? 'Hide sensitive data (Data Privacy)' : 'Reveal sensitive data (Data Privacy)'}
        aria-label={revealed ? 'Hide sensitive data' : 'Reveal sensitive data'}
      >
        {revealed ? (
          <EyeOff className="w-3.5 h-3.5 text-slate-500 hover:text-slate-700" />
        ) : (
          <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-blue-600" />
        )}
      </button>
    </span>
  );
}

export default MaskedText;
