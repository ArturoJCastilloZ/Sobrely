import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description:
    "Términos de uso del servicio de invitaciones digitales Sobrely: cuentas, pagos, contenido y responsabilidades.",
};

const SUPPORT_EMAIL = "contacto@sobrely.com";

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
          Cada plan se cobra por evento y el servicio se considera prestado
          cuando la invitación queda publicada y disponible para tus invitados.
          Sobre esa base aplican las siguientes reglas.
        </p>
        <ul>
          <li>
            <strong>Reembolso completo.</strong> Si lo solicitas dentro de los 7
            días naturales posteriores a la compra, siempre que falten más de 7
            días para la fecha del evento y la invitación no haya recibido
            confirmaciones de asistencia.
          </li>
          <li>
            <strong>Sin reembolso después del evento.</strong> Una vez ocurrida
            la fecha del evento, el servicio se prestó por completo y la compra
            no es reembolsable.
          </li>
          <li>
            <strong>Casos intermedios.</strong> Las solicitudes que no encajen en
            los supuestos anteriores se revisan caso por caso, considerando el
            uso que haya tenido la invitación.
          </li>
          <li>
            <strong>Falla atribuible a Sobrely.</strong> Si un problema técnico
            nuestro impide que la invitación funcione y no lo resolvemos en un
            plazo razonable, te reembolsamos el importe completo, sin importar
            los plazos anteriores.
          </li>
        </ul>
        <p>
          Para solicitar un reembolso escríbenos a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> indicando el
          correo de tu cuenta y la invitación de que se trata. Respondemos dentro
          de los 5 días hábiles siguientes.
        </p>
        <p>
          Los reembolsos se procesan a través de Mercado Pago y los tiempos de
          devolución dependen de tu método de pago y de tu banco. Al reembolsarse
          una compra, el acceso al plan se revoca y la invitación asociada se
          despublica de forma automática: deja de ser visible para tus invitados
          y los pases con código QR dejan de funcionar. Tu contenido no se
          elimina, vuelve a estado de borrador y permanece en tu cuenta.
        </p>
        <p>
          Estas reglas no limitan los derechos que la legislación aplicable en
          materia de protección al consumidor te reconozca.
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
