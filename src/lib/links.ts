import * as WebBrowser from "expo-web-browser";
import { colors } from "../constants/theme";

const SERVER_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(
  /\/api\/?$/,
  "",
);

export const PRIVACY_URL = `${SERVER_URL}/privacy`;

export const openInApp = (url: string) =>
  WebBrowser.openBrowserAsync(url, {
    toolbarColor: colors.brand,
    controlsColor: colors.white,
  });

export const SUPPORT = {
  phone: "+923XXXXXXXXX", 
  whatsapp: "923XXXXXXXXX", 
  email: "your-real-email@gmail.com",
};