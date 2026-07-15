import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ResultsAggregate, ResultsFilter } from '../../utils/tenantSurveyResultsAggregate';

const COLORS = {
  primary: '#0f766e',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  head: '#f1f5f9',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 10,
    color: COLORS.text,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.primary, marginBottom: 4 },
  subtitle: { fontSize: 9, color: COLORS.muted, marginBottom: 12 },
  section: { marginTop: 14, marginBottom: 4 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 3,
  },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
  },
  kpiLabel: { fontSize: 8, color: COLORS.muted, marginBottom: 2 },
  kpiValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 3 },
  headRow: { backgroundColor: COLORS.head, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cell: { fontSize: 8, paddingHorizontal: 3, paddingVertical: 2 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: COLORS.muted,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterLine: { fontSize: 8, color: COLORS.muted, marginBottom: 2 },
  feedbackItem: { marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  feedbackGerai: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  feedbackText: { fontSize: 8, color: COLORS.text },
});

export interface TenantSurveyResultsPdfPayload {
  aggregate: ResultsAggregate;
  filter: ResultsFilter;
  eventLabel: string;
  generatedAt: string;
  generatedBy?: string;
}

function DistTable({ title, dist }: { title: string; dist: ResultsAggregate['trafficDist'] }) {
  const total = Object.values(dist.counts).reduce((a, b) => a + b, 0) || 1;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.row, styles.headRow]}>
        <Text style={[styles.cell, { width: '55%' }]}>Kategori</Text>
        <Text style={[styles.cell, { width: '20%' }]}>Jumlah</Text>
        <Text style={[styles.cell, { width: '25%' }]}>Persen</Text>
      </View>
      {dist.labels.map((label) => {
        const n = dist.counts[label] || 0;
        const pct = Math.round((n / total) * 100);
        return (
          <View key={label} style={styles.row}>
            <Text style={[styles.cell, { width: '55%' }]}>{label}</Text>
            <Text style={[styles.cell, { width: '20%' }]}>{n}</Text>
            <Text style={[styles.cell, { width: '25%' }]}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

export function TenantSurveyResultsDocument({
  aggregate,
  filter,
  eventLabel,
  generatedAt,
  generatedBy,
}: TenantSurveyResultsPdfPayload) {
  const a = aggregate;
  return (
    <Document
      title="Hasil Evaluasi Tenant"
      author="Metropolitan Mall Bekasi"
      subject="Tenant Survey Results"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Hasil Evaluasi Tenant</Text>
        <Text style={styles.subtitle}>Metropolitan Mall Bekasi · Internal Tenant Relation</Text>

        <Text style={styles.filterLine}>Event: {eventLabel}</Text>
        <Text style={styles.filterLine}>
          Periode: {filter.dateFrom || '—'} s/d {filter.dateTo || '—'}
          {' · '}Zona: {filter.zona === 'all' ? 'Semua' : filter.zona}
          {' · '}Kategori: {filter.kategori === 'all' ? 'Semua' : filter.kategori}
          {' · '}Status: {filter.status === 'all' ? 'submitted+reviewed' : filter.status}
        </Text>
        <Text style={styles.filterLine}>
          Dibuat: {generatedAt}{generatedBy ? ` · ${generatedBy}` : ''}
        </Text>

        <View style={[styles.kpiRow, { marginTop: 10 }]}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Total Submisi (v3)</Text>
            <Text style={styles.kpiValue}>{a.total}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Tenant yang sudah isi</Text>
            <Text style={styles.kpiValue}>{a.uniqueGerai}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Traffic Positif</Text>
            <Text style={styles.kpiValue}>{a.trafficPosPct}%</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Sales Positif</Text>
            <Text style={styles.kpiValue}>{a.salesPosPct}%</Text>
          </View>
        </View>

        <DistTable title="Distribusi Traffic" dist={a.trafficDist} />
        <DistTable title="Distribusi Sales" dist={a.salesDist} />

        <View style={styles.footer} fixed>
          <Text>Internal — Tenant Relation · tanpa data PIC</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <DistTable title="Distribusi Kategori" dist={a.kategoriDist} />
        <DistTable title="Distribusi Zona" dist={a.zonaDist} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Gerai (traffic + sales positif)</Text>
          <View style={[styles.row, styles.headRow]}>
            <Text style={[styles.cell, { width: '40%' }]}>Gerai</Text>
            <Text style={[styles.cell, { width: '15%' }]}>N</Text>
            <Text style={[styles.cell, { width: '15%' }]}>Traffic+</Text>
            <Text style={[styles.cell, { width: '15%' }]}>Sales+</Text>
            <Text style={[styles.cell, { width: '15%' }]}>Skor</Text>
          </View>
          {a.topGerai.length === 0 ? (
            <Text style={styles.cell}>Tidak ada data</Text>
          ) : (
            a.topGerai.map((g) => (
              <View key={g.nama_gerai} style={styles.row}>
                <Text style={[styles.cell, { width: '40%' }]}>{g.nama_gerai}</Text>
                <Text style={[styles.cell, { width: '15%' }]}>{g.count}</Text>
                <Text style={[styles.cell, { width: '15%' }]}>{g.trafficPos}</Text>
                <Text style={[styles.cell, { width: '15%' }]}>{g.salesPos}</Text>
                <Text style={[styles.cell, { width: '15%' }]}>{g.score}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cross-tab Kategori × Sales (top 20)</Text>
          <View style={[styles.row, styles.headRow]}>
            <Text style={[styles.cell, { width: '40%' }]}>Kategori</Text>
            <Text style={[styles.cell, { width: '40%' }]}>Sales</Text>
            <Text style={[styles.cell, { width: '20%' }]}>N</Text>
          </View>
          {a.crossTab.slice(0, 20).map((c) => (
            <View key={`${c.kategori}-${c.sales}`} style={styles.row}>
              <Text style={[styles.cell, { width: '40%' }]}>{c.kategori}</Text>
              <Text style={[styles.cell, { width: '40%' }]}>{c.sales}</Text>
              <Text style={[styles.cell, { width: '20%' }]}>{c.count}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>Internal — Tenant Relation · tanpa data PIC</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuplikan Feedback (maks 30)</Text>
          {a.feedback.length === 0 ? (
            <Text style={styles.cell}>Tidak ada feedback teks</Text>
          ) : (
            a.feedback.slice(0, 30).map((f) => (
              <View key={f.id} style={styles.feedbackItem}>
                <Text style={styles.feedbackGerai}>{f.gerai}</Text>
                <Text style={styles.feedbackText}>
                  {f.text.length > 280 ? `${f.text.slice(0, 280)}…` : f.text}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>Internal — Tenant Relation · tanpa data PIC</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
