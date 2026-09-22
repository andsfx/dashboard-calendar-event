import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  id?: string;
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
  id,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
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
      ? 'text-[var(--wf-ink-muted)] cursor-not-allowed' 
      : 'cursor-text hover:bg-[var(--wf-board-2)]'
  }`;
  const editClasses = `${baseClasses} w-full border-b border-[var(--wf-rule)] bg-transparent py-0.5 outline-none focus:border-[var(--wf-accent)]`;

  return (
    <span
      className={className}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? undefined : 0}
      aria-label={ariaLabel || placeholder}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          id={id}
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
            <span className="text-[var(--wf-ink-muted)] italic">
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
  id?: string;
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
  id,
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
  const handleKeyDownArea = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
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
      ? 'text-[var(--wf-ink-muted)] cursor-not-allowed' 
      : 'cursor-text hover:bg-[var(--wf-board-2)] p-1 -m-1 rounded'
  }`;
  const editClasses = `${baseClasses} w-full resize-none border border-[var(--wf-rule)] bg-transparent p-2 outline-none focus:border-[var(--wf-accent)] min-h-[60px]`;

  return (
    <div
      className={className}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDownArea}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? undefined : 0}
      aria-label={ariaLabel || placeholder}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          id={id}
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
            <span className="text-[var(--wf-ink-muted)] italic">
              {placeholder}
            </span>
          )}
        </div>
      )}
    </div>
  );
}