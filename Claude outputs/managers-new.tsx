import { Alert, View } from "react-native";
import { Stack, router } from "expo-router";
import ManagerForm from "../../../../components/admin/ManagerForm";
import { createManager } from "../../../../services/adminManagerApi";
import { getErrorMessage } from "../../../../lib/api";
import { colors } from "../../../../constants/theme";
import type { ManagerInput } from "../../../../types/manager";

export default function NewManagerScreen() {
  const handleCreate = async (input: ManagerInput) => {
    try {
      const res = await createManager(input);
      const openDetails = () =>
        router.replace({ pathname: "/admin/managers/[id]", params: { id: res.manager._id } });

      if (res.emailSent) {
        Alert.alert("Manager added", `Login details were emailed to ${res.manager.email}.`, [
          { text: "OK", onPress: openDetails },
        ]);
      } else {
        // Email failed: show the password once so the admin can pass it on
        Alert.alert(
          "Manager added — email not sent",
          `Give these login details to the manager yourself:\n\nEmail: ${res.manager.email}\nPassword: ${res.temporaryPassword}\n\nThis password won't be shown again.`,
          [{ text: "I've noted it", onPress: openDetails }]
        );
      }
    } catch (err) {
      return getErrorMessage(err);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: "New manager" }} />
      <ManagerForm
        submitLabel="Create manager"
        note="A password is generated and emailed to the manager. They'll be asked to change it the first time they log in."
        onSubmit={handleCreate}
      />
    </View>
  );
}
