import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de privacidad", description: "Qué datos usa Fierros y cómo.", alternates: { canonical: "/privacidad" } };

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
          Fierros no pide registrarse ni pide datos para navegarlo. Para entender qué se usa y detectar errores, mide visitas y, desde septiembre de 2026,
          también graba cómo se navega el sitio (sin ver lo que escribís). No vendemos ni compartimos esos datos con nadie más.
        </p>

        <h2>Medición de visitas</h2>
        <p>
          Usamos Vercel Web Analytics, que cuenta visitas y páginas vistas sin cookies y sin identificar a las personas: no guarda direcciones IP completas ni
          arma perfiles. Los datos se ven sólo en conjunto (por ejemplo, cuántas visitas tuvo el calendario en un día).
        </p>

        <h2>Análisis de uso y grabación de sesiones</h2>
        <p>
          Además usamos <a href="https://posthog.com/privacy" target="_blank" rel="noreferrer">PostHog</a>, con sus servidores en la Unión Europea, para
          entender cómo se usa el sitio: qué páginas se visitan, en qué se hace clic, mapas de calor y qué tan rápido carga cada página. Para eso, PostHog usa
          una cookie o un identificador guardado en tu navegador que no incluye tu nombre ni tu email.
        </p>
        <p>
          También graba sesiones de navegación (movimiento del mouse, clics y scroll) para ver dónde se traba la navegación. Por defecto, no graba lo que
          escribís en ningún campo: esos valores quedan ocultos. Fierros no tiene formularios ni pide datos personales, así que estas grabaciones no deberían
          contener información sensible.
        </p>
        <p>
          Por eso, al entrar por primera vez vas a ver un aviso para aceptar o rechazar estas cookies. Si rechazás, PostHog no se activa y el sitio funciona
          igual. Podés cambiar de opinión borrando los datos guardados del sitio en tu navegador, para que el aviso vuelva a aparecer.
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

        <h2>Contenido de otros sitios</h2>
        <p>
          Algunas páginas enlazan a videos de YouTube y a los tiempos en vivo de Speedhive (MYLAPS). Los enlaces se abren en otra pestaña. Los tiempos en
          vivo también se pueden ver dentro de Fierros: sólo se cargan si tocás &quot;Ver los tiempos acá&quot;, y desde ese momento Speedhive puede usar
          sus propias cookies, con su política de privacidad.
        </p>
        <p>
          Los resúmenes de las sesiones se ven con el reproductor de YouTube en modo sin cookies (youtube-nocookie.com). Antes de tocar play sólo se
          muestra una miniatura de la imagen del video; el reproductor de YouTube no se carga hasta ese momento. Al tocar play, YouTube recibe la visita
          y puede aplicar su propia política de privacidad.
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
          datos personales, en general no hay nada que borrar; igual podés escribir a{" "}
          <a href="mailto:contacto@somosfierros.ar">contacto@somosfierros.ar</a>. Ver también los <Link href="/terminos">Términos de uso</Link>.
        </p>
      </section>
    </>
  );
}
