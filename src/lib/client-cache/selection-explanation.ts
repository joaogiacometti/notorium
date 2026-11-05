import { queryOptions } from "@tanstack/react-query";
import type { ExplanationSelection } from "@/features/assistant/selection-explanation-contract";

/** The user-scoped QueryClient holds explanations only for this browser session. */
export function selectionExplanationQuery(selection: ExplanationSelection) {
  const input = { text: selection.text, context: selection.context };
  return queryOptions({
    queryKey: ["selection-explanation", input.text, input.context],
    queryFn: async ({ signal }) => {
      const { fetchSelectionExplanation } = await import(
        "@/lib/read-api/selection-explanation"
      );
      return fetchSelectionExplanation(input, signal);
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
