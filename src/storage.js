import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
const INDEX = 'infinity.profile.ids';
const PREFS = 'infinity.preferences.v1';
const options = {keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};
const key = id => `infinity.profile.${id}`;
export async function loadProfiles() {
  const ids = JSON.parse(await AsyncStorage.getItem(INDEX) || '[]');
  const results = await Promise.all(ids.map(async id => {
    const value = await SecureStore.getItemAsync(key(id));
    return value ? JSON.parse(value) : null;
  }));
  return results.filter(Boolean);
}
export async function saveProfile(profile, existing) {
  const p = {...profile,id:profile.id || Crypto.randomUUID()};
  if (encodeURIComponent(JSON.stringify(p)).replace(/%[A-F\d]{2}/gi, "x").length > 1900) throw new Error('بيانات المصدر طويلة جدًا للحفظ الآمن.');
  await SecureStore.setItemAsync(key(p.id), JSON.stringify(p), options);
  const next = [...existing.filter(x=>x.id!==p.id),p];
  try { await AsyncStorage.setItem(INDEX, JSON.stringify(next.map(x=>x.id))); }
  catch (e) { if (!profile.id) await SecureStore.deleteItemAsync(key(p.id)); throw e; }
  return next;
}
export async function deleteProfile(id, existing) {
  await SecureStore.deleteItemAsync(key(id));
  const next = existing.filter(x=>x.id!==id);
  await AsyncStorage.setItem(INDEX, JSON.stringify(next.map(x=>x.id)));
  await SecureStore.deleteItemAsync(`infinity.state.${id}`);
  return next;
}
// Favorites and viewing progress are kept encrypted too; partitioned by source.
export async function readState(id) {
  const value = await SecureStore.getItemAsync(`infinity.state.${id}`);
  try { return value ? JSON.parse(value) : {favorites:[],progress:{}}; } catch { return {favorites:[],progress:{}}; }
}
export async function writeState(id, state) {
  const value = JSON.stringify(state);
  if (encodeURIComponent(value).replace(/%[A-F\d]{2}/gi, "x").length > 1900) throw new Error('وصلت مساحة المفضلة والسجل لهذا المصدر إلى الحد المتاح. احذف بعض المفضلة أو امسح سجل المشاهدة.');
  await SecureStore.setItemAsync(`infinity.state.${id}`,value,options);
}
export async function itemKey(item) {
  return (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${item.kind}:${item.id}`)).slice(0,16);
}
export async function loadPrefs() { return JSON.parse(await AsyncStorage.getItem(PREFS) || '{"consented":false}'); }
export async function savePrefs(p) { await AsyncStorage.setItem(PREFS,JSON.stringify(p)); }
export async function clearAll(profiles) {
  for (const p of profiles) {
    await SecureStore.deleteItemAsync(key(p.id));
    await SecureStore.deleteItemAsync(`infinity.state.${p.id}`);
  }
  await AsyncStorage.multiRemove([INDEX,PREFS]);
}
