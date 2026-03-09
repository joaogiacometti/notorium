"use server";

import { revalidateImportedDataPaths } from "@/features/data-transfer/revalidation";
import {
  exportDataForUser,
  importDataForUser,
} from "@/features/data-transfer/service";
import type { ImportData } from "@/features/data-transfer/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import type { MutationResult } from "@/lib/server/api-contracts";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

interface ExportOptions {
  templateOnly?: boolean;
}

export async function exportData(
  options: ExportOptions = {},
): Promise<ImportData | ActionErrorResult> {
  const userId = await getAuthenticatedUserId();
  return exportDataForUser(userId, options);
}

export async function importData(
  raw: unknown,
): Promise<MutationResult & { imported?: number }> {
  const userId = await getAuthenticatedUserId();
  const result = await importDataForUser(userId, raw);
  if (result.success) {
    revalidateImportedDataPaths();
  }
  return result;
}
