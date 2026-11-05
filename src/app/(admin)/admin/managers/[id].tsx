// import { useCallback, useState, type ComponentProps, type ReactNode } from "react";
// import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
// import { Image } from "expo-image";
// import { Ionicons } from "@expo/vector-icons";
// import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import {
//   deleteManager,
//   getManager,
//   managerInitials,
//   managerName,
//   resetManagerPassword,
//   setManagerStatus,
// } from "../../../../services/adminManagerApi";
// import { getErrorMessage } from "../../../../lib/api";
// import { colors, cardShadow } from "../../../../constants/theme";
// import type { Manager } from "../../../../types/manager";

// type IconName = ComponentProps<typeof Ionicons>["name"];

// function Card({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
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

// function InfoRow({ icon, label, value, onPress }: { icon: IconName; label: string; value?: string; onPress?: () => void }) {
//   const content = (
//     <View className="flex-row items-center py-2">
//       <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
//         <Ionicons name={icon} size={18} color={colors.brand} />
//       </View>
//       <View className="ml-3 flex-1">
//         <Text className="text-xs text-brand-light">{label}</Text>
//         <Text className="text-base" style={{ color: value ? colors.text : colors.placeholder }}>
//           {value || "Not set"}
//         </Text>
//       </View>
//       {onPress && value && <Ionicons name="chevron-forward" size={18} color={colors.brandLight} />}
//     </View>
//   );
//   return onPress && value ? <Pressable onPress={onPress}>{content}</Pressable> : content;
// }

// function ActionButton({
//   icon,
//   label,
//   onPress,
//   busy,
//   danger,
// }: {
//   icon: IconName;
//   label: string;
//   onPress: () => void;
//   busy?: boolean;
//   danger?: boolean;
// }) {
//   const color = danger ? colors.danger : colors.brand;
//   return (
//     <Pressable
//       onPress={onPress}
//       disabled={busy}
//       className="mb-3 flex-row items-center justify-center rounded-2xl border-2 bg-white py-4"
//       style={{ borderColor: color, opacity: busy ? 0.6 : 1 }}
//     >
//       {busy ? (
//         <ActivityIndicator color={color} />
//       ) : (
//         <>
//           <Ionicons name={icon} size={18} color={color} />
//           <Text className="ml-2 text-base font-bold" style={{ color }}>
//             {label}
//           </Text>
//         </>
//       )}
//     </Pressable>
//   );
// }

// export default function ManagerDetailScreen() {
//   const { id } = useLocalSearchParams<{ id: string }>();
//   const insets = useSafeAreaInsets();

//   const [manager, setManager] = useState<Manager | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [busy, setBusy] = useState<"status" | "reset" | "delete" | null>(null);

//   const load = useCallback(async () => {
//     setError("");
//     try {
//       setManager(await getManager(id));
//     } catch (err) {
//       setError(getErrorMessage(err));
//     } finally {
//       setLoading(false);
//     }
//   }, [id]);

//   useFocusEffect(
//     useCallback(() => {
//       load();
//     }, [load])
//   );

//   // ---------- Actions ----------
//   const changeStatus = async (isActive: boolean) => {
//     if (!manager) return;
//     setBusy("status");
//     try {
//       const res = await setManagerStatus(manager._id, isActive);
//       setManager(res.manager);
//     } catch (err) {
//       Alert.alert("Couldn't change status", getErrorMessage(err));
//     } finally {
//       setBusy(null);
//     }
//   };

//   const onToggleActive = (next: boolean) => {
//     if (next) return changeStatus(true);
//     Alert.alert("Deactivate manager?", "They won't be able to log in until you activate them again.", [
//       { text: "Cancel", style: "cancel" },
//       { text: "Deactivate", style: "destructive", onPress: () => changeStatus(false) },
//     ]);
//   };

//   const onResetPassword = () => {
//     if (!manager) return;
//     Alert.alert(
//       "Reset password?",
//       `A new password will be emailed to ${manager.email}. Their old password stops working immediately.`,
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Reset",
//           onPress: async () => {
//             setBusy("reset");
//             try {
//               const res = await resetManagerPassword(manager._id);
//               if (res.emailSent) {
//                 Alert.alert("Password reset", `A new password was emailed to ${manager.email}.`);
//               } else {
//                 Alert.alert(
//                   "Password reset — email not sent",
//                   `Give this new password to the manager yourself:\n\n${res.temporaryPassword}\n\nIt won't be shown again.`
//                 );
//               }
//               load(); // shows "must change password" again
//             } catch (err) {
//               Alert.alert("Couldn't reset password", getErrorMessage(err));
//             } finally {
//               setBusy(null);
//             }
//           },
//         },
//       ]
//     );
//   };

//   const onDelete = () => {
//     if (!manager) return;
//     Alert.alert(
//       "Delete manager?",
//       `${managerName(manager)} will be removed permanently and can't log in anymore. ${
//         manager.restaurantId ? `${manager.restaurantId.name} will have no manager.` : ""
//       }`,
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             setBusy("delete");
//             try {
//               await deleteManager(manager._id);
//               router.back(); // the list reloads itself
//             } catch (err) {
//               setBusy(null);
//               Alert.alert("Couldn't delete", getErrorMessage(err));
//             }
//           },
//         },
//       ]
//     );
//   };

//   // ---------- Render ----------
//   const header = (
//     <Stack.Screen
//       options={{
//         title: manager ? managerName(manager) : "Manager",
//         headerRight: () =>
//           manager ? (
//             <Pressable
//               onPress={() => router.push({ pathname: "/admin/managers/edit/[id]", params: { id: manager._id } })}
//               hitSlop={8}
//               className="flex-row items-center"
//             >
//               <Ionicons name="create" size={20} color={colors.white} />
//               <Text className="ml-1 font-bold text-white">Edit</Text>
//             </Pressable>
//           ) : null,
//       }}
//     />
//   );

//   if (loading) {
//     return (
//       <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.mist }}>
//         {header}
//         <ActivityIndicator size="large" color={colors.brand} />
//       </View>
//     );
//   }

//   if (error || !manager) {
//     return (
//       <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.mist }}>
//         {header}
//         <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
//         <Text className="mt-3 text-center text-brand-dark">{error || "Manager not found"}</Text>
//         <Pressable
//           onPress={() => {
//             setLoading(true);
//             load();
//           }}
//           className="mt-4 rounded-2xl px-6 py-3"
//           style={{ backgroundColor: colors.brand }}
//         >
//           <Text className="font-bold text-white">Try again</Text>
//         </Pressable>
//       </View>
//     );
//   }

//   const m = manager;
//   const r = m.restaurantId;

//   return (
//     <View className="flex-1" style={{ backgroundColor: colors.mist }}>
//       {header}
//       <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }} showsVerticalScrollIndicator={false}>
//         {/* Profile */}
//         <View className="mb-4 items-center rounded-3xl bg-white p-6" style={cardShadow}>
//           <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: colors.brand }}>
//             {m.avatar ? (
//               <Image source={{ uri: m.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
//             ) : (
//               <Text className="text-3xl font-extrabold text-white">{managerInitials(m)}</Text>
//             )}
//           </View>
//           <Text className="mt-3 text-xl font-extrabold text-brand-dark">{managerName(m)}</Text>
//           <View className="mt-2 flex-row gap-2">
//             <View className="flex-row items-center rounded-full px-3 py-1" style={{ backgroundColor: m.isActive ? colors.brand : colors.mistDark }}>
//               <Ionicons name={m.isActive ? "checkmark-circle" : "close-circle"} size={12} color={colors.white} />
//               <Text className="ml-1 text-xs font-bold text-white">{m.isActive ? "Active" : "Inactive"}</Text>
//             </View>
//             {m.mustChangePassword && (
//               <View className="flex-row items-center rounded-full px-3 py-1" style={{ backgroundColor: colors.mistLight }}>
//                 <Ionicons name="time" size={12} color={colors.brandLight} />
//                 <Text className="ml-1 text-xs font-semibold text-brand-light">Hasn't set own password yet</Text>
//               </View>
//             )}
//           </View>
//         </View>

//         {/* Can log in */}
//         <View className="mb-4 flex-row items-center rounded-3xl bg-white p-4" style={cardShadow}>
//           <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: m.isActive ? colors.brand : colors.mistDark }}>
//             <Ionicons name="power" size={20} color={colors.white} />
//           </View>
//           <View className="ml-3 flex-1">
//             <Text className="text-base font-bold text-brand-dark">Can log in</Text>
//             <Text className="text-xs text-brand-light">{m.isActive ? "Has access to the restaurant" : "Access is blocked"}</Text>
//           </View>
//           {busy === "status" ? (
//             <ActivityIndicator color={colors.brand} />
//           ) : (
//             <Switch
//               value={m.isActive}
//               onValueChange={onToggleActive}
//               trackColor={{ false: colors.mistDark, true: colors.brandLight }}
//               thumbColor={m.isActive ? colors.brand : colors.white}
//             />
//           )}
//         </View>

//         {/* Restaurant */}
//         <Card title="Manages" icon="storefront">
//           {r ? (
//             <Pressable
//               onPress={() => router.push({ pathname: "/admin/restaurants/[id]", params: { id: r._id } })}
//               className="flex-row items-center rounded-2xl p-3"
//               style={{ backgroundColor: colors.mistLight }}
//             >
//               <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
//                 {r.logo ? (
//                   <Image source={{ uri: r.logo }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
//                 ) : (
//                   <Text className="font-extrabold text-brand">{r.name[0]?.toUpperCase()}</Text>
//                 )}
//               </View>
//               <View className="ml-3 flex-1">
//                 <Text className="text-base font-bold text-brand-dark">{r.name}</Text>
//                 <Text className="text-xs text-brand-light">
//                   {[r.address?.city, r.isActive ? "Active" : "Inactive"].filter(Boolean).join(" · ")}
//                 </Text>
//               </View>
//               <Ionicons name="chevron-forward" size={18} color={colors.brandLight} />
//             </Pressable>
//           ) : (
//             <Text className="text-brand-light">No restaurant assigned</Text>
//           )}
//         </Card>

//         {/* Contact */}
//         <Card title="Contact" icon="person">
//           <InfoRow icon="mail" label="Email (login)" value={m.email} onPress={() => Linking.openURL(`mailto:${m.email}`)} />
//           <InfoRow icon="call" label="Phone" value={m.phone} onPress={() => Linking.openURL(`tel:${m.phone}`)} />
//         </Card>

//         {/* Actions */}
//         <ActionButton icon="key" label="Reset password" onPress={onResetPassword} busy={busy === "reset"} />
//         <ActionButton icon="trash" label="Delete manager" onPress={onDelete} busy={busy === "delete"} danger />

//         <View className="flex-row items-center justify-center">
//           <Ionicons name="calendar" size={12} color={colors.brandLight} />
//           <Text className="ml-1 text-xs text-brand-light">
//             Added {new Date(m.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
//           </Text>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }