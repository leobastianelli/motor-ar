"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/**
 * Resumen de una sesión, con patrón "fachada": antes de tocar play sólo se pide la miniatura de YouTube
 * (i.ytimg.com); nada de youtube.com ni youtube-nocookie.com se carga hasta que la persona lo pide. Al tocar
 * play se reemplaza la miniatura por el reproductor sin cookies (youtube-nocookie.com).
 */
export function VideoSesion({ videoId, title, ariaLabel, duration, liveUrl }: { videoId: string; title: string; ariaLabel: string; duration?: string; liveUrl?: string }) {
  const [reproduciendo, setReproduciendo] = useState(false);
  return (
    <div className="video-sesion">
      <div className="video-sesion-frame">
        {reproduciendo ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button type="button" className="video-sesion-play" aria-label={ariaLabel} onClick={() => setReproduciendo(true)}>
            <Image src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" fill sizes="(max-width: 700px) 100vw, 640px" />
            <span className="video-sesion-icon" aria-hidden="true">
              <svg viewBox="0 0 68 48" width="68" height="48">
                <path d="M66.5 7.7c-.8-2.9-2.5-5.2-5.4-6C55.8 0 34 0 34 0S12.2 0 6.9 1.7C4 2.5 2.3 4.8 1.5 7.7 0 13 0 24 0 24s0 11 1.5 16.3c.8 2.9 2.5 5.2 5.4 6C12.2 48 34 48 34 48s21.8 0 27.1-1.7c2.9-.8 4.6-3.1 5.4-6C68 35 68 24 68 24s0-11-1.5-16.3z" />
                <path d="M27 34l18-10-18-10z" fill="var(--paper)" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <div className="video-sesion-meta">
        <strong>{title}</strong>
        {duration && <span>{duration}</span>}
      </div>
      <p className="video-sesion-links">
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">
          Ver en YouTube
        </a>
        {liveUrl && (
          <>
            {" · "}
            <a href={liveUrl} target="_blank" rel="noreferrer" data-evento="donde_ver" data-ev-lugar="video_sesion">
              Transmisión completa
            </a>
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Miniatura chica con play que lleva al ancla de la sesión en la fecha (no embebe nada acá: es sólo un enlace).
 * Se usa donde hay muchas sesiones en fila (home, listas) para no repetir un reproductor por cada una.
 */
export function VideoLinkThumb({ videoId, href, ariaLabel }: { videoId: string; href: string; ariaLabel: string }) {
  return (
    <Link href={href} className="video-mini" aria-label={ariaLabel}>
      <Image src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" fill sizes="64px" />
      <span className="video-mini-icon" aria-hidden="true">
        <svg viewBox="0 0 68 48" width="20" height="14">
          <path d="M66.5 7.7c-.8-2.9-2.5-5.2-5.4-6C55.8 0 34 0 34 0S12.2 0 6.9 1.7C4 2.5 2.3 4.8 1.5 7.7 0 13 0 24 0 24s0 11 1.5 16.3c.8 2.9 2.5 5.2 5.4 6C12.2 48 34 48 34 48s21.8 0 27.1-1.7c2.9-.8 4.6-3.1 5.4-6C68 35 68 24 68 24s0-11-1.5-16.3z" />
          <path d="M27 34l18-10-18-10z" fill="var(--paper)" />
        </svg>
      </span>
    </Link>
  );
}
