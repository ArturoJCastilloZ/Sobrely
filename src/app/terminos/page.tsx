import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description:
    "Términos de uso del servicio de invitaciones digitales Sobrely: cuentas, pagos, contenido y responsabilidades.",
};

const SUPPORT_EMAIL = "soporte@sobrely.com";

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos y Condiciones"
      updated="11 de agosto de 2026"
      intro="Estos términos regulan el uso de Sobrely. Al crear una cuenta o usar el servicio, aceptas lo aquí descrito."
    >
      <section>
        <h2>1. El servicio</h2>
        <p>
          Sobrely es una plataforma para crear, personalizar, publicar y
          compartir invitaciones digitales (bodas, XV años, cumpleaños, eventos
          corporativos y similares), y para recibir confirmaciones de asistencia
          (RSVP).
        </p>
      </section>

      <section>
        <h2>2. Tu cuenta</h2>
        <ul>
          <li>Debes proporcionar información veraz y mantenerla actualizada.</li>
          <li>
            Eres responsable de la actividad de tu cuenta y de mantener segura tu
            contraseña.
          </li>
          <li>El servicio está dirigido a personas mayores de edad.</li>
        </ul>
      </section>

      <section>
        <h2>3. Planes y pagos</h2>
        <ul>
          <li>
            Puedes crear borradores y ver la vista previa sin costo. Publicar tu
            invitación como evento real requiere un plan de pago; publicar en modo
            demo es gratuito por tiempo limitado.
          </li>
          <li>
            El modelo es <strong>pago único por evento</strong> (no suscripción).
            Los precios se muestran en pesos mexicanos (MXN) e incluyen los
            impuestos aplicables cuando corresponda.
          </li>
          <li>
            Los pagos se procesan mediante <strong>Mercado Pago</strong>. Cada
            plan tiene una vigencia asociada al evento; al vencer, la invitación
            deja de mostrarse públicamente.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Reembolsos</h2>
        <p>
          Si solicitas y se aprueba un reembolso, este se procesa a través de
          Mercado Pago. Al reembolsarse una compra, el acceso al plan se revoca y
          la invitación asociada se despublica. Para solicitudes de reembolso
          escríbenos a <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>5. Tu contenido</h2>
        <p>
          Conservas la titularidad del contenido que subes (textos, imágenes,
          arte y música). Al usarlo en Sobrely nos otorgas una licencia limitada
          para alojarlo y mostrarlo con el fin de prestarte el servicio.
        </p>
        <p>
          <strong>Declaras y garantizas</strong> que cuentas con los derechos
          necesarios sobre el contenido que subes y que este no infringe derechos
          de autor, marcas ni otros derechos de terceros. Queda prohibido subir
          arte, personajes o marcas de terceros sin autorización. Te obligas a
          mantener en paz y a salvo (indemnizar) a Sobrely frente a cualquier
          reclamación derivada del contenido que publiques. Podremos retirar
          contenido que infrinja estos términos o ante un reclamo válido.
        </p>
      </section>

      <section>
        <h2>6. Uso aceptable</h2>
        <p>No debes usar el servicio para:</p>
        <ul>
          <li>Actividades ilícitas, fraudulentas o engañosas.</li>
          <li>Publicar contenido difamatorio, ofensivo o que infrinja derechos.</li>
          <li>
            Vulnerar la seguridad del servicio, acceder sin autorización o abusar
            de la infraestructura.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Propiedad intelectual de Sobrely</h2>
        <p>
          La marca, el logotipo, el diseño, los temas y el software de Sobrely son
          de nuestra propiedad o de nuestros licenciantes y están protegidos por
          las leyes aplicables. Los temas &ldquo;inspirados&rdquo; que ofrecemos
          son diseños genéricos originales; no representan ni se asocian con
          marcas o personajes de terceros.
        </p>
      </section>

      <section>
        <h2>8. Disponibilidad y garantías</h2>
        <p>
          El servicio se ofrece &ldquo;tal cual&rdquo;. Hacemos esfuerzos
          razonables por mantenerlo disponible y seguro, pero no garantizamos que
          sea ininterrumpido o libre de errores.
        </p>
      </section>

      <section>
        <h2>9. Limitación de responsabilidad</h2>
        <p>
          En la máxima medida permitida por la ley, Sobrely no será responsable
          por daños indirectos, incidentales o consecuentes derivados del uso o la
          imposibilidad de uso del servicio.
        </p>
      </section>

      <section>
        <h2>10. Terminación</h2>
        <p>
          Puedes dejar de usar el servicio y solicitar la eliminación de tu cuenta
          cuando quieras. Podremos suspender o cancelar cuentas que incumplan
          estos términos.
        </p>
      </section>

      <section>
        <h2>11. Ley aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.
          Cualquier controversia se someterá a los tribunales competentes en
          México.
        </p>
      </section>

      <section>
        <h2>12. Cambios</h2>
        <p>
          Podemos actualizar estos términos. Publicaremos la versión vigente en
          esta página con su fecha de actualización; el uso continuado del
          servicio implica su aceptación.
        </p>
      </section>
    </LegalPage>
  );
}
