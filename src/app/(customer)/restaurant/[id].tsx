// import { Ionicons } from "@expo/vector-icons";
// import { Image } from "expo-image";
// import { router, useLocalSearchParams } from "expo-router";
// import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from "react";
// import {
//   ActivityIndicator,
//   Linking,
//   Modal,
//   Pressable,
//   RefreshControl,
//   ScrollView,
//   Text,
//   View,
// } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { cardShadow, colors } from "../../../constants/theme";
// import { getErrorMessage } from "../../../lib/api";
// import { getCustomerRestaurant } from "../../../services/restaurantApi";
// import type { CustomerRestaurant, Day, ServiceKey } from "../../../types/restaurant";

// type IconName = ComponentProps<typeof Ionicons>["name"];

// const DAY_LABELS: Record<Day, string> = {
//   mon: "Monday",
//   tue: "Tuesday",
//   wed: "Wednesday",
//   thu: "Thursday",
//   fri: "Friday",
//   sat: "Saturday",
//   sun: "Sunday",
// };

// // JavaScript's getDay(): 0 = Sunday
// const todayKey = (): Day => (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[new Date().getDay()]!;

// // "14:30" → "2:30 PM"
// const formatTime = (time: string) => {
//   const [h = 0, m = 0] = time.split(":").map(Number);
//   const suffix = h >= 12 ? "PM" : "AM";
//   return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
// };

// const money = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

// const SERVICES: { key: ServiceKey; label: string; icon: IconName }[] = [
//   { key: "dineIn", label: "Dine-in", icon: "restaurant" },
//   { key: "takeaway", label: "Takeaway", icon: "bag-handle" },
//   { key: "delivery", label: "Delivery", icon: "bicycle" },
// ];

// // ---------- Small UI pieces ----------
// function SheetSection({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
//   return (
//     <View className="mb-5">
//       <View className="mb-2 flex-row items-center">
//         <View
//           className="mr-2 h-8 w-8 items-center justify-center rounded-xl"
//           style={{ backgroundColor: colors.brandSoft }}>
//           <Ionicons name={icon} size={16} color={colors.brand} />
//         </View>
//         <Text className="text-base font-bold text-brand-dark">{title}</Text>
//       </View>
//       {children}
//     </View>
//   );
// }

// function InfoRow({
//   icon,
//   text,
//   action,
//   onPress,
// }: {
//   icon: IconName;
//   text: string;
//   action?: string;
//   onPress?: () => void;
// }) {
//   return (
//     <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-center py-2">
//       <Ionicons name={icon} size={16} color={colors.brandLight} />
//       <Text className="ml-3 flex-1 text-sm" style={{ color: colors.text }}>
//         {text}
//       </Text>
//       {!!action && <Text className="text-sm font-bold text-brand">{action}</Text>}
//     </Pressable>
//   );
// }

// // ---------- Info bottom sheet: order info, location, hours ----------
// function InfoSheet({
//   restaurant: r,
//   visible,
//   onClose,
// }: {
//   restaurant: CustomerRestaurant;
//   visible: boolean;
//   onClose: () => void;
// }) {
//   const insets = useSafeAreaInsets();
//   const today = todayKey();
//   const coords = r.location?.coordinates; // [lng, lat]
//   const address = [r.address.street, r.address.area, r.address.city].filter(Boolean).join(", ");
//   const hasOrderInfo = r.services.delivery || r.minOrder > 0 || r.taxRate > 0 || r.services.dineIn;

//   return (
//     <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
//       <View className="flex-1 justify-end">
//         {/* Dim background: tap to close */}
//         <Pressable className="absolute inset-0" style={{ backgroundColor: "rgba(44,51,41,0.45)" }} onPress={onClose} />

//         <View
//           className="max-h-[85%] rounded-t-3xl"
//           style={{ backgroundColor: colors.white, paddingBottom: insets.bottom + 12 }}>
//           {/* Handle + title */}
//           <View className="items-center pt-3">
//             <View className="h-1.5 w-12 rounded-full" style={{ backgroundColor: colors.mistDark }} />
//           </View>
//           <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
//             <Text className="flex-1 text-xl font-extrabold text-brand-dark" numberOfLines={1}>
//               {r.name}
//             </Text>
//             <Pressable
//               onPress={onClose}
//               hitSlop={8}
//               className="h-9 w-9 items-center justify-center rounded-full"
//               style={{ backgroundColor: colors.brandSoft }}>
//               <Ionicons name="close" size={20} color={colors.brand} />
//             </Pressable>
//           </View>

//           <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
//             {!!r.description && (
//               <Text className="mb-5 text-sm leading-5" style={{ color: colors.textMuted }}>
//                 {r.description}
//               </Text>
//             )}

//             {hasOrderInfo && (
//               <SheetSection title="Order info" icon="receipt">
//                 {r.services.delivery && (
//                   <>
//                     <InfoRow
//                       icon="bicycle"
//                       text={r.deliveryFee > 0 ? `Delivery fee ${money(r.deliveryFee)}` : "Free delivery"}
//                     />
//                     <InfoRow icon="navigate" text={`Delivers within ${r.deliveryRadiusKm} km`} />
//                   </>
//                 )}
//                 {r.minOrder > 0 && <InfoRow icon="cart" text={`Minimum order ${money(r.minOrder)}`} />}
//                 {r.taxRate > 0 && <InfoRow icon="calculator" text={`${r.taxRate}% tax added at checkout`} />}
//                 {r.services.dineIn && <InfoRow icon="people" text={`${r.seatingCapacity} seats for dine-in`} />}
//               </SheetSection>
//             )}

//             <SheetSection title="Location & contact" icon="location">
//               <InfoRow
//                 icon="map"
//                 text={address}
//                 {...(coords && {
//                   action: "Map",
//                   onPress: () =>
//                     Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords[1]},${coords[0]}`),
//                 })}
//               />
//               {!!r.phone && (
//                 <InfoRow icon="call" text={r.phone} action="Call" onPress={() => Linking.openURL(`tel:${r.phone}`)} />
//               )}
//             </SheetSection>

//             <SheetSection title="Opening hours" icon="time">
//               {r.openingHours.map((h) => {
//                 const isToday = h.day === today;
//                 return (
//                   <View
//                     key={h.day}
//                     className="mb-1 flex-row items-center justify-between rounded-xl px-3 py-2"
//                     style={{ backgroundColor: isToday ? colors.brandSoft : "transparent" }}>
//                     <Text className={`text-sm text-brand-dark ${isToday ? "font-bold" : ""}`}>
//                       {DAY_LABELS[h.day]}
//                       {isToday ? "  · Today" : ""}
//                     </Text>
//                     <Text className="text-sm" style={{ color: h.closed ? colors.danger : colors.text }}>
//                       {h.closed ? "Closed" : `${formatTime(h.open)} – ${formatTime(h.close)}`}
//                     </Text>
//                   </View>
//                 );
//               })}
//             </SheetSection>
//           </ScrollView>
//         </View>
//       </View>
//     </Modal>
//   );
// }

// // ---------- Screen ----------
// export default function CustomerRestaurantScreen() {
//   const { id } = useLocalSearchParams<{ id: string }>();
//   const insets = useSafeAreaInsets();

//   const [restaurant, setRestaurant] = useState<CustomerRestaurant | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState("");
//   const [infoOpen, setInfoOpen] = useState(false);

//   const load = useCallback(async () => {
//     setError("");
//     try {
//       setRestaurant(await getCustomerRestaurant(String(id)));
//     } catch (err) {
//       setError(getErrorMessage(err));
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [id]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   // Floating back button (over the cover image)
//   const backButton = (
//     <Pressable
//       onPress={() => router.back()}
//       hitSlop={8}
//       className="absolute left-4 h-10 w-10 items-center justify-center rounded-full"
//       style={{ top: insets.top + 8, backgroundColor: "rgba(59,70,56,0.75)" }}>
//       <Ionicons name="chevron-back" size={22} color={colors.white} />
//     </Pressable>
//   );

//   if (loading) {
//     return (
//       <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.mist }}>
//         <ActivityIndicator color={colors.brand} size="large" />
//       </View>
//     );
//   }

//   if (error || !restaurant) {
//     return (
//       <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.mist }}>
//         {backButton}
//         <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
//         <Text className="mt-3 text-center text-brand-dark">{error || "Restaurant not found"}</Text>
//         <Pressable
//           onPress={() => {
//             setLoading(true);
//             load();
//           }}
//           className="mt-4 rounded-2xl px-6 py-3"
//           style={{ backgroundColor: colors.brand }}>
//           <Text className="font-bold text-white">Try again</Text>
//         </Pressable>
//       </View>
//     );
//   }

//   const r = restaurant;
//   const todayHours = r.openingHours.find((h) => h.day === todayKey());
//   const services = SERVICES.filter((s) => r.services[s.key]);

//   const statusText = r.isOpenNow
//     ? todayHours && !todayHours.closed
//       ? `Open · closes ${formatTime(todayHours.close)}`
//       : "Open now"
//     : todayHours && !todayHours.closed
//       ? `Closed · opens ${formatTime(todayHours.open)}`
//       : "Closed today";

//   return (
//     <View className="flex-1" style={{ backgroundColor: colors.mist }}>
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         // Index 1 = the category bar: it sticks to the top while the menu scrolls
//         stickyHeaderIndices={[1]}
//         contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={() => {
//               setRefreshing(true);
//               load();
//             }}
//             tintColor={colors.brand}
//             colors={[colors.brand]}
//           />
//         }>
//         {/* [0] Cover + compact header */}
//         <View>
//           <View className="h-48 w-full" style={{ backgroundColor: colors.brandSoft }}>
//             {r.coverImage ? (
//               <Image source={{ uri: r.coverImage }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
//             ) : (
//               <View className="flex-1 items-center justify-center">
//                 <Ionicons name="restaurant" size={52} color={colors.brandLight} />
//               </View>
//             )}
//           </View>

//           <View className="-mt-10 mx-4 rounded-3xl bg-white p-4" style={cardShadow}>
//             <View className="flex-row items-center">
//               <View
//                 className="mr-3 h-14 w-14 items-center justify-center overflow-hidden rounded-2xl"
//                 style={{ backgroundColor: colors.brandSoft }}>
//                 {r.logo ? (
//                   <Image source={{ uri: r.logo }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
//                 ) : (
//                   <Text className="text-xl font-extrabold text-brand">{r.name[0]?.toUpperCase()}</Text>
//                 )}
//               </View>
//               <View className="flex-1">
//                 <Text className="text-lg font-extrabold text-brand-dark" numberOfLines={1}>
//                   {r.name}
//                 </Text>
//                 {r.cuisines.length > 0 && (
//                   <Text className="text-sm text-brand" numberOfLines={1}>
//                     {r.cuisines.join(" · ")}
//                   </Text>
//                 )}
//               </View>

//               {/* Info button → bottom sheet */}
//               <Pressable
//                 onPress={() => setInfoOpen(true)}
//                 hitSlop={8}
//                 className="ml-2 items-center rounded-2xl px-3 py-2"
//                 style={{ backgroundColor: colors.brandSoft }}>
//                 <Ionicons name="information-circle" size={20} color={colors.brand} />
//                 <Text className="text-[10px] font-bold text-brand">Info</Text>
//               </Pressable>
//             </View>

//             {/* Status + services in one row */}
//             <View className="mt-3 flex-row flex-wrap items-center gap-1.5">
//               <View
//                 className="flex-row items-center rounded-full px-2.5 py-1"
//                 style={{ backgroundColor: r.isOpenNow ? colors.brand : colors.text }}>
//                 <Ionicons name={r.isOpenNow ? "time" : "moon"} size={12} color={colors.white} />
//                 <Text className="ml-1 text-xs font-bold text-white">{statusText}</Text>
//               </View>
//               {services.map((s) => (
//                 <View
//                   key={s.key}
//                   className="flex-row items-center rounded-full px-2.5 py-1"
//                   style={{ backgroundColor: colors.brandSoft }}>
//                   <Ionicons name={s.icon} size={12} color={colors.brand} />
//                   <Text className="ml-1 text-xs font-semibold text-brand">{s.label}</Text>
//                 </View>
//               ))}
//             </View>
//           </View>
//         </View>

//         {/* [1] Sticky category bar (filled by the menu module) */}
//         <View className="mt-4 px-4 py-2" style={{ backgroundColor: colors.mist }}>
//           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
//             <View className="rounded-full px-4 py-2" style={{ backgroundColor: colors.brand }}>
//               <Text className="text-sm font-semibold text-white">Menu</Text>
//             </View>
//           </ScrollView>
//         </View>

//         {/* [2] Menu (items come in the menu module) */}
//         <View className="flex-1 px-4 pt-2">
//           <View className="items-center rounded-3xl bg-white px-6 py-12" style={cardShadow}>
//             <View
//               className="h-16 w-16 items-center justify-center rounded-2xl"
//               style={{ backgroundColor: colors.brandSoft }}>
//               <Ionicons name="fast-food" size={30} color={colors.brand} />
//             </View>
//             <Text className="mt-3 text-base font-bold text-brand-dark">Menu coming soon</Text>
//             <Text className="mt-1 text-center text-sm text-brand-light">
//               This restaurant hasn't added its menu yet. Tap Info for hours and location.
//             </Text>
//           </View>
//         </View>
//       </ScrollView>

//       {backButton}

//       <InfoSheet restaurant={r} visible={infoOpen} onClose={() => setInfoOpen(false)} />
//     </View>
//   );
// }