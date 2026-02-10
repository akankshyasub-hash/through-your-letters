import { API_BASE_URL } from '../constants';
import { Lettering } from '../types';

export interface GalleryResponse {
  letterings: Lettering[];
  total: number;
  limit: number;
  offset: number;
}

export async function getGallery({ limit, offset }: { limit: number; offset: number }): Promise<GalleryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/letterings?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error('Failed to fetch gallery');
  }
  return response.json();
}