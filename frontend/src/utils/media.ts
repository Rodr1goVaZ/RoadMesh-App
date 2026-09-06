import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../api";

export async function pickPhoto(camera = false) {
  if (Platform.OS !== "web") {
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error("Autorize o acesso nas definições do telemóvel para adicionar fotografias.");
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: .7, allowsEditing: false };
  const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) throw new Error("A fotografia não pode exceder 10 MB.");
  return asset;
}

export async function uploadPhoto(asset: ImagePicker.ImagePickerAsset) {
  const form = new FormData();
  const name = asset.fileName || "fotografia.jpg";
  if (Platform.OS === "web") {
    form.append("file", await (await fetch(asset.uri)).blob(), name);
  } else {
    form.append("file", { uri: asset.uri, name, type: asset.mimeType || "image/jpeg" } as any);
  }
  return api.upload(form);
}