// import { Ionicons } from "@expo/vector-icons";
// import { router } from "expo-router";
// import { useState, type ReactNode } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
//   Pressable,
//   ScrollView,
//   Text,
//   TextInput,
//   View,
//   type KeyboardTypeOptions,
// } from "react-native";
// import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
// import { cardShadow, colors } from "../../constants/theme";
// import { useAuth } from "../../context/AuthContext";
// import { useCart } from "../../context/CartContext";
// import { getErrorMessage } from "../../lib/api";
// import { placeOrder } from "../../services/orderApi";
// import type { OrderType, PlaceOrderInput } from "../../types/order";
// import { money } from "../../utils/menuFormat";
// import { ORDER_TYPE_INFO } from "../../utils/orderFormat";

// const PK_PHONE = /^03\d{9}$/;
// const TYPE_HINT: Record<OrderType, string> = {
//   dineIn: "Eat at the restaurant",
//   takeaway: "Pick it up yourself",
//   delivery: "We bring it to you",
// };

// function Card({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: ReactNode }) {
//   return (
//     <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
//       <View className="mb-3 flex-row items-center">
//         <Ionicons name={icon} size={18} color={colors.brand} />
//         <Text className="ml-2 text-base font-bold text-brand-dark">{title}</Text>
//       </View>
//       {children}
//     </View>
//   );
// }

// function Field({
//   label,
//   value,
//   onChangeText,
//   placeholder,
//   keyboardType,
//   optional,
//   multiline,
//   maxLength,
// }: {
//   label: string;
//   value: string;
//   onChangeText: (t: string) => void;
//   placeholder: string;
//   keyboardType?: KeyboardTypeOptions;
//   optional?: boolean;
//   multiline?: boolean;
//   maxLength?: number;
// }) {
//   const [focused, setFocused] = useState(false);
//   return (
//     <View className="mb-3">
//       <View className="mb-1.5 flex-row justify-between">
//         <Text className="text-sm font-semibold text-brand-dark">{label}</Text>
//         {optional && <Text className="text-xs text-brand-light">Optional</Text>}
//       </View>
//       <TextInput
//         value={value}
//         onChangeText={onChangeText}
//         onFocus={() => setFocused(true)}
//         onBlur={() => setFocused(false)}
//         placeholder={placeholder}
//         placeholderTextColor={colors.placeholder}
//         keyboardType={keyboardType}
//         multiline={multiline}
//         maxLength={maxLength}
//         selectionColor={colors.brand}
//         className={`rounded-2xl border-2 px-4 py-3 text-base ${multiline ? "min-h-[64px]" : ""}`}
//         style={{
//           borderColor: focused ? colors.brand : colors.mistDark,
//           backgroundColor: focused ? colors.white : colors.mistLight,
//           color: colors.text,
//           textAlignVertical: multiline ? "top" : "center",
//         }}
//       />
//     </View>
//   );
// }

// export default function CheckoutScreen() {
//   const insets = useSafeAreaInsets();
//   const { user } = useAuth();
//   const { restaurant, lines, subtotal, clear } = useCart();

//   const available = (Object.keys(ORDER_TYPE_INFO) as OrderType[]).filter((t) => restaurant?.services[t]);
//   const [type, setType] = useState<OrderType>(available[0] ?? "takeaway");

//   // Delivery
//   const [street, setStreet] = useState("");
//   const [area, setArea] = useState("");
//   const [city, setCity] = useState("");
//   const [phone, setPhone] = useState(user?.phone ?? "");
//   const [instructions, setInstructions] = useState("");
//   // Dine-in
//   const [partySize, setPartySize] = useState(2);
//   // Order note
//   const [note, setNote] = useState("");

//   const [placing, setPlacing] = useState(false);
//   const [error, setError] = useState("");

//   if (!restaurant || lines.length === 0) {
//     return (
//       <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.mist }}>
//         <Ionicons name="cart" size={44} color={colors.brandLight} />
//         <Text className="mt-3 text-center text-brand-dark">Your cart is empty</Text>
//         <Pressable onPress={() => router.replace("/")} className="mt-4 rounded-2xl px-6 py-3" style={{ backgroundColor: colors.brand }}>
//           <Text className="font-bold text-white">Browse restaurants</Text>
//         </Pressable>
//       </View>
//     );
//   }

//   const tax = Math.round((subtotal * restaurant.taxRate) / 100);
//   const deliveryFee = type === "delivery" ? restaurant.deliveryFee : 0;
//   const total = subtotal + tax + deliveryFee;

//   const clearError = () => error && setError("");

//   const submit = async () => {
//     setError("");

//     if (type === "delivery") {
//       if (street.trim().length < 3) return setError("Enter your street / house address");
//       if (city.trim().length < 2) return setError("Enter your city");
//       if (!PK_PHONE.test(phone.trim())) return setError("Enter a phone number like 03001234567");
//     }

//     const input: PlaceOrderInput = {
//       restaurantId: restaurant._id,
//       type,
//       items: lines.map((l) => ({
//         itemId: l.itemId,
//         ...(l.sizeId && { sizeId: l.sizeId }),
//         addOnOptionIds: l.addOns.map((a) => a.optionId),
//         quantity: l.quantity,
//         ...(l.note && { note: l.note }),
//       })),
//       ...(note.trim() && { note: note.trim() }),
//     };
//     if (type === "delivery") {
//       input.delivery = {
//         street: street.trim(),
//         city: city.trim(),
//         phone: phone.trim(),
//         ...(area.trim() && { area: area.trim() }),
//         ...(instructions.trim() && { instructions: instructions.trim() }),
//       };
//     }
//     if (type === "dineIn") input.dineIn = { partySize };

//     setPlacing(true);
//     try {
//       const order = await placeOrder(input);
//       clear();
//       router.replace({ pathname: "/order/[id]", params: { id: order._id, placed: "1" } });
//     } catch (err) {
//       setPlacing(false);
//       const message = getErrorMessage(err);
//       // Menu changed since adding to cart: send them back to fix it
//       if (message.includes("cart") || message.includes("sold out") || message.includes("again")) {
//         Alert.alert("Please check your cart", message, [{ text: "OK", onPress: () => router.back() }]);
//       } else {
//         setError(message);
//       }
//     }
//   };

//   return (
//     <View className="flex-1" style={{ backgroundColor: colors.mist }}>
//       {/* Header */}
//       <View style={{ backgroundColor: colors.brand }}>
//         <SafeAreaView edges={["top"]}>
//           <View className="flex-row items-center px-4 pb-4 pt-2">
//             <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.brandDark }}>
//               <Ionicons name="chevron-back" size={22} color={colors.white} />
//             </Pressable>
//             <View className="ml-3 flex-1">
//               <Text className="text-xl font-extrabold text-white">Checkout</Text>
//               <Text className="text-xs" style={{ color: colors.brandSoft }} numberOfLines={1}>
//                 {restaurant.name}
//               </Text>
//             </View>
//           </View>
//         </SafeAreaView>
//       </View>

//       <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
//         <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 130 }} keyboardShouldPersistTaps="handled">
//           {/* 1. How */}
//           <Card title="How do you want it?" icon="options">
//             <View className="flex-row gap-2">
//               {(Object.keys(ORDER_TYPE_INFO) as OrderType[]).map((t) => {
//                 const offered = !!restaurant.services[t];
//                 const selected = t === type;
//                 return (
//                   <Pressable
//                     key={t}
//                     onPress={() => {
//                       setType(t);
//                       clearError();
//                     }}
//                     disabled={!offered}
//                     className="flex-1 items-center rounded-2xl border-2 px-1 py-3"
//                     style={{
//                       borderColor: selected ? colors.brand : colors.mist,
//                       backgroundColor: selected ? colors.brandSoft : colors.white,
//                       opacity: offered ? 1 : 0.4,
//                     }}>
//                     <Ionicons name={ORDER_TYPE_INFO[t].icon} size={24} color={selected ? colors.brand : colors.brandLight} />
//                     <Text className="mt-1 text-sm font-bold" style={{ color: selected ? colors.brandDark : colors.brandLight }}>
//                       {ORDER_TYPE_INFO[t].label}
//                     </Text>
//                     <Text className="text-center text-[10px] text-brand-light">{offered ? TYPE_HINT[t] : "Not offered"}</Text>
//                   </Pressable>
//                 );
//               })}
//             </View>
//           </Card>

//           {/* 2. Details for the chosen type */}
//           {type === "delivery" && (
//             <Card title="Delivery address" icon="location">
//               <Field label="Street / house" value={street} onChangeText={(t) => (setStreet(t), clearError())} placeholder="House 12, Street 5" maxLength={150} />
//               <View className="flex-row gap-3">
//                 <View className="flex-1">
//                   <Field label="Area" value={area} onChangeText={setArea} placeholder="Gulberg" optional maxLength={80} />
//                 </View>
//                 <View className="flex-1">
//                   <Field label="City" value={city} onChangeText={(t) => (setCity(t), clearError())} placeholder="Lahore" maxLength={60} />
//                 </View>
//               </View>
//               <Field
//                 label="Phone for the rider"
//                 value={phone}
//                 onChangeText={(t) => (setPhone(t.replace(/[^\d]/g, "")), clearError())}
//                 placeholder="03001234567"
//                 keyboardType="phone-pad"
//                 maxLength={11}
//               />
//               <Field label="Directions" value={instructions} onChangeText={setInstructions} placeholder="Near the blue gate" optional maxLength={200} />
//             </Card>
//           )}

//           {type === "dineIn" && (
//             <Card title="Table for" icon="people">
//               <View className="flex-row items-center justify-between">
//                 <Text className="text-sm text-brand-dark">How many people?</Text>
//                 <View className="flex-row items-center rounded-full px-1" style={{ backgroundColor: colors.mistLight }}>
//                   <Pressable onPress={() => setPartySize((n) => Math.max(1, n - 1))} disabled={partySize <= 1} hitSlop={6} style={{ opacity: partySize <= 1 ? 0.3 : 1 }}>
//                     <Ionicons name="remove-circle" size={32} color={colors.brand} />
//                   </Pressable>
//                   <Text className="mx-3 w-6 text-center text-lg font-extrabold text-brand-dark">{partySize}</Text>
//                   <Pressable onPress={() => setPartySize((n) => Math.min(20, n + 1))} disabled={partySize >= 20} hitSlop={6} style={{ opacity: partySize >= 20 ? 0.3 : 1 }}>
//                     <Ionicons name="add-circle" size={32} color={colors.brand} />
//                   </Pressable>
//                 </View>
//               </View>
//               <Text className="mt-2 text-xs text-brand-light">Your seats are held once the restaurant accepts the order.</Text>
//             </Card>
//           )}

//           {type === "takeaway" && (
//             <Card title="Pick up" icon="bag-handle">
//               <Text className="text-sm text-brand-dark">
//                 Collect your order from <Text className="font-bold">{restaurant.name}</Text>. We'll show when it's ready.
//               </Text>
//             </Card>
//           )}

//           {/* 3. Note */}
//           <Card title="Note for the restaurant" icon="chatbubble-ellipses">
//             <Field label="Note" value={note} onChangeText={setNote} placeholder="e.g. Please pack the sauces separately" optional multiline maxLength={300} />
//           </Card>

//           {/* 4. Payment */}
//           <Card title="Payment" icon="wallet">
//             <View className="flex-row items-center rounded-2xl border-2 px-4 py-3" style={{ borderColor: colors.brand, backgroundColor: colors.brandSoft }}>
//               <Ionicons name="cash" size={22} color={colors.brand} />
//               <View className="ml-3 flex-1">
//                 <Text className="text-base font-bold text-brand-dark">Cash</Text>
//                 <Text className="text-xs text-brand-light">
//                   {type === "delivery" ? "Pay the rider when it arrives" : "Pay at the restaurant"}
//                 </Text>
//               </View>
//               <Ionicons name="radio-button-on" size={22} color={colors.brand} />
//             </View>
//           </Card>

//           {/* 5. Bill */}
//           <Card title={`Bill · ${lines.reduce((s, l) => s + l.quantity, 0)} items`} icon="receipt">
//             {lines.map((l) => (
//               <View key={l.key} className="flex-row justify-between py-1">
//                 <Text className="flex-1 pr-3 text-sm text-brand-dark" numberOfLines={1}>
//                   {l.quantity} × {l.name}
//                   {l.sizeName ? ` (${l.sizeName})` : ""}
//                 </Text>
//                 <Text className="text-sm text-brand-dark">{money(l.unitPrice * l.quantity)}</Text>
//               </View>
//             ))}
//             <View className="mt-2 border-t pt-2" style={{ borderColor: colors.mist }}>
//               <View className="flex-row justify-between py-0.5">
//                 <Text className="text-sm text-brand-light">Subtotal</Text>
//                 <Text className="text-sm text-brand-dark">{money(subtotal)}</Text>
//               </View>
//               {restaurant.taxRate > 0 && (
//                 <View className="flex-row justify-between py-0.5">
//                   <Text className="text-sm text-brand-light">Tax ({restaurant.taxRate}%)</Text>
//                   <Text className="text-sm text-brand-dark">{money(tax)}</Text>
//                 </View>
//               )}
//               {type === "delivery" && (
//                 <View className="flex-row justify-between py-0.5">
//                   <Text className="text-sm text-brand-light">Delivery fee</Text>
//                   <Text className="text-sm text-brand-dark">{deliveryFee > 0 ? money(deliveryFee) : "Free"}</Text>
//                 </View>
//               )}
//               <View className="mt-1 flex-row justify-between">
//                 <Text className="text-lg font-extrabold text-brand-dark">Total</Text>
//                 <Text className="text-lg font-extrabold text-brand">{money(total)}</Text>
//               </View>
//             </View>
//           </Card>
//         </ScrollView>

//         {/* Place order */}
//         <View className="absolute bottom-0 left-0 right-0 px-4 pt-3" style={{ backgroundColor: colors.mist, paddingBottom: insets.bottom + 12 }}>
//           {!!error && (
//             <View className="mb-2 flex-row items-center rounded-xl bg-white px-3 py-2">
//               <Ionicons name="alert-circle" size={16} color={colors.danger} />
//               <Text className="ml-2 flex-1 text-sm" style={{ color: colors.danger }}>
//                 {error}
//               </Text>
//             </View>
//           )}
//           <Pressable
//             onPress={submit}
//             disabled={placing || available.length === 0}
//             className="flex-row items-center justify-between rounded-2xl px-5 py-4"
//             style={[cardShadow, { backgroundColor: placing ? colors.brandLight : colors.brand }]}>
//             {placing ? (
//               <View className="flex-1 items-center">
//                 <ActivityIndicator color={colors.white} />
//               </View>
//             ) : (
//               <>
//                 <Text className="text-base font-bold text-white">Place order</Text>
//                 <Text className="text-base font-extrabold text-white">{money(total)}</Text>
//               </>
//             )}
//           </Pressable>
//         </View>
//       </KeyboardAvoidingView>
//     </View>
//   );
// }