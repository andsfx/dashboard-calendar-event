import { describe, expect, it } from 'vitest';
import { ALBUM_SECTION_OPTIONS, SCHEDULE_SECTION_OPTIONS, SURVEY_SECTION_OPTIONS } from '../../components/pdf/pdfSectionOptions';
import { ALBUM_PDF_SECTIONS } from '../pdfExport';
import { SCHEDULE_PDF_SECTIONS } from '../../components/pdf/buildSchedulePdf';
import { SURVEY_PDF_SECTIONS } from '../../components/pdf/buildSurveyResultsPdf';

describe('pdfSectionOptions', () => {
  it('setiap opsi punya id yang dikenali builder-nya', () => {
    // Label UI dan builder harus sepakat: id yang tidak dikenal akan
    // menghasilkan PDF kosong tanpa peringatan apa pun.
    for (const option of SCHEDULE_SECTION_OPTIONS) {
      expect(SCHEDULE_PDF_SECTIONS).toContain(option.id);
    }
    for (const option of ALBUM_SECTION_OPTIONS) {
      expect(ALBUM_PDF_SECTIONS).toContain(option.id);
    }
    for (const option of SURVEY_SECTION_OPTIONS) {
      expect(SURVEY_PDF_SECTIONS).toContain(option.id);
    }
  });

  it('setiap bagian punya label dan keterangan', () => {
    for (const option of [...SCHEDULE_SECTION_OPTIONS, ...ALBUM_SECTION_OPTIONS, ...SURVEY_SECTION_OPTIONS]) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.hint?.length).toBeGreaterThan(0);
    }
  });
});
