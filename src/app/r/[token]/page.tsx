import type { Metadata } from "next";

import { ReportGate } from "@/components/reports/report-gate";

type Params = { token: string };

/**
 * Reporte compartido, protegido por PIN.
 *
 * La página NO consulta nada con el token: se pinta el formulario y ya. Todo lo
 * que sabe del evento llega DESPUÉS de que el PIN acierta, por la server
 * action. Si la página cargara el título del evento para adornar el formulario,
 * el token solo bastaría para saber de qué boda se trata — y el PIN dejaría de
 * proteger la mitad de lo que protege.
 */
export const metadata: Metadata = {
  title: "Reporte del evento",
  description: "Cifras del evento. Requiere PIN.",
  // Una liga que se reenvía por WhatsApp no tiene por qué acabar en Google.
  robots: { index: false, follow: false },
};

export default async function ReportPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  return <ReportGate token={token} />;
}
