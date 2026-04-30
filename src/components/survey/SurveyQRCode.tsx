import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode, Copy, Check } from 'lucide-react';

interface SurveyQRCodeProps {
  eventId: string;
  eventName: string;
  /** 'organizer' | 'public' | undefined (shows both) */
  surveyType?: 'organizer' | 'public';
  /** Compact mode — just the QR code, no controls */
  compact?: boolean;
}

export default function SurveyQRCode({ eventId, eventName, surveyType, compact = false }: SurveyQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [activeType, setActiveType] = useState<'organizer' | 'public'>(surveyType || 'public');

  const surveyUrl = `${window.location.origin}/survey/${eventId}?type=${activeType}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, surveyUrl, {
      width: compact ? 160 : 200,
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  }, [surveyUrl, compact]);

  const handleDownload = useCallback(async () => {
    try {
      // Generate QR as data URL
      const qrDataUrl = await QRCode.toDataURL(surveyUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#1e1b4b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });

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
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, padding, padding, size, size);

        // Title text
        ctx.fillStyle = '#1e1b4b';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Survey Kepuasan', downloadCanvas.width / 2, size + padding + 30);

        ctx.font = '12px Arial, sans-serif';
        ctx.fillStyle = '#64748b';
        const truncName = eventName.length > 40 ? eventName.slice(0, 37) + '...' : eventName;
        ctx.fillText(truncName, downloadCanvas.width / 2, size + padding + 50);

        ctx.font = '10px Arial, sans-serif';
        ctx.fillText('Metropolitan Mall Bekasi', downloadCanvas.width / 2, size + padding + 68);

        // Download
        const link = document.createElement('a');
        link.download = `survey-qr-${eventId}-${activeType}.png`;
        link.href = downloadCanvas.toDataURL('image/png');
        link.click();
      };
      img.src = qrDataUrl;
    } catch { /* ignore */ }
  }, [surveyUrl, eventId, eventName, activeType]);

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
        <p className="text-[10px] text-slate-400">Scan untuk isi survey</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Type tabs (only if no fixed type) */}
      {!surveyType && (
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
          <TabBtn active={activeType === 'public'} onClick={() => setActiveType('public')}>
            Peserta
          </TabBtn>
          <TabBtn active={activeType === 'organizer'} onClick={() => setActiveType('organizer')}>
            Penyelenggara
          </TabBtn>
        </div>
      )}

      {/* QR Code */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <canvas ref={canvasRef} className="rounded-lg" />

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Scan QR code atau bagikan link di bawah
        </p>

        {/* URL + copy */}
        <div className="flex w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700">
          <QrCode className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-300">{surveyUrl}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600"
            title="Copy link"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 px-4 py-2 text-sm font-medium text-violet-600 transition hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/20"
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
      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-600 dark:text-violet-300'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
      }`}
    >
      {children}
    </button>
  );
}
