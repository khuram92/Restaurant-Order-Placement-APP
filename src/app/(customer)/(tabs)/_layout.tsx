import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../constants/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function TabItem({ name, label, focused }: { name: IconName; label: string; focused: boolean }) {
  return (
    <View
      className="items-center justify-center rounded-2xl px-3 py-2"
      style={{ minWidth: 88, backgroundColor: focused ? colors.brand : "transparent" }}>
      <Ionicons name={name} size={22} color={focused ? colors.white : colors.placeholder} />
      <Text
        className={`mt-0.5 text-xs ${focused ? "font-extrabold" : "font-semibold"}`}
        style={{ color: focused ? colors.white : colors.placeholder }}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function CustomerTabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // the title is drawn inside the pill instead
        tabBarItemStyle: { alignItems: "center", justifyContent: "center" },
        tabBarIconStyle: { width: "100%", height: "100%" },
        tabBarStyle: {
          backgroundColor: colors.mistLight,
          borderTopWidth: 0,
          height: 72 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
          shadowColor: colors.brandDark,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        },
        sceneStyle: { backgroundColor: colors.mistDark },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabItem name="home" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "My bookings",
          tabBarIcon: ({ focused }) => <TabItem name="receipt" label="My bookings" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabItem name="person" label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}