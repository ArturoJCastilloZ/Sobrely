import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Aviso de Privacidad",
  description:
    "Cómo Sobrely recaba, usa y protege tus datos personales al crear invitaciones digitales.",
};

const SUPPORT_EMAIL = "contacto@sobrely.com";

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Aviso de Privacidad"
      updated="11 de agosto de 2026"
      intro="En Sobrely respetamos tu privacidad. Este aviso explica qué datos recabamos, para qué los usamos y con quién los compartimos cuando creas y compartes invitaciones digitales."
    >
      <section>
        <h2>1. Responsable</h2>
        <p>
          Sobrely (&ldquo;nosotros&rdquo;) es responsable del tratamiento de los
          datos personales que se recaban a través de{" "}
          <a href="https://sobrely.com">sobrely.com</a>. Para cualquier duda
          sobre este aviso o el ejercicio de tus derechos, escríbenos a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>2. Datos que recabamos</h2>
        <ul>
          <li>
            <strong>De tu cuenta:</strong> nombre y correo electrónico al
            registrarte (por correo/contraseña o con Google).
          </li>
          <li>
            <strong>De tus invitaciones:</strong> el contenido que creas
            (títulos, fechas, textos, ubicaciones, imágenes y música que subes o
            enlazas).
          </li>
          <li>
            <strong>De tus invitados:</strong> los datos de confirmación (RSVP)
            que tus invitados envían, como su nombre, número de acompañantes y
            respuesta. Estos datos se recaban por tu cuenta y para ti.
          </li>
          <li>
            <strong>De pagos:</strong> cuando compras un plan, procesamos el pago
            a través de Mercado Pago. <strong>No almacenamos</strong> los datos
            de tu tarjeta; solo conservamos el estado y el identificador de la
            orden.
          </li>
          <li>
            <strong>De uso:</strong> métricas agregadas y anónimas de tráfico del
            sitio (analítica sin cookies de seguimiento).
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Para qué usamos tus datos</h2>
        <ul>
          <li>Crear tu cuenta y autenticarte.</li>
          <li>Guardar, publicar y mostrar tus invitaciones.</li>
          <li>Procesar tus pagos y activar los planes que compras.</li>
          <li>Darte soporte y responder tus solicitudes.</li>
          <li>Mejorar y mantener seguro el servicio.</li>
        </ul>
        <p>
          No vendemos tus datos personales ni los usamos para publicidad de
          terceros.
        </p>
      </section>

      <section>
        <h2>4. Con quién los compartimos (encargados)</h2>
        <p>
          Nos apoyamos en proveedores que tratan datos por nuestra cuenta y bajo
          medidas de seguridad:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — autenticación, base de datos y
            almacenamiento de imágenes.
          </li>
          <li>
            <strong>Mercado Pago</strong> — procesamiento de pagos.
          </li>
          <li>
            <strong>Vercel</strong> — hospedaje del sitio y analítica agregada
            sin cookies.
          </li>
          <li>
            <strong>Google</strong> — únicamente si eliges iniciar sesión con tu
            cuenta de Google.
          </li>
        </ul>
        <p>
          También podremos divulgar datos cuando la ley lo exija o para proteger
          nuestros derechos y los de nuestros usuarios.
        </p>
      </section>

      <section>
        <h2>5. Cookies</h2>
        <p>
          Usamos cookies estrictamente necesarias para mantener tu sesión
          iniciada. Nuestra analítica es agregada y no utiliza cookies de
          seguimiento ni perfilado publicitario.
        </p>
      </section>

      <section>
        <h2>6. Conservación</h2>
        <p>
          Conservamos tus datos mientras tengas una cuenta activa o mientras sean
          necesarios para prestarte el servicio y cumplir obligaciones legales.
          Las invitaciones publicadas dejan de mostrarse públicamente al vencer
          su vigencia. Puedes solicitar la eliminación de tu cuenta en cualquier
          momento.
        </p>
      </section>

      <section>
        <h2>7. Tus derechos</h2>
        <p>
          Tienes derecho a acceder, rectificar, cancelar u oponerte al
          tratamiento de tus datos (derechos ARCO), así como a revocar tu
          consentimiento. Para ejercerlos, escríbenos a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> y atenderemos tu
          solicitud conforme a la legislación aplicable en México.
        </p>
      </section>

      <section>
        <h2>8. Menores de edad</h2>
        <p>
          El servicio está dirigido a personas mayores de edad. No recabamos
          intencionalmente datos de menores sin el consentimiento de quien ejerce
          la patria potestad.
        </p>
      </section>

      <section>
        <h2>9. Cambios a este aviso</h2>
        <p>
          Podemos actualizar este aviso para reflejar cambios en el servicio o en
          la ley. Publicaremos la versión vigente en esta página con su fecha de
          actualización.
        </p>
      </section>
    </LegalPage>
  );
}
