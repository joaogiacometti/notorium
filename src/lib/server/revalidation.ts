import { revalidatePath } from "next/cache";

export function revalidatePaths(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
}
