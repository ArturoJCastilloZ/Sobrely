/**
 * Inserta datos estructurados (JSON-LD) para SEO / resultados enriquecidos.
 *
 * El JSON lo construimos NOSOTROS (no viene de entrada del usuario), por eso el
 * uso de dangerouslySetInnerHTML es seguro aquí — es el patrón recomendado por
 * Next.js para schema.org. Nunca pasar datos de usuario sin sanear.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  // Escapa `<` para que ningún valor pueda cerrar el <script> prematuramente.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
