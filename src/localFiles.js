import * as FileSystem from 'expo-file-system/legacy';
import {localFilename} from './media.mjs';
const folder=()=>`${FileSystem.documentDirectory}videos/`;
export function fileUri(filename) {
  if(!/^[a-zA-Z0-9-]+\.[a-zA-Z0-9]{1,8}$/.test(filename)) throw new Error('اسم الملف غير صالح.');
  return folder()+filename;
}
export async function importVideo(asset,id) {
  const filename=localFilename(id,asset.name);
  await FileSystem.makeDirectoryAsync(folder(),{intermediates:true});
  const to=fileUri(filename);
  try {await FileSystem.copyAsync({from:asset.uri,to});}
  catch {await FileSystem.deleteAsync(to,{idempotent:true}).catch(()=>{});throw new Error('تعذّر نسخ الفيديو. تحقق من مساحة الجهاز وحاول مجددًا.');}
  return filename;
}
export async function removeVideo(filename) {await FileSystem.deleteAsync(fileUri(filename),{idempotent:true});}
export async function removeImportedVideos() {await FileSystem.deleteAsync(folder(),{idempotent:true});}
