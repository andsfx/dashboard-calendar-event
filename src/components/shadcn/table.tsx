import * as React from "react"
import { cn } from "cn"

function Table({
  className,
  tableLabel,
  children,
  ...props
}: React.ComponentProps<"table"> & {
  /**
   * Nama tabel: dipakai dua kali — `<caption class="sr-only">` (nama aksesibel
   * tabel) dan `aria-label` pada wrapper scroll (`role="region"`). Satu sumber
   * teks supaya keduanya tidak pernah menyimpang.
   */
  tableLabel: string
}) {
  return (
    <div
      data-slot="table-container"
      /*
       * `overflow-y-clip` WAJIB berpasangan dengan `overflow-x-auto`: satu sumbu
       * `auto` memaksa sumbu lain ikut `auto`, sehingga div ini menjadi scrollport
       * terdekat untuk `sticky` di dalamnya. Karena tingginya = tinggi konten, div
       * ini tidak pernah menggulir vertikal, dan header tabel `sticky top-0`
       * (EventTable) ikut tergulir bersama isi pada scroller luar — terukur:
       * offset header −900px setelah region digulir 900px. Dengan `clip`, div
       * ini bukan scroll container di sumbu Y, jadi sticky kembali merujuk ke
       * scroller luar yang memang menggulir. Gulir horizontal tetap di sini.
       *
       * `role="region"` + `tabIndex={0}`: wrapper inilah yang menggulir
       * horizontal, dan tanpa keduanya pengguna keyboard tidak punya cara
       * memindahkan isi yang terpotong saat baris tidak berisi kontrol
       * fokusabel. Cincin fokus dijaga karena div fokusabel tanpa indikator
       * melanggar 2.4.7.
       */
      role="region"
      aria-label={tableLabel}
      tabIndex={0}
      className="relative w-full overflow-x-auto overflow-y-clip focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--wf-accent)] focus-visible:outline-none"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      >
        <caption className="sr-only">{tableLabel}</caption>
        {children}
      </table>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
