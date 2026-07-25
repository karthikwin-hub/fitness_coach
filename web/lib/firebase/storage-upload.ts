"use client";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getClientStorage, isFirebaseConfigured } from "@/lib/firebase/client";

export async function uploadMealPhoto(
  file: File,
  memberId: string,
): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(`dev://meal-photo/${memberId}/${Date.now()}-${file.name}`);
        reader.readAsDataURL(file);
      });
    }
    return null;
  }

  const storage = getClientStorage();
  if (!storage) return null;

  const path = `check-ins/${memberId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
