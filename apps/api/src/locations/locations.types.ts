import type { LocationSearchType } from './dto/search-locations.dto';

export type LocationSearchResult = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  state: string;
  location_type: LocationSearchType;
};

export type SearchLocationsInput = {
  type: LocationSearchType;
  q?: string;
  limit?: number;
};
