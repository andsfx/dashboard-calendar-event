import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * A single-line input styled to read as plain text in the letter.
 * Appears as regular text when not focused, becomes editable on click/focus.
 */
export function EditableText({
  value,
  onChange,
  onCommit,
  placeholder,
  className = '',
  style,
  ariaLabel,
  disabled = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    onCommit?.(value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const baseClasses = 'transition-colors duration-200';
  const displayClasses = `${baseClasses} ${
    disabled 
      ? 'text-slate-500 dark:text-slate-300 cursor-not-allowed' 
      : 'cursor-text hover:bg-slate-100 hover:dark:bg-slate-700/50'
  }`;
  const editClasses = `${baseClasses} w-full border-b border-slate-300 bg-transparent py-0.5 outline-none focus:border-blue-500 dark:border-slate-600 dark:focus:border-blue-400`;

  return (
    <span
      className={className}
      style={style}
      onClick={handleClick}
      aria-label={ariaLabel || placeholder}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsEditing(false);
              inputRef.current?.blur();
            }
          }}
          className={editClasses}
          placeholder={placeholder}
          disabled={disabled}
        />
      ) : (
        <span className={displayClasses}>
          {value || (
            <span className="text-slate-500 dark:text-slate-300 italic">
              {placeholder}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

interface EditableAreaProps {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  disabled?: boolean;
  rows?: number;
}

/**
 * A multi-line auto-growing textarea styled to read as plain text in the letter.
 * Appears as regular paragraph when not focused, becomes editable on click/focus.
 */
export function EditableArea({
  value,
  onChange,
  onCommit,
  placeholder,
  className = '',
  style,
  ariaLabel,
  disabled = false,
  rows = 3,
}: EditableAreaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea and focus when editing
  useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = `${Math.max(el.scrollHeight, rows * 20)}px`;
      el.focus();
    }
  }, [isEditing, rows]);

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    onCommit?.(value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Auto-resize during typing
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = `${Math.max(el.scrollHeight, rows * 20)}px`;
    }
  };

  const baseClasses = 'transition-colors duration-200 leading-relaxed';
  const displayClasses = `${baseClasses} ${
    disabled 
      ? 'text-slate-500 dark:text-slate-300 cursor-not-allowed' 
      : 'cursor-text hover:bg-slate-100 hover:dark:bg-slate-700/50 p-1 -m-1 rounded'
  }`;
  const editClasses = `${baseClasses} w-full resize-none border border-slate-300 bg-transparent p-2 outline-none focus:border-blue-500 dark:border-slate-600 dark:focus:border-blue-400 min-h-[60px]`;

  return (
    <div
      className={className}
      style={style}
      onClick={handleClick}
      aria-label={ariaLabel || placeholder}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsEditing(false);
              textareaRef.current?.blur();
            }
          }}
          className={editClasses}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
        />
      ) : (
        <div className={displayClasses}>
          {value ? (
            value.split('\n').map((line, i) => (
              <p key={i} className="mb-2 last:mb-0">
                {line}
              </p>
            ))
          ) : (
            <span className="text-slate-500 dark:text-slate-300 italic">
              {placeholder}
            </span>
          )}
        </div>
      )}
    </div>
  );
}