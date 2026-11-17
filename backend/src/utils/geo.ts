/** Straight-line distance between two points in km (haversine) */
export const distanceKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) => {
  const R = 6371; // Earth radius, km
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** 2.345 → "2.3 km", 0.42 → "420 m" */
export const formatKm = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;