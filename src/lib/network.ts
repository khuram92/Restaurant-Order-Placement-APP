import { useNetInfo } from "@react-native-community/netinfo";


export const useIsOffline = () => {
  const { isConnected, isInternetReachable } = useNetInfo();
  return isConnected === false || isInternetReachable === false;
};