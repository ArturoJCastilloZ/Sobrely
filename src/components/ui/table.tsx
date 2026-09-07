import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Tabla.
 *
 * Había cuatro `<table>` crudos sin primitiva compartida, y tres de ellos
 * declaraban un `min-w-` DISTINTO (520, 640, 640) para el mismo problema: que
 * la tabla no se aplaste en móvil. El scroll horizontal se resuelve una vez,
 * aquí, en vez de tres veces con tres criterios.
 *
 * `Table` ya trae su propio contenedor con `overflow-x-auto`, así que no hay
 * que envolverla a mano — envolverla dos veces era el otro error repetido.
 */
function Table({ className, minWidth = "40rem", ...props }: React.ComponentProps<"table"> & { minWidth?: string }) {
  return (
    <div data-slot="table-container" className="w-full overflow-x-auto">
      <table
        data-slot="table"
        style={{ minWidth }}
        className={cn(
          "w-full caption-bottom text-[length:var(--ed-text-sm)]/(--ed-leading-sm) tracking-(--ed-tracking-sm)",
          className,
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />
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
      className={cn("border-t bg-muted/40 font-(--ed-weight-medium)", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors duration-(--ed-fast) hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
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
        "h-10 px-3 text-left align-middle text-[length:var(--ed-text-micro)]/(--ed-leading-micro) font-(--ed-weight-medium) tracking-(--ed-tracking-micro) text-muted-foreground whitespace-nowrap",
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td data-slot="table-cell" className={cn("px-3 py-2.5 align-middle", className)} {...props} />
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-3 text-[length:var(--ed-text-mini)] text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption }
