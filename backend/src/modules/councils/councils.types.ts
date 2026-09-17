export interface CouncilRow {
  id: string;
  name: string;
  region: string;
  division: string;
  address: string | null;
  contact_phone: string | null;
  is_active: boolean;
  longitude: number;
  latitude: number;
  distance_m?: number; // present only on nearest-council query results
}

export interface PublicCouncil {
  id: string;
  name: string;
  region: string;
  division: string;
  address: string | null;
  contactPhone: string | null;
  longitude: number;
  latitude: number;
  distanceMeters?: number;
}

export function toPublicCouncil(row: CouncilRow): PublicCouncil {
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    division: row.division,
    address: row.address,
    contactPhone: row.contact_phone,
    longitude: row.longitude,
    latitude: row.latitude,
    ...(row.distance_m !== undefined ? { distanceMeters: Math.round(row.distance_m) } : {})
  };
}
