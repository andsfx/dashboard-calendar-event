/**
 * Mock `md-*` untuk jsdom.
 *
 * MD3 asli merender internalnya di shadow DOM dan butuh `ElementInternals`
 * (`setFormValue`) serta `adoptedStyleSheets` yang tidak disediakan jsdom —
 * sudah diverifikasi: merender `md-checkbox` asli melempar
 * `TypeError: this[internals].setFormValue is not a function`.
 *
 * Prinsip mock ini:
 * 1. Nama property **sama** dengan md asli, supaya React menulis property dan
 *    bukan attribute (heuristik React 19 untuk custom element).
 * 2. **Children React tidak pernah dipindahkan.** React merekonsiliasi children
 *    berdasarkan posisi; memindahkannya ke node lain menyebabkan
 *    `HierarchyRequestError`/`NotFoundError`. Karena itu elemen yang punya
 *    children React memakai host-nya sendiri sebagai kontrol aksesibel.
 * 3. Elemen yang di md punya kontrol fokus internal (text field, select,
 *    checkbox, switch, radio) merender kontrol native di light DOM, dan
 *    `aria-label` host didelegasikan ke kontrol itu (seperti `mixinDelegatesAria`
 *    milik md) supaya kueri label tidak menemukan dua elemen.
 *
 * Perilaku md sesungguhnya (shadow DOM, focus trap, animasi) diverifikasi di
 * Chromium lewat Playwright — bukan di sini.
 */

type PropType = 'boolean' | 'string' | 'number';
interface PropSpec {
  type: PropType;
  init?: unknown;
}

/**
 * `setupFiles` Vitest juga dijalankan untuk tes ber-environment `node` (mis. tes
 * rute server) yang tidak punya `HTMLElement`. Modul ini tetap boleh diimpor di
 * sana; `registerMdMockElements()` tidak pernah dipanggil tanpa `customElements`.
 * Karena itu basis class-nya diambil malas — bukan `extends HTMLElement`
 * langsung, yang akan melempar saat modul dievaluasi di Node.
 */
const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement);

class MdMockBase extends HTMLElementBase {
  /** @internal */
  _p: Record<string, unknown> = {};
  private _delegatedAriaLabel: string | null = null;

  connectedCallback(): void {
    this.mdSync();
  }

  /** @internal */
  _set(name: string, value: unknown): void {
    if (this._p[name] === value) return;
    this._p[name] = value;
    this.mdSync();
  }

  /** @internal */
  _get(name: string): unknown {
    return this._p[name];
  }

  /** @internal */
  _bool(name: string): boolean {
    return this._p[name] === true;
  }

  /** @internal */
  _str(name: string, fallback = ''): string {
    const value = this._p[name];
    return typeof value === 'string' ? value : value == null ? fallback : String(value);
  }

  /** @internal */
  _num(name: string, fallback = 0): number {
    const value = this._p[name];
    return typeof value === 'number' ? value : fallback;
  }

  /** `aria-label` host, tanpa mengubah apa pun. */
  protected _hostAriaLabel(): string | null {
    return this.getAttribute('aria-label');
  }

  /**
   * Tiru delegasi aria md: ambil `aria-label` dari host (lalu lepas dari host)
   * untuk dipasang di kontrol internal. Tanpa pelepasan, `getByLabelText` akan
   * menemukan dua elemen (host + kontrol) dan gagal dengan "multiple elements".
   */
  protected _takeAriaLabel(): string | null {
    const attr = this.getAttribute('aria-label');
    if (attr !== null) {
      this._delegatedAriaLabel = attr;
      this.removeAttribute('aria-label');
    }
    return this._delegatedAriaLabel;
  }

  /** Bangun/sinkronkan DOM. Dipanggil tiap property berubah dan saat connect. */
  mdSync(): void {
    // Turunan menimpanya; base hanya perlu versi no-op agar subclass anonim
    // yang dibuat `defineMock` tetap konkret.
  }
}

function defineMock(tag: string, propSpec: Record<string, PropSpec>, Base: { new (): MdMockBase }): void {
  if (customElements.get(tag)) return;
  // Satu konstruktor hanya boleh didaftarkan sekali, sementara beberapa tag
  // berbagi implementasi (mis. semua varian tombol). Tiap tag mendapat subclass
  // unik; property didefinisikan di prototype subclass tersebut.
  // Cast ke konstruktor konkret: TS menolak `extends` tipe abstrak, padahal
  // semua turunan di sini sudah mengimplementasikan `mdSync`.
  const ConcreteBase = Base as unknown as new () => MdMockBase;
  const impl = class extends ConcreteBase {};
  for (const name of Object.keys(propSpec)) {
    const key = `_${name}`;
    Object.defineProperty(impl.prototype, name, {
      configurable: true,
      get(this: MdMockBase): unknown {
        return this._get(key);
      },
      set(this: MdMockBase, value: unknown) {
        this._set(key, value);
      },
    });
  }
  customElements.define(tag, impl as unknown as CustomElementConstructor);
}

// ── Tombol (host sendiri = kontrol) ────────────────────────────────────────

const BUTTON_PROPS: Record<string, PropSpec> = {
  disabled: { type: 'boolean', init: false },
  type: { type: 'string', init: 'button' },
};

class MdButtonMock extends MdMockBase {
  /** @internal */
  private _submitBound = false;

  mdSync(): void {
    // Host menjadi tombolnya sendiri agar children React (teks label / ikon)
    // tetap di tempatnya dan menjadi accessible name-nya.
    this.setAttribute('role', 'button');
    // md asli me-reflect `disabled` ke atribut host (mixin form-associated:
    // `set disabled(v) { this.toggleAttribute('disabled', Boolean(v)) }`), dan
    // itulah yang dibaca `toBeDisabled()`/`toBeEnabled()`. `aria-disabled`
    // hanya dipakai md untuk keadaan *soft-disabled*.
    this.toggleAttribute('disabled', this._bool('_disabled'));
    const type = this._str('_type', 'button') || 'button';
    if (type !== 'button') this.setAttribute('type', type);
    else this.removeAttribute('type');

    // Paritas `mixinFormSubmitter` md: tombol `type="submit"` di dalam `<form>`
    // memicu submit saat diklik. `requestSubmit()` (bukan `form.submit()`) agar
    // validasi constraint ikut jalan, persis seperti tombol submit native.
    // Listener dipasang sekali: `mdSync` dipanggil ulang tiap property berubah.
    if (type === 'submit' && !this._submitBound) {
      this._submitBound = true;
      this.addEventListener('click', () => {
        if (this._bool('_disabled')) return;
        this.closest('form')?.requestSubmit();
      });
    }
  }
}

const ICON_BUTTON_PROPS: Record<string, PropSpec> = {
  disabled: { type: 'boolean', init: false },
  selected: { type: 'boolean', init: false },
  toggle: { type: 'boolean', init: false },
};

class MdIconButtonMock extends MdMockBase {
  mdSync(): void {
    this.setAttribute('role', 'button');
    // Sama seperti tombol: md me-reflect `disabled` ke atribut host.
    this.toggleAttribute('disabled', this._bool('_disabled'));
    // Paritas `md-icon-button` asli: `aria-pressed` HANYA dirender bila
    // `toggle` true (`ariaPressedValue = !this.toggle ? nothing : this.selected`).
    if (this._bool('_toggle')) this.setAttribute('aria-pressed', String(this._bool('_selected')));
    else this.removeAttribute('aria-pressed');
  }
}

// ── Text field ─────────────────────────────────────────────────────────────

let fieldSeq = 0;

class MdTextFieldMock extends MdMockBase {
  private _label: HTMLLabelElement | null = null;
  private _input: HTMLInputElement | HTMLTextAreaElement | null = null;
  private _error: HTMLDivElement | null = null;
  private _support: HTMLDivElement | null = null;

  mdSync(): void {
    if (!this._label) {
      const fieldId = this.id || `md-field-${++fieldSeq}`;
      const label = document.createElement('label');
      label.htmlFor = fieldId;
      const isArea = this._str('_type') === 'textarea';
      const input = isArea ? document.createElement('textarea') : document.createElement('input');
      input.id = fieldId;
      const error = document.createElement('div');
      const support = document.createElement('div');
      // `insertBefore(..., firstChild)` menjaga children React (bila ada) tetap
      // berurutan di ekor; text field tidak punya children React.
      this.insertBefore(label, this.firstChild);
      this.insertBefore(input, label.nextSibling);
      this.appendChild(error);
      this.appendChild(support);
      this._label = label;
      this._input = input;
      this._error = error;
      this._support = support;
      // md-text-field meneruskan `input` DAN `change` dari input internalnya
      // (lihat `redispatchEvent`/`handleInput`). Keduanya bubble dari input
      // light-DOM ke host, jadi cukup sinkronkan nilai — JANGAN dispatch ulang,
      // atau wrapper menerima dua event per aksi (md asli hanya sekali).
      const sync = (): void => {
        this._set('_value', input.value);
      };
      input.addEventListener('input', sync);
      input.addEventListener('change', sync);
    }

    const input = this._input as HTMLInputElement | HTMLTextAreaElement;
    const labelText = this._str('_label');
    this._label!.textContent = labelText;
    this._label!.hidden = labelText === '';
    const ariaLabel = this._takeAriaLabel();
    if (ariaLabel) input.setAttribute('aria-label', ariaLabel);
    else input.removeAttribute('aria-label');
    if (input instanceof HTMLTextAreaElement) {
      input.rows = this._num('_rows', 3);
    } else {
      input.type = this._str('_type', 'text') || 'text';
    }
    input.placeholder = this._str('_placeholder');
    input.disabled = this._bool('_disabled');
    input.readOnly = this._bool('_readOnly');
    input.required = this._bool('_required');
    const maxLength = this._p['_maxLength'];
    if (typeof maxLength === 'number') input.maxLength = maxLength;
    const nextValue = this._str('_value');
    if (input.value !== nextValue) input.value = nextValue;

    const errorText = this._str('_errorText');
    this._error!.textContent = this._bool('_error') ? errorText : '';
    this._error!.hidden = !this._bool('_error') || errorText === '';
    const supportingText = this._str('_supportingText');
    this._support!.textContent = this._bool('_error') ? '' : supportingText;
    this._support!.hidden = this._bool('_error') || supportingText === '';
  }
}

// ── Select ─────────────────────────────────────────────────────────────────

class MdSelectOptionMock extends MdMockBase {
  mdSync(): void {
    const parent = this.closest('md-outlined-select, md-filled-select') as MdSelectMock | null;
    parent?.mdSync();
  }
}

class MdSelectMock extends MdMockBase {
  private _select: HTMLSelectElement | null = null;
  private _label: HTMLLabelElement | null = null;

  mdSync(): void {
    if (!this._select) {
      const select = document.createElement('select');
      // `change` bubble dari <select> light-DOM ke host; dispatch ulang akan
      // membuat wrapper menerima dua event per perubahan.
      select.addEventListener('change', () => {
        this._set('_value', select.value);
      });
      const label = document.createElement('label');
      // Di depan, agar children React (md-select-option) tetap berurutan di ekor.
      this.insertBefore(label, this.firstChild);
      this.insertBefore(select, label.nextSibling);
      this._label = label;
      this._select = select;
    }
    const select = this._select;
    const label = this._label as HTMLLabelElement;
    const labelText = this._str('_label');
    label.textContent = labelText;
    label.hidden = labelText === '';
    if (labelText !== '') select.id = select.id || `${this.id || 'md-select'}-control`;
    if (select.id) label.htmlFor = select.id;
    const ariaLabel = this._takeAriaLabel();
    if (ariaLabel) select.setAttribute('aria-label', ariaLabel);
    else select.removeAttribute('aria-label');
    select.disabled = this._bool('_disabled');
    select.required = this._bool('_required');

    const options = Array.from(this.querySelectorAll('md-select-option')) as unknown as MdSelectOptionMock[];
    select.textContent = '';
    for (const option of options) {
      const item = document.createElement('option');
      item.value = option._str('_value');
      item.textContent = option.textContent ?? '';
      item.disabled = option._bool('_disabled');
      select.appendChild(item);
    }
    const nextValue = this._str('_value');
    if (select.value !== nextValue) select.value = nextValue;
  }
}

// ── Checkbox / switch / radio ──────────────────────────────────────────────

class MdCheckboxMock extends MdMockBase {
  private _input: HTMLInputElement | null = null;

  mdSync(): void {
    if (!this._input) {
      const input = document.createElement('input');
      input.type = 'checkbox';
      // `change` dari input light-DOM sudah bubble ke host; jangan
      // meng-dispatch ulang, atau listener wrapper menerima dua event per
      // klik (md-checkbox asli hanya sekali) dan handler toggle ganda.
      input.addEventListener('change', () => {
        this._set('_checked', input.checked);
      });
      this.insertBefore(input, this.firstChild);
      this._input = input;
    }
    const input = this._input;
    const ariaLabel = this._takeAriaLabel();
    if (ariaLabel) input.setAttribute('aria-label', ariaLabel);
    else input.removeAttribute('aria-label');
    const labelledBy = this.getAttribute('aria-labelledby');
    if (labelledBy) input.setAttribute('aria-labelledby', labelledBy);
    input.checked = this._bool('_checked');
    input.indeterminate = this._bool('_indeterminate');
    input.disabled = this._bool('_disabled');
  }
}

class MdSwitchMock extends MdMockBase {
  private _input: HTMLInputElement | null = null;

  mdSync(): void {
    if (!this._input) {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('role', 'switch');
      // `change` bubble ke host; dispatch ulang = dua event per klik.
      input.addEventListener('change', () => {
        this._set('_selected', input.checked);
      });
      this.insertBefore(input, this.firstChild);
      this._input = input;
    }
    const input = this._input;
    const ariaLabel = this._takeAriaLabel();
    if (ariaLabel) input.setAttribute('aria-label', ariaLabel);
    input.checked = this._bool('_selected');
    input.disabled = this._bool('_disabled');
  }
}

class MdRadioMock extends MdMockBase {
  private _input: HTMLInputElement | null = null;

  mdSync(): void {
    if (!this._input) {
      const input = document.createElement('input');
      input.type = 'radio';
      // `change` bubble ke host; dispatch ulang = dua event per perubahan.
      input.addEventListener('change', () => {
        this._set('_checked', input.checked);
      });
      this.insertBefore(input, this.firstChild);
      this._input = input;
    }
    const input = this._input;
    const ariaLabel = this._takeAriaLabel();
    if (ariaLabel) input.setAttribute('aria-label', ariaLabel);
    input.name = this.getAttribute('name') ?? '';
    input.value = this._str('_value');
    input.checked = this._bool('_checked');
    input.disabled = this._bool('_disabled');
  }
}

// ── Chip (host sendiri = kontrol) ──────────────────────────────────────────

class MdChipMock extends MdMockBase {
  private _label = '';
  private _labelNode: Text | null = null;
  private _removeClickBound = false;
  private _toggleClickBound = false;

  mdSync(): void {
    this.setAttribute('role', 'button');
    this.setAttribute('aria-pressed', String(this._bool('_selected')));
    // md-filter-chip asli merefleksikan `selected` ke attribute (reflect: true).
    if (this._bool('_selected')) this.setAttribute('selected', '');
    else this.removeAttribute('selected');
    if (this._bool('_disabled')) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
    // Chip removable: host = kontrol hapus (md asli punya tombol hapus internal).
    // Klik host teruskan event `remove` supaya tes berinteraksi tetap bekerja.
    if (this._bool('_removable') && !this._removeClickBound) {
      this._removeClickBound = true;
      this.addEventListener('click', () => {
        this.dispatchEvent(new Event('remove', { bubbles: true, composed: true }));
      });
    }
    // md-filter-chip asli men-toggle `selected` internalnya di jalur klik
    // (`chips/internal/filter-chip.js` → `handleClickOnChild`) SEBELUM
    // me-redispatch event dari host. Listener ini terpasang saat connect —
    // sebelum `useLayoutEffect` wrapper memasang listener-nya — jadi urutannya
    // sama dengan md asli. Tanpa tiruan ini, tes jsdom tidak bisa membuktikan
    // wrapper mengembalikan `selected` ke nilai prop. Chip `removable` tidak
    // men-toggle: kliknya aksi hapus (md memakai tombol hapus terpisah).
    if (!this._toggleClickBound) {
      this._toggleClickBound = true;
      this.addEventListener('click', () => {
        if (this._bool('_removable') || this._bool('_disabled')) return;
        this._set('_selected', !this._bool('_selected'));
      });
    }
    // Chip punya children React (mis. `<span slot="icon">` titik status dari
    // `MdChip.leadingIcon`) DAN label dari property `label`. Dulu label ditulis
    // lewat `textContent = label`, yang MENCABUT children React: React lalu
    // melempar NotFoundError saat melepas node yang sudah hilang. Sekarang label
    // ditulis sebagai text node milik mock ini, jadi children React tetap utuh.
    // Chip removable juga dapat `aria-label` dari wrapper → jangan dilepas.
    this._label = this._str('_label');
    if (this._label) {
      if (!this._labelNode) {
        this._labelNode = document.createTextNode('');
        this.appendChild(this._labelNode);
      }
      if (this._labelNode.data !== this._label) this._labelNode.data = this._label;
    }
  }
}

// ── Tabs (host sendiri = kontrol) ──────────────────────────────────────────

class MdPrimaryTabMock extends MdMockBase {
  mdSync(): void {
    this.setAttribute('role', 'tab');
    const active = this._bool('_active');
    if (active) this.setAttribute('active', '');
    else this.removeAttribute('active');
    this.setAttribute('aria-selected', String(active));
    if (!this._clickBound) {
      this._clickBound = true;
      this.addEventListener('click', () => {
        const tabs = this.closest('md-tabs') as MdTabsMock | null;
        tabs?.mdActivate(this);
      });
    }
  }

  private _clickBound = false;
}

class MdTabsMock extends MdMockBase {
  mdSync(): void {
    const index = this._num('_activeTabIndex', -1);
    this._tabs().forEach((tab, i) => tab._set('_active', i === index));
  }

  private _tabs(): MdPrimaryTabMock[] {
    return Array.from(this.querySelectorAll('md-primary-tab')) as unknown as MdPrimaryTabMock[];
  }

  mdActivate(tab: MdPrimaryTabMock): void {
    const index = this._tabs().indexOf(tab);
    if (index < 0) return;
    this._set('_activeTabIndex', index);
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }
}

// ── Progress ───────────────────────────────────────────────────────────────

class MdLinearProgressMock extends MdMockBase {
  mdSync(): void {
    let bar = this.querySelector('[role="progressbar"]') as HTMLDivElement | null;
    if (!bar) {
      bar = document.createElement('div');
      bar.setAttribute('role', 'progressbar');
      this.insertBefore(bar, this.firstChild);
    }
    const ariaLabel = this._takeAriaLabel();
    if (ariaLabel) bar.setAttribute('aria-label', ariaLabel);
    if (this._bool('_indeterminate')) bar.removeAttribute('aria-valuenow');
    else bar.setAttribute('aria-valuenow', String(this._num('_value')));
  }
}

class MdCircularProgressMock extends MdMockBase {
  mdSync(): void {
    let bar = this.querySelector('[role="progressbar"]') as HTMLDivElement | null;
    if (!bar) {
      bar = document.createElement('div');
      bar.setAttribute('role', 'progressbar');
      this.insertBefore(bar, this.firstChild);
    }
    const ariaLabel = this._takeAriaLabel();
    if (ariaLabel) bar.setAttribute('aria-label', ariaLabel);
    if (this._bool('_indeterminate')) bar.removeAttribute('aria-valuenow');
    else bar.setAttribute('aria-valuenow', String(this._num('_value')));
  }
}

// ── Dialog (host sendiri = dialog) ─────────────────────────────────────────

/** Stack dialog terbuka: Escape hanya menutup dialog teratas. */
const openDialogs: MdDialogMock[] = [];

/**
 * Dialog teratas = yang paling dalam (bersarang).
 *
 * React menjalankan effect dari anak ke induk, jadi dialog yang bersarang
 * terdaftar lebih dulu daripada induknya. Urutan pendaftaran karena itu tidak
 * bisa dipakai; yang menentukan adalah sarang DOM: dialog yang berada di dalam
 * dialog lain selalu di atasnya (sama seperti dialog konfirmasi di dalam modal
 * yang terbuka belakangan pada aplikasi nyata).
 */
function topMostDialog(): MdDialogMock | null {
  const innermost = openDialogs.filter(
    dialog => !openDialogs.some(other => other !== dialog && dialog.contains(other)),
  );
  return innermost[innermost.length - 1] ?? null;
}

class MdDialogMock extends MdMockBase {
  mdSync(): void {
    // Host menjadi elemen dialognya sendiri agar children React tetap di
    // tempatnya dan `within(dialog)` pada tes tetap menemukannya.
    this.setAttribute('role', this.getAttribute('type') === 'alert' ? 'alertdialog' : 'dialog');
    this.setAttribute('aria-modal', 'true');
    const labelledBy = this.getAttribute('aria-labelledby');
    if (labelledBy) this.setAttribute('aria-labelledby', labelledBy);
    else this.removeAttribute('aria-labelledby');
    if (this._bool('_open')) {
      this.setAttribute('open', '');
      this.removeAttribute('hidden');
    } else {
      this.removeAttribute('open');
      this.setAttribute('hidden', '');
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this._onKeyDown, true);
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this._onKeyDown, true);
    const index = openDialogs.indexOf(this);
    if (index >= 0) openDialogs.splice(index, 1);
  }

  private _onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    if (!this._bool('_open')) return;
    // hanya dialog teratas yang bereaksi (semantik <dialog> bertumpuk)
    if (topMostDialog() !== this) return;
    void this.close();
  };

  async show(): Promise<void> {
    if (!this._bool('_open')) {
      this._set('_open', true);
      openDialogs.push(this);
    }
  }

  async close(): Promise<void> {
    if (!this._bool('_open')) return;
    this._set('_open', false);
    const index = openDialogs.indexOf(this);
    if (index >= 0) openDialogs.splice(index, 1);
    // md asli menutup setelah animasi; tiru asinkronnya.
    setTimeout(() => {
      this.dispatchEvent(new Event('closed'));
    }, 0);
  }
}

// ── Registrasi ─────────────────────────────────────────────────────────────

export function registerMdMockElements(): void {
  defineMock('md-filled-button', BUTTON_PROPS, MdButtonMock);
  defineMock('md-outlined-button', BUTTON_PROPS, MdButtonMock);
  defineMock('md-text-button', BUTTON_PROPS, MdButtonMock);
  defineMock('md-elevated-button', BUTTON_PROPS, MdButtonMock);
  defineMock('md-filled-tonal-button', BUTTON_PROPS, MdButtonMock);

  defineMock('md-icon-button', ICON_BUTTON_PROPS, MdIconButtonMock);
  defineMock('md-filled-icon-button', ICON_BUTTON_PROPS, MdIconButtonMock);
  defineMock('md-outlined-icon-button', ICON_BUTTON_PROPS, MdIconButtonMock);

  const fieldProps: Record<string, PropSpec> = {
    value: { type: 'string', init: '' },
    label: { type: 'string', init: '' },
    placeholder: { type: 'string', init: '' },
    type: { type: 'string', init: 'text' },
    rows: { type: 'number', init: 3 },
    maxLength: { type: 'number' },
    error: { type: 'boolean', init: false },
    errorText: { type: 'string', init: '' },
    supportingText: { type: 'string', init: '' },
    required: { type: 'boolean', init: false },
    disabled: { type: 'boolean', init: false },
    readOnly: { type: 'boolean', init: false },
  };
  defineMock('md-outlined-text-field', fieldProps, MdTextFieldMock);
  defineMock('md-filled-text-field', fieldProps, MdTextFieldMock);

  const selectProps: Record<string, PropSpec> = {
    value: { type: 'string', init: '' },
    label: { type: 'string', init: '' },
    error: { type: 'boolean', init: false },
    errorText: { type: 'string', init: '' },
    supportingText: { type: 'string', init: '' },
    required: { type: 'boolean', init: false },
    disabled: { type: 'boolean', init: false },
  };
  defineMock('md-outlined-select', selectProps, MdSelectMock);
  defineMock('md-filled-select', selectProps, MdSelectMock);
  defineMock(
    'md-select-option',
    { value: { type: 'string', init: '' }, disabled: { type: 'boolean', init: false } },
    MdSelectOptionMock,
  );

  defineMock(
    'md-checkbox',
    {
      checked: { type: 'boolean', init: false },
      disabled: { type: 'boolean', init: false },
      indeterminate: { type: 'boolean', init: false },
    },
    MdCheckboxMock,
  );
  defineMock(
    'md-switch',
    { selected: { type: 'boolean', init: false }, disabled: { type: 'boolean', init: false } },
    MdSwitchMock,
  );
  defineMock(
    'md-radio',
    {
      checked: { type: 'boolean', init: false },
      disabled: { type: 'boolean', init: false },
      value: { type: 'string', init: '' },
    },
    MdRadioMock,
  );

  defineMock(
    'md-filter-chip',
    {
      label: { type: 'string', init: '' },
      selected: { type: 'boolean', init: false },
      removable: { type: 'boolean', init: false },
      disabled: { type: 'boolean', init: false },
    },
    MdChipMock,
  );

  defineMock('md-tabs', { activeTabIndex: { type: 'number', init: -1 } }, MdTabsMock);
  defineMock('md-primary-tab', { active: { type: 'boolean', init: false } }, MdPrimaryTabMock);

  defineMock(
    'md-linear-progress',
    { value: { type: 'number', init: 0 }, indeterminate: { type: 'boolean', init: false } },
    MdLinearProgressMock,
  );
  defineMock(
    'md-circular-progress',
    { value: { type: 'number', init: 0 }, indeterminate: { type: 'boolean', init: true } },
    MdCircularProgressMock,
  );

  defineMock('md-dialog', { open: { type: 'boolean', init: false } }, MdDialogMock);
}
