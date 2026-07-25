import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { EventItem } from '../../types';

const COLORS = {
  primary: '#00918e',
  primaryDark: '#007a78',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  paper: '#ffffff',
  rowAlt: '#f8fafc',
  live: '#047857',
  soon: '#b45309',
  past: '#64748b',
};

const STATUS_LABEL: Record<string, string> = {
  ongoing: 'Berlangsung',
  upcoming: 'Akan Datang',
  past: 'Selesai',
  draft: 'Internal',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9,
    color: COLORS.text,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 12,
    marginBottom: 16,
  },
  brand: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
    marginTop: 4,
  },
  meta: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  stat: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 72,
  },
  statLabel: {
    fontSize: 7,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
    color: COLORS.text,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    color: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 2,
  },
  th: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'flex-start',
  },
  rowAlt: {
    backgroundColor: COLORS.rowAlt,
  },
  colDate: { width: '16%' },
  colTime: { width: '12%' },
  colEvent: { width: '32%' },
  colLoc: { width: '18%' },
  colCat: { width: '12%' },
  colStatus: { width: '10%' },
  cell: {
    fontSize: 8,
    color: COLORS.text,
    paddingRight: 4,
  },
  cellMuted: {
    fontSize: 8,
    color: COLORS.muted,
    paddingRight: 4,
  },
  eventName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
    paddingRight: 4,
  },
  status: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.muted,
  },
  empty: {
    marginTop: 24,
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 10,
  },
});

function statusColor(status: string): string {
  if (status === 'ongoing') return COLORS.live;
  if (status === 'upcoming') return COLORS.soon;
  return COLORS.past;
}

function formatDateLine(ev: EventItem): string {
  if (ev.isMultiDay && ev.dateEnd) {
    return `${ev.tanggal || ev.dateStr} – ${ev.dateEnd}`;
  }
  return ev.tanggal || ev.dateStr || '–';
}

function categoriesLine(ev: EventItem): string {
  if (ev.categories?.length) return ev.categories.join(', ');
  return ev.category || '–';
}

export interface EventsScheduleDocumentProps {
  events: EventItem[];
  generatedAt: string;
}

export function EventsScheduleDocument({ events, generatedAt }: EventsScheduleDocumentProps) {
  const live = events.filter(e => e.status === 'ongoing').length;
  const soon = events.filter(e => e.status === 'upcoming').length;
  const sorted = [...events].sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.acara.localeCompare(b.acara));

  return (
    <Document
      title="Jadwal Event — Metropolitan Mall Bekasi"
      author="Metropolitan Mall Bekasi"
      subject="Event Schedule"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Metropolitan Mall Bekasi</Text>
          <Text style={styles.title}>Jadwal Event</Text>
          <Text style={styles.meta}>Diekspor {generatedAt} · {sorted.length} event</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{sorted.length}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Live</Text>
            <Text style={[styles.statValue, { color: COLORS.live }]}>{live}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Akan Datang</Text>
            <Text style={[styles.statValue, { color: COLORS.soon }]}>{soon}</Text>
          </View>
        </View>

        {sorted.length === 0 ? (
          <Text style={styles.empty}>Belum ada event untuk diekspor.</Text>
        ) : (
          <>
            <View style={styles.tableHeader} fixed>
              <Text style={[styles.th, styles.colDate]}>Tanggal</Text>
              <Text style={[styles.th, styles.colTime]}>Jam</Text>
              <Text style={[styles.th, styles.colEvent]}>Acara</Text>
              <Text style={[styles.th, styles.colLoc]}>Lokasi</Text>
              <Text style={[styles.th, styles.colCat]}>Kategori</Text>
              <Text style={[styles.th, styles.colStatus]}>Status</Text>
            </View>

            {sorted.map((ev, i) => (
              <View
                key={ev.id}
                style={i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
                wrap={false}
              >
                <Text style={[styles.cell, styles.colDate]}>{formatDateLine(ev)}</Text>
                <Text style={[styles.cellMuted, styles.colTime]}>{ev.jam || '–'}</Text>
                <View style={styles.colEvent}>
                  <Text style={styles.eventName}>{ev.acara || '–'}</Text>
                  {ev.eo ? <Text style={styles.cellMuted}>{ev.eo}</Text> : null}
                </View>
                <Text style={[styles.cellMuted, styles.colLoc]}>{ev.lokasi || '–'}</Text>
                <Text style={[styles.cellMuted, styles.colCat]}>{categoriesLine(ev)}</Text>
                <Text style={[styles.status, styles.colStatus, { color: statusColor(ev.status) }]}>
                  {STATUS_LABEL[ev.status] ?? ev.status}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Metropolitan Mall Bekasi · Event Schedule</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
