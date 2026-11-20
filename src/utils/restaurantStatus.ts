import { clockTime } from "./orderFormat";

export const backAtTime = (r: {
  isTemporarilyClosed?: boolean;
  reopensAt?: string | null;
}) => (r.isTemporarilyClosed && r.reopensAt ? clockTime(r.reopensAt) : null);
