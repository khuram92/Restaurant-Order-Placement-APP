import * as Location from "expo-location";

export interface CurrentAddress {
  lat: number;
  lng: number;
  street?: string;
  area?: string;
  city?: string;
}


export async function getCurrentAddress(): Promise<CurrentAddress> {
  const { status, canAskAgain } =
    await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error(
      canAskAgain
        ? "Allow location access so we can check if the restaurant delivers to you"
        : "Location is blocked for this app. Turn it on in your phone's Settings → Apps.",
    );
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error("Turn on Location (GPS) on your phone and try again");
  }

  let pos: Location.LocationObject | null = null;
  try {
    pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch {
    pos = await Location.getLastKnownPositionAsync({
      maxAge: 10 * 60 * 1000, // up to 10 minutes old
      requiredAccuracy: 500, // within 500 m
    });
  }
  if (!pos) {
    throw new Error(
      "Couldn't find your location yet. Step outside or open Maps for a moment, then try again.",
    );
  }
  const result: CurrentAddress = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
  };

  
  try {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: result.lat,
      longitude: result.lng,
    });
    if (place) {
      const street = [place.name, place.street]
        .filter((p, i, all): p is string => !!p && all.indexOf(p) === i)
        .join(", ");
      const area = place.district ?? place.subregion;
      const city = place.city ?? place.region;
      if (street) result.street = street;
      if (area) result.area = area;
      if (city) result.city = city;
    }
  } catch {
    
  }

  return result;
}


/**
 * Quick position for "does this restaurant deliver to me?" checks.
 * ask = false → never shows a permission popup (silent, returns null instead).
 * Uses a recent known position first, so it's fast.
 */
export async function getQuickPosition(
  ask = false,
): Promise<{ lat: number; lng: number } | null> {
  const perm = ask
    ? await Location.requestForegroundPermissionsAsync()
    : await Location.getForegroundPermissionsAsync();
  if (perm.status !== "granted") return null;

  try {
    const pos =
      (await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000, // up to 5 minutes old
        requiredAccuracy: 1000, // within 1 km is fine for this check
      })) ??
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}