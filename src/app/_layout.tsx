import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import "../../global.css";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack  />
    </AuthProvider>
  );
}

// screenOptions={{ headerShown: false }}