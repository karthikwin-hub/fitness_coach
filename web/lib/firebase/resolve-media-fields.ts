import { resolvePlayableMediaUrl } from "@/lib/firebase/admin-storage";

export async function resolveOptionalMediaUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url?.trim()) return null;
  return resolvePlayableMediaUrl(url);
}

export async function resolveMediaFields<T extends Record<string, unknown>>(
  item: T,
  fields: (keyof T)[],
): Promise<T> {
  const next = { ...item };
  await Promise.all(
    fields.map(async (field) => {
      const value = item[field];
      if (typeof value === "string" && value.trim()) {
        next[field] = (await resolvePlayableMediaUrl(value)) as T[keyof T];
      }
    }),
  );
  return next;
}

export async function resolveMediaFieldsList<T extends Record<string, unknown>>(
  items: T[],
  fields: (keyof T)[],
): Promise<T[]> {
  return Promise.all(items.map((item) => resolveMediaFields(item, fields)));
}
