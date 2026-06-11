import AsyncStorage from "@react-native-async-storage/async-storage";

export async function loadValue(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function saveValue(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}
