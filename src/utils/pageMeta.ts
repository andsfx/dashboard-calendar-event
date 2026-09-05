import { useEffect } from 'react';

interface PageMetaOptions {
  title: string;
  description?: string;
}

function setMetaContent(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * usePageMeta — set document.title + meta description per halaman (client-side).
 * Untuk UX tab title / a11y; BUKAN untuk OG/crawler (crawler WA/FB tidak jalankan JS —
 * itu ditangani server-side di api/event-og.js). Restore nilai awal saat unmount.
 */
export function usePageMeta({ title, description }: PageMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    const descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDescription = descEl?.getAttribute('content') || '';

    document.title = title;
    if (description) setMetaContent('description', description);

    return () => {
      document.title = prevTitle;
      if (description) setMetaContent('description', prevDescription);
    };
  }, [title, description]);
}
