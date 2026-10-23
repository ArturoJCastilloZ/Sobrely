/** Endpoint liviano para el healthcheck del contenedor y del orquestador. */
export function GET() {
  return Response.json({ status: "ok" });
}
