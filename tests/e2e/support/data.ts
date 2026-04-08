function getRunSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getPrefixedValue(scope: string, testTitle: string) {
  return `e2e-${scope}-${testTitle}-${getRunSuffix()}`;
}

export function getPrefixedEmail(localPart: string) {
  return `e2e-${localPart}@example.com`;
}
