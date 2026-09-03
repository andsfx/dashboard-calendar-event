import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { LetterRequestItem } from '../../types';

const BULAN_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const COLORS = {
  primary: '#1e293b',
  text: '#0f172a',
  muted: '#64748b',
  accent: '#0891b2',
  border: '#e2e8f0',
};

function formatTanggalSurat(value: string | undefined): string {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const day = parseInt(match[3] || '1', 10);
  const monthIndex = parseInt(match[2] || '1', 10) - 1;
  const year = match[1] || '';
  const monthName = BULAN_LONG[monthIndex] ?? '';
  return `${day} ${monthName} ${year}`;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 60,
    fontSize: 11,
    color: COLORS.text,
    fontFamily: 'Helvetica',
    lineHeight: 1.55,
  },

  // ── Kop Surat ───────────────────────────────────────────────
  kop: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  kopLogo: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.primary,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    textAlign: 'center',
    paddingTop: 14,
    marginRight: 16,
    borderRadius: 4,
  },
  kopTextWrap: { flex: 1 },
  kopTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  kopSubtitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: COLORS.text,
    marginTop: 2,
  },
  kopAddress: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 1.35,
  },

  // ── Metadata Surat ─────────────────────────────────────────
  metaBlock: {
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metaLabel: {
    width: 80,
    color: COLORS.muted,
    fontSize: 10,
  },
  metaSep: {
    width: 12,
    color: COLORS.muted,
    fontSize: 10,
  },
  metaValue: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
  },

  // ── Pembuka ─────────────────────────────────────────────────
  opening: {
    marginBottom: 14,
  },
  kepada: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  kepadaBlock: {
    marginBottom: 18,
  },
  kepadaName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  kepadaDetail: {
    fontSize: 10,
    color: COLORS.muted,
  },
  kepadaPhone: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },

  // ── Body ────────────────────────────────────────────────────
  bodyIntro: {
    marginBottom: 14,
  },
  bodyPara: {
    marginBottom: 12,
    textAlign: 'justify',
  },

  // ── Data Block ──────────────────────────────────────────────
  dataBlock: {
    marginVertical: 10,
    marginHorizontal: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dataLabel: {
    width: 150,
    fontSize: 10,
    color: COLORS.muted,
  },
  dataSep: {
    width: 8,
    fontSize: 10,
    color: COLORS.muted,
  },
  dataValue: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
  },
  dataSectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: COLORS.primary,
    marginBottom: 6,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  dataDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginVertical: 8,
  },

  // ── Penutup ─────────────────────────────────────────────────
  closing: {
    marginTop: 14,
    marginBottom: 24,
  },

  // ── Tanda Tangan ────────────────────────────────────────────
  signatureBlock: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  signatureCol: {
    width: 200,
    alignItems: 'center',
  },
  signatureTitle: {
    fontSize: 10,
    color: COLORS.muted,
  },
  signatureSpace: {
    height: 60,
  },
  signatureName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
    paddingTop: 4,
    width: 180,
    textAlign: 'center',
  },
  signatureJabatan: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },

  // ── Footer ──────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    right: 60,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
});

interface Props {
  letter: LetterRequestItem;
}

export function LetterDocument({ letter }: Props) {
  const tanggalFormatted = formatTanggalSurat(letter.tanggalSurat);

  return (
    <Document
      title={`Surat Konfirmasi Event - ${letter.namaEvent || 'Tanpa Judul'}`}
      author="Metropolitan Mall Bekasi"
      subject="Surat Konfirmasi Pelaksanaan Event"
    >
      <Page size="A4" style={styles.page}>
        {/* Kop Surat */}
        <View style={styles.kop}>
          <Text style={styles.kopLogo}>M</Text>
          <View style={styles.kopTextWrap}>
            <Text style={styles.kopTitle}>METROPOLITAN MALL BEKASI</Text>
            <Text style={styles.kopSubtitle}>Marketing &amp; Tenant Relations Division</Text>
            <Text style={styles.kopAddress}>
              Jl. KH. Noer Ali No.1, Pekayon Jaya, Bekasi Selatan{'\n'}
              Telp. (021) 8243 7000 · www.metropolitanmallbekasi.co.id
            </Text>
          </View>
        </View>

        {/* Metadata Surat */}
        <View style={styles.metaBlock}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Nomor</Text>
            <Text style={styles.metaSep}>:</Text>
            <Text style={styles.metaValue}>{letter.nomorSurat || '—'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tanggal</Text>
            <Text style={styles.metaSep}>:</Text>
            <Text style={styles.metaValue}>{tanggalFormatted || '—'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Perihal</Text>
            <Text style={styles.metaSep}>:</Text>
            <Text style={styles.metaValue}>
              Konfirmasi Pelaksanaan Event
            </Text>
          </View>
        </View>

        {/* Pembuka */}
        <View style={styles.kepadaBlock}>
          <Text style={styles.kepada}>Kepada Yth.</Text>
          <Text style={styles.kepadaName}>{letter.namaEO || '—'}</Text>
          {letter.penanggungJawab ? (
            <Text style={styles.kepadaDetail}>u.p. {letter.penanggungJawab}</Text>
          ) : null}
          {letter.alamatEO ? (
            <Text style={styles.kepadaDetail}>{letter.alamatEO}</Text>
          ) : null}
          {letter.nomorTelepon ? (
            <Text style={styles.kepadaPhone}>Telp. {letter.nomorTelepon}</Text>
          ) : null}
        </View>

        <View style={styles.bodyIntro}>
          <Text>Dengan hormat,</Text>
          <Text style={{ marginTop: 6 }}>
            Melalui surat ini kami sampaikan konfirmasi pelaksanaan event yang
            akan diselenggarakan di Metropolitan Mall Bekasi dengan rincian
            sebagai berikut:
          </Text>
        </View>

        {/* Detail Event */}
        <View style={styles.dataBlock}>
          <Text style={styles.dataSectionTitle}>DATA EVENT</Text>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Nama Event</Text>
            <Text style={styles.dataSep}>:</Text>
            <Text style={styles.dataValue}>{letter.namaEvent || '—'}</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Lokasi</Text>
            <Text style={styles.dataSep}>:</Text>
            <Text style={styles.dataValue}>{letter.lokasi || '—'}</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Hari/Tanggal</Text>
            <Text style={styles.dataSep}>:</Text>
            <Text style={styles.dataValue}>
              {letter.hariTanggalPelaksanaan || '—'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Waktu</Text>
            <Text style={styles.dataSep}>:</Text>
            <Text style={styles.dataValue}>
              {letter.waktuPelaksanaan || '—'}
            </Text>
          </View>

          {letter.hariTanggalLoading || letter.waktuLoading ? (
            <>
              <View style={styles.dataDivider} />
              <Text style={styles.dataSectionTitle}>JADWAL LOADING</Text>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Hari/Tanggal</Text>
                <Text style={styles.dataSep}>:</Text>
                <Text style={styles.dataValue}>
                  {letter.hariTanggalLoading || '—'}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Waktu</Text>
                <Text style={styles.dataSep}>:</Text>
                <Text style={styles.dataValue}>
                  {letter.waktuLoading || '—'}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.bodyPara}>
          <Text>
            Demikian surat konfirmasi ini kami sampaikan. Mohon agar seluruh
            persiapan dilakukan sesuai jadwal yang telah disepakati. Untuk
            koordinasi teknis lebih lanjut, dapat menghubungi Marketing
            Metropolitan Mall Bekasi pada nomor yang tertera di kop surat.
          </Text>
        </View>

        <View style={styles.closing}>
          <Text>Demikian, atas perhatian dan kerja samanya kami ucapkan terima kasih.</Text>
        </View>

        {/* Tanda Tangan */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureCol}>
            <Text style={styles.signatureTitle}>Hormat kami,</Text>
            <Text style={styles.signatureJabatan}>
              Marketing Manager
            </Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.signatureName}>
              {letter.penanggungJawab || '________________'}
            </Text>
            <Text style={styles.signatureJabatan}>
              Metropolitan Mall Bekasi
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Dokumen ini digenerate otomatis oleh Dashboard Event System ·{' '}
          {tanggalFormatted || new Date().toISOString().slice(0, 10)}
        </Text>
      </Page>
    </Document>
  );
}
