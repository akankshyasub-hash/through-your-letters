import { useQuery } from '@tanstack/react-query';
import { getGallery } from '../lib/api';

export function useLetteringGallery(limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: ['letterings', limit, offset],
    queryFn: () => getGallery({ limit, offset }),
  });
}
