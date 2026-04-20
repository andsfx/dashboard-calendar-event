import { X, Clock, MapPin, Calendar, User, Edit2, Trash2, Zap, Tag } from 'lucide-react';
import { EventItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { CategoryBadges } from './CategoryBadges';
import { PriorityBadge } from './PriorityBadge';
import { CATEGORY_COLORS } from '../utils/eventUtils';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  event: EventItem | null;
  onClose: () => void;
  onEdit?: (ev: EventItem) => void;
  onDelete?: (ev: EventItem) => void;
  isAdmin?: boolean;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-700/40 transition hover:bg-slate-100 dark:hover:bg-slate-700/60">
      <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-white break-words">{value || '–'}</p>
      </div>
    </div>
  );
}

function getEventModelLabel(value: EventItem['eventModel']) {
  if (value === 'free') return 'Free';
  if (value === 'bayar') return 'Bayar';
  if (value === 'support') return 'Support';
  return '';
}

export function EventDetailModal({ isOpen, event, onClose, onEdit, onDelete, isAdmin = false }: Props) {
  if (!event) return null;

  const color = CATEGORY_COLORS[event.category] ?? '#6366f1';
  const isOngoing = event.status === 'ongoing';

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="rounded-2xl bg-white shadow-2xl dark:bg-slate-800 overflow-hidden">
        {/* Color accent header */}
        <div
          className="relative px-4 pb-5 pt-6 sm:px-6"
          style={{
            background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
            borderBottom: `3px solid ${color}44`,
          }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${color}, ${color}44)` }} />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-white/70 hover:text-slate-700 dark:hover:bg-slate-700"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-3 flex flex-wrap items-center gap-2 pr-8 sm:pr-10">
            <StatusBadge status={event.status} />
            <CategoryBadges categories={event.categories} />
            {isAdmin && <PriorityBadge priority={event.priority} />}
            {isOngoing && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Zap className="h-3 w-3" /> LIVE
              </span>
            )}
          </div>

          <h2 className="pr-8 text-lg font-bold leading-snug text-slate-900 dark:text-white sm:pr-10 sm:text-xl">
            {event.acara}
          </h2>
        </div>

        {/* Body */}
        <div className="space-y-3 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <InfoRow
              icon={<Calendar className="h-4 w-4 text-violet-500" />}
              label="Tanggal"
              value={`${event.day}, ${event.tanggal}`}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4 text-blue-500" />}
              label="Waktu"
              value={event.jam || '–'}
            />
            <InfoRow
              icon={<MapPin className="h-4 w-4 text-red-500" />}
              label="Lokasi"
              value={event.lokasi || '–'}
            />
            <InfoRow
              icon={<User className="h-4 w-4 text-amber-500" />}
              label="Event Organizer"
              value={event.eo || '–'}
            />
            {isAdmin && event.pic && (
              <InfoRow
                icon={<User className="h-4 w-4 text-cyan-500" />}
                label="Penanggung Jawab"
                value={event.pic}
              />
            )}
            {isAdmin && event.phone && (
              <InfoRow
                icon={<Tag className="h-4 w-4 text-teal-500" />}
                label="Nomor Handphone"
                value={event.phone}
              />
            )}
            {isAdmin && event.eventModel && (
              <InfoRow
                icon={<Tag className="h-4 w-4 text-emerald-500" />}
                label="Model Event"
                value={getEventModelLabel(event.eventModel)}
              />
            )}
            {isAdmin && event.eventNominal && (
              <InfoRow
                icon={<Tag className="h-4 w-4 text-blue-500" />}
                label="Nominal Event"
                value={event.eventNominal}
              />
            )}
            {isAdmin && event.eventModelNotes && (
              <InfoRow
                icon={<Tag className="h-4 w-4 text-violet-500" />}
                label="Keterangan Model Event"
                value={event.eventModelNotes}
              />
            )}
          </div>

          {event.keterangan && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/40">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <Tag className="h-3 w-3" /> Keterangan
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{event.keterangan}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:px-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Tutup
          </button>
          {onEdit && (
            <button
              onClick={() => { onClose(); onEdit(event); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-95 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onClose(); onDelete(event); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 active:scale-95 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}
