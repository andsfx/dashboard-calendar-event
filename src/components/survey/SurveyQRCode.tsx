import { useState, useEffect, useRef, useCallback } from 'react';
import QrCreator from 'qr-creator';
import { Download, QrCode, Copy, Check } from 'lucide-react';

interface SurveyQRCodeProps {
  eventId: string;
  eventName: string;
  /** 'organizer' | 'public' | undefined (shows both) */
  surveyType?: 'organizer' | 'public';
  /** Compact mode — just the QR code, no controls */
  compact?: boolean;
  /** Base path for survey URL (default: '/survey') */
  basePath?: string;
  /** Label shown on downloaded PNG (default: 'Survey Kepuasan') */
  label?: string;
  /** Show type tabs (Peserta/Penyelenggara) — set false for single-type surveys */
  showTypeTabs?: boolean;
}

export default function SurveyQRCode({
  eventId,
  eventName,
  surveyType,
  compact = false,
  basePath = '/survey',
  label = 'Survey Kepuasan',
  showTypeTabs = true,
}: SurveyQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [activeType, setActiveType] = useState<'organizer' | 'public'>(surveyType || 'public');

  const surveyUrl = showTypeTabs
    ? `${window.location.origin}${basePath}/${eventId}?type=${activeType}`
    : `${window.location.origin}${basePath}/${eventId}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QrCreator.render({
      text: surveyUrl,
      size: compact ? 160 : 200,
      quiet: 2,
      fill: '#0f172a',
      background: '#ffffff',
      ecLevel: 'M',
      radius: 0,
    }, canvasRef.current);
  }, [surveyUrl, compact]);

  const handleDownload = useCallback(() => {
    try {
      // Render QR langsung ke canvas agar tidak membuat objek Image async.
      const qrCanvas = document.createElement('canvas');
      QrCreator.render({
        text: surveyUrl,
        size: 400,
        quiet: 2,
        fill: '#0f172a',
        background: '#ffffff',
        ecLevel: 'M',
        radius: 0,
      }, qrCanvas);

      // Create canvas with branding
      const downloadCanvas = document.createElement('canvas');
      const size = 400;
      const padding = 40;
      downloadCanvas.width = size + padding * 2;
      downloadCanvas.height = size + padding * 2 + 80;
      const ctx = downloadCanvas.getContext('2d');
      if (!ctx) return;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);

      // Draw QR image
      ctx.drawImage(qrCanvas, padding, padding, size, size);

      // Title text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, downloadCanvas.width / 2, size + padding + 30);

      ctx.font = '12px Arial, sans-serif';
      ctx.fillStyle = '#64748b';
      const truncName = eventName.length > 40 ? eventName.slice(0, 37) + '…' : eventName;
      ctx.fillText(truncName, downloadCanvas.width / 2, size + padding + 50);

      ctx.font = '10px Arial, sans-serif';
      ctx.fillText('Metropolitan Mall Bekasi', downloadCanvas.width / 2, size + padding + 68);

      // Download
      const link = document.createElement('a');
      link.download = `survey-qr-${eventId}${showTypeTabs ? `-${activeType}` : ''}.png`;
      link.href = downloadCanvas.toDataURL('image/png');
      link.click();
    } catch { /* ignore */ }
  }, [surveyUrl, eventId, eventName, activeType, label, showTypeTabs]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [surveyUrl]);

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2">
        <canvas ref={canvasRef} className="rounded-lg" />
        <p className="text-[10px] text-[var(--wf-ink-muted)]">Scan untuk isi survey</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Type tabs (only if no fixed type and showTypeTabs is true) */}
      {showTypeTabs && !surveyType && (
        <div className="flex gap-1 rounded-lg bg-[var(--wf-board-2)] p-1">
          <TabBtn active={activeType === 'public'} onClick={() => setActiveType('public')}>
            Peserta
          </TabBtn>
          <TabBtn active={activeType === 'organizer'} onClick={() => setActiveType('organizer')}>
            Penyelenggara
          </TabBtn>
        </div>
      )}

      {/* QR Code */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4">
        <canvas ref={canvasRef} className="rounded-lg" />

        <p className="text-center text-xs text-[var(--wf-ink-muted)]">
          Scan QR code atau bagikan link di bawah
        </p>

        {/* URL + copy */}
        <div className="flex w-full items-center gap-2 rounded-lg bg-[var(--wf-board-2)] px-3 py-2">
          <QrCode className="h-4 w-4 shrink-0 text-[var(--wf-ink-muted)]" />
          <span className="flex-1 truncate text-xs text-[var(--wf-ink-muted)]">{surveyUrl}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md p-1 text-[var(--wf-ink-muted)] hover:bg-[var(--wf-rule-strong)] hover:text-[var(--wf-ink)]"
            title="Copy link"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--wf-live)]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--wf-accent)] px-4 py-2 text-sm font-medium text-[var(--wf-accent)] transition-colors hover:bg-[var(--wf-accent-soft)]"
        >
          <Download className="h-4 w-4" />
          Download QR Code (PNG)
        </button>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-[var(--wf-board)] text-[var(--wf-accent)]'
          : 'text-[var(--wf-ink-muted)] hover:text-[var(--wf-ink)]'
      }`}
    >
      {children}
    </button>
  );
}
