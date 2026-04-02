import { getE2EEmailPrefix } from "./env";

function getRunSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getPrefixedValue(scope: string, testTitle: string) {
  return `${getE2EEmailPrefix()}${scope}-${testTitle}-${getRunSuffix()}`;
}

export function getPrefixedEmail(localPart: string) {
  return `${getE2EEmailPrefix()}${localPart}@example.com`;
}
