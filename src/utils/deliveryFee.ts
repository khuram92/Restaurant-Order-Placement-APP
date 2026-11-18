import { money } from "./menuFormat";

export const deliveryFeeFor = (
  baseFee: number,
  perKm: number,
  distanceKm?: number,
) => {
  if (!perKm || distanceKm === undefined) return baseFee;
  return baseFee + perKm * Math.max(1, Math.ceil(distanceKm));
};

export const deliveryFeeLabel = (baseFee: number, perKm = 0) => {
  if (!perKm) return baseFee > 0 ? money(baseFee) : "Free";
  return baseFee > 0
    ? `${money(baseFee)} + ${money(perKm)}/km`
    : `${money(perKm)}/km`;
};
