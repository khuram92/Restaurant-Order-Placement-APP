/**
 * App colors. Same values as tailwind.config.js, for places that need a
 * hex string in code (shadows, spinners, switches, pickers).
 */
export const colors = {
  brand: "#4e5c4a", // olive: buttons, headers, selected
  brandDark: "#3b4638", // pressed / headings
  brandLight: "#6f7d6a",
  brandSoft: "#e8ebe6", // very light olive fill
  mist: "#e0e1df", // screen background
  mistDark: "#c9cbc6", // borders
  mistLight: "#f0f1ef", // input background
  white: "#ffffff",
  text: "#2c3329",
  textMuted: "#6b7466",
  placeholder: "#4e5c4a",
  danger: "#b42318",
} as const;

export const cardShadow = {
  shadowColor: colors.brandDark,
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
