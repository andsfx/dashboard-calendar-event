import * as React from 'react';

/**
 * Helper pembuat elemen `md-*`.
 *
 * Kenapa `createElement` + cast, bukan JSX intrinsic:
 * proyek ini tidak meng-augment `JSX.IntrinsicElements` dan tidak punya field
 * `types` di tsconfig, jadi `<md-*>` mentah tidak punya tipe. Satu cast
 * terlokalisasi di sini lebih baik daripada augmentation global.
 *
 * React 19 menulis prop ke DOM property bila property itu ada di instance
 * custom element, dan ke attribute bila tidak — perilaku yang tidak kami
 * andalkan: semua prop spesifik-md di wrapper di-set imperatif lewat ref
 * (lihat `useMdProps`), sehingga tidak bergantung pada heuristik React.
 */
export type MdHost = HTMLElement & Record<string, unknown>;

export function mdCreate(
  tag: string,
  props: Record<string, unknown> | null,
  ...children: React.ReactNode[]
): React.ReactElement {
  const create = React.createElement as unknown as (
    type: string,
    props?: Record<string, unknown> | null,
    ...children: React.ReactNode[]
  ) => React.ReactElement;
  // Wrapper md menulis `class`, bukan `className`, supaya tetap terbaca sebagai
  // atribut kustom-elemen. React 19 menyalurkan prop lewat heuristik
  // property-vs-attribute dan hanya mengenali `className`; `class` yang lolos
  // mentah diperlakukan sebagai atribut tak dikenal dan memicu
  // "Invalid DOM property 'class'". Keduanya berakhir sebagai attribute
  // `class` yang sama, jadi normalisasi di sini menghapus warning tanpa
  // mengubah DOM. `className` menang bila keduanya ada.
  let nextProps = props;
  if (props && 'class' in props) {
    const { class: classProp, ...rest } = props;
    nextProps = 'className' in rest ? rest : { ...rest, className: classProp };
  }
  return create(tag, nextProps, ...children);
}

/** Ref ke host `md-*`. */
export function useMdRef<T extends HTMLElement = MdHost>(): React.RefObject<T | null> {
  return React.useRef<T | null>(null);
}

/**
 * Pasang listener pada host `md-*`.
 *
 * Selalu `addEventListener` imperatif, tidak pernah prop `on*`: React 19
 * memperlakukan `on*` pada custom element secara ambigu (facebook/react#29659),
 * dan event md seperti `closed`/`remove` tidak punya padanan prop React.
 */
export function useMdEvent(
  ref: React.RefObject<HTMLElement | null>,
  type: string,
  handler: ((event: Event) => void) | undefined,
  enabled = true,
): void {
  // Handler & `enabled` disimpan di ref: pemanggil lazim menulis
  // `onClick={() => …}` (identitas baru tiap render), dan memasang ulang
  // listener tiap render hanya menambah churn.
  const handlerRef = React.useRef(handler);
  const enabledRef = React.useRef(enabled);
  handlerRef.current = handler;
  enabledRef.current = enabled;

  // `useLayoutEffect`, bukan `useEffect`: listener harus terpasang sinkron
  // dengan commit. Dengan effect pasif, commit yang terjadi di luar `act()`
  // (mis. state yang diset dari promise di dalam tes) menunda pemasangan
  // sampai flush berikutnya — jendela di mana elemen sudah ada di DOM tapi
  // belum menerima listener, sehingga klik sinkron hilang. Ini terukur
  // flaky pada `fireEvent.click` setelah `await findBy…`.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const listener = (event: Event): void => {
      if (!enabledRef.current) return;
      handlerRef.current?.(event);
    };
    el.addEventListener(type, listener);
    return () => el.removeEventListener(type, listener);
  }, [ref, type]);
}

/** Tulis DOM property ke host md; hanya bila nilainya berubah. */
export function useMdProps(
  ref: React.RefObject<HTMLElement | null>,
  props: Record<string, unknown>,
): void {
  React.useEffect(() => {
    const el = ref.current as MdHost | null;
    if (!el) return;
    for (const key of Object.keys(props)) {
      const next = props[key];
      if (next === undefined) continue;
      if (el[key] !== next) el[key] = next;
    }
  });
}

/** Teruskan `inputRef` (RefObject atau callback ref) ke host md. */
export function useForwardRef(
  ref: React.RefObject<HTMLElement | null>,
  target: React.Ref<HTMLElement> | undefined,
): void {
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !target) return undefined;
    if (typeof target === 'function') {
      target(el);
      return () => {
        target(null);
      };
    }
    const box = target as { current: HTMLElement | null };
    box.current = el;
    return () => {
      box.current = null;
    };
  }, [ref, target]);
}
