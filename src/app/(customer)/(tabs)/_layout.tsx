import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../constants/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Icon with a soft olive pill behind it when the tab is selected */
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View
      className="h-8 w-14 items-center justify-center rounded-full"
      style={{ backgroundColor: focused ? colors.brandSoft : "transparent" }}>
      <Ionicons name={name} size={22} color={focused ? colors.brand : colors.placeholder} />
    </View>
  );
}

export default function CustomerTabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700", marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 6,
          shadowColor: colors.brandDark,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        },
        sceneStyle: { backgroundColor: colors.mist },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "My bookings",
          tabBarIcon: ({ focused }) => <TabIcon name="receipt" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />
    </Tabs>
  );
}