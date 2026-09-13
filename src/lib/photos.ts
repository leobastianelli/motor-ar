import photos from "@/data/photos.json";

// Fotos con licencia libre de Wikimedia Commons (scripts/fetch-photos.mjs). Cada una muestra su crédito.
export interface Photo {
  src: string;
  width: number;
  height: number;
  alt: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
}

export const getPhoto = (key: string): Photo | undefined => (photos as Record<string, Photo>)[key];
