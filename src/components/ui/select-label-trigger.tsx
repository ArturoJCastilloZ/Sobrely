import { SelectValue } from "@/components/ui/select";

/**
 * Etiqueta visible para un Select controlado.
 *
 * Base UI conserva el valor del enum dentro de `SelectValue`; pasarle una
 * función como hijo no lo formatea y deja escapar slugs internos. El valor se
 * mantiene oculto para accesibilidad y la etiqueta humana se pinta aquí.
 */
export function SelectLabelTrigger({ label }: { label: string }) {
  return (
    <>
      <SelectValue className="sr-only" />
      <span>{label}</span>
    </>
  );
}
