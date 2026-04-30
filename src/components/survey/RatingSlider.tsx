import { type ReactNode, useCallback } from 'react';

interface RatingSliderProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  icon?: ReactNode;
}

const ratingColor = (n: number): string => {
  if (n <= 3) return 'bg-red-500 ring-red-300 text-white';
  if (n <= 5) return 'bg-orange-500 ring-orange-300 text-white';
  if (n <= 7) return 'bg-yellow-500 ring-yellow-300 text-white';
  if (n <= 9) return 'bg-emerald-500 ring-emerald-300 text-white';
  return 'bg-emerald-600 ring-emerald-400 text-white';
};

const ratingLabel = (n: number): string => {
  if (n === 0) return 'Belum dinilai';
  if (n <= 2) return 'Sangat Kurang';
  if (n <= 4) return 'Kurang';
  if (n <= 6) return 'Cukup';
  if (n <= 8) return 'Baik';
  return 'Sangat Baik';
};

export default function RatingSlider({ label, description, value, onChange, icon }: RatingSliderProps) {
  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' && value < 10) onChange(value + 1);
      if (e.key === 'ArrowLeft' && value > 1) onChange(value - 1);
    },
    [value, onChange],
  );

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center gap-2">
        {icon && <span className="text-violet-500 dark:text-violet-400">{icon}</span>}
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>

      {/* Rating buttons */}
      <div
        className="flex items-center gap-1.5 sm:gap-2"
        role="radiogroup"
        aria-label={label}
        onKeyDown={handleKey}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = n === value;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${n} dari 10`}
              tabIndex={selected || (value === 0 && n === 1) ? 0 : -1}
              onClick={() => onChange(n)}
              className={`
                flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full
                text-xs sm:text-sm font-bold transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                ${selected
                  ? `${ratingColor(n)} scale-110 ring-2 shadow-md`
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }
              `}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Value label */}
      {value > 0 && (
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {value}/10 — {ratingLabel(value)}
        </p>
      )}
    </div>
  );
}
