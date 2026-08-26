-- Fix status event stale: event bertanda 'upcoming' tapi tanggalnya sudah lewat.
-- date_str berformat ISO YYYY-MM-DD sehingga pembandingan leksikal aman.
UPDATE events SET status='past' WHERE status='upcoming' AND date_str < CURRENT_DATE;
