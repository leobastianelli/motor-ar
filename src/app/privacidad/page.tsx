import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de privacidad", description: "Qué datos usa Fierros y cómo." };

export default function PrivacyPage() {
  return (
    <>
      <section className="weekend-head">
        <h1>Política de privacidad</h1>
        <p className="lede">
          <span>Última actualización: septiembre de 2026</span>
        </p>
      </section>
      <section className="section-block legal">
        <h2>Resumen</h2>
        <p>
          Fierros no pide registrarse y no guarda datos personales de quienes lo visitan. Para saber qué páginas se usan más, mide visitas de forma agregada y
          anónima.
        </p>

        <h2>Medición de visitas</h2>
        <p>
          Usamos Vercel Web Analytics, que cuenta visitas y páginas vistas sin cookies y sin identificar a las personas: no guarda direcciones IP completas ni
          arma perfiles. Los datos se ven sólo en conjunto (por ejemplo, cuántas visitas tuvo el calendario en un día).
        </p>

        <h2>Alojamiento</h2>
        <p>
          El sitio está alojado en Vercel. Como cualquier servidor web, registra datos técnicos de cada pedido (fecha, página pedida, navegador) para operar y
          proteger el servicio. Ver la{" "}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
            política de privacidad de Vercel
          </a>
          .
        </p>

        <h2>Preferencias guardadas en tu navegador</h2>
        <p>Algunas elecciones, como un filtro de la agenda, pueden quedar guardadas sólo en tu navegador. No se envían a ningún servidor.</p>

        <h2>Publicidad</h2>
        <p>
          Hoy el sitio no muestra publicidad. Si en el futuro se incorpora publicidad que use cookies o datos de navegación, esta política se va a actualizar
          antes y, cuando corresponda, se va a pedir tu consentimiento.
        </p>

        <h2>Tus derechos y contacto</h2>
        <p>
          De acuerdo con la Ley 25.326 de Protección de Datos Personales, podés consultar, rectificar o pedir la eliminación de tus datos. Como Fierros no guarda
          datos personales, en general no hay nada que borrar; igual podés escribir a través de{" "}
          <a href="https://leobastianelli.dev" target="_blank" rel="noreferrer">
            leobastianelli.dev
          </a>
          . Ver también los <Link href="/terminos">Términos de uso</Link>.
        </p>
      </section>
    </>
  );
}
