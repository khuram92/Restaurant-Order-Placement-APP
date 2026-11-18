export const deliveryFeeFor = (
  baseFee: number,
  perKm: number,
  distanceKm?: number,
) => {
  if (!perKm || distanceKm === undefined) return baseFee;
  return baseFee + perKm * Math.max(1, Math.ceil(distanceKm));
};