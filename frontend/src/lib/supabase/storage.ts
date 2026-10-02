import { supabase, isSupabaseConfigured } from "./client";

export const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "app-storage";

export interface StorageFileItem {
  id?: string | null;
  name: string;
  size?: number;
  created_at?: string | null;
  publicUrl?: string;
}

/**
 * Upload a file directly from the browser client to Supabase Storage
 */
export async function uploadFileToSupabase(
  file: File,
  folder: string = "uploads",
  bucket: string = DEFAULT_BUCKET
): Promise<{ path: string; publicUrl: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Please add credentials to .env.local");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * List files stored in a Supabase Storage bucket folder
 */
export async function listStorageFiles(
  folder: string = "uploads",
  bucket: string = DEFAULT_BUCKET
): Promise<StorageFileItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 50,
    offset: 0,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    console.error("Error listing Supabase files:", error);
    return [];
  }

  return (data || [])
    .filter((item) => item.name !== ".emptyFolderPlaceholder")
    .map((item) => {
      const fullPath = folder ? `${folder}/${item.name}` : item.name;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fullPath);
      return {
        id: item.id,
        name: item.name,
        size: item.metadata?.size,
        created_at: item.created_at,
        publicUrl: urlData.publicUrl,
      };
    });
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteStorageFile(
  filePath: string,
  bucket: string = DEFAULT_BUCKET
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) {
    console.error("Error deleting file:", error);
    return false;
  }
  return true;
}
