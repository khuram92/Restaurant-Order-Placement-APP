import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "authToken";

export const saveToken = (token: string) =>
  SecureStore.setItemAsync(TOKEN_KEY, token);

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const removeToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);
