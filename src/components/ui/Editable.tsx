import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Input } from '../shadcn/input';
import { Textarea } from '../shadcn/textarea';

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
 * A single-line input styled to read as plain document text.
 * Always rendered as an <input> (WYSIWYG) unless disabled.
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
  const inputRef = useRef<HTMLInputElement>(null);

  const blur = () => inputRef.current?.blur();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    onCommit?.(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      blur();
    }
  };

  if (disabled) {
    return (
      <span className={className} style={style}>
        {value ? (
          value
        ) : (
          <span className="italic text-[var(--wf-ink-muted)]">{placeholder}</span>
        )}
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        className="editable h-auto! rounded-none focus-visible:ring-0!"
        aria-label={ariaLabel || placeholder}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
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
 * A multi-line auto-growing textarea styled to read as plain document text.
 * Always rendered as a <textarea> (WYSIWYG) unless disabled.
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, rows * 20)}px`;
  };

  useLayoutEffect(() => {
    resize();
  }, [value, rows]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    onCommit?.(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      textareaRef.current?.blur();
    }
  };

  if (disabled) {
    return (
      <span className={className} style={style}>
        {value ? (
          <span className="whitespace-pre-wrap">{value}</span>
        ) : (
          <span className="italic text-[var(--wf-ink-muted)]">{placeholder}</span>
        )}
      </span>
    );
  }

  return (
    <div className={className} style={style}>
      <Textarea
        ref={textareaRef}
        id={id}
        className="editable editable--area field-sizing-fixed! min-h-0! rounded-none focus-visible:ring-0!"
        aria-label={ariaLabel || placeholder}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={rows}
      />
    </div>
  );
}
