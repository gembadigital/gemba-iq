// Preserve explicitly entered customer names, but never use an internal
// preparer/account owner as the customer signatory through an auto-fill fallback.
export function resolveCustomerContactName(name: string, internalNames: string[], registeredName = ""): string {
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
  const internal = new Set(internalNames.map(normalize).filter(Boolean));
  if (!internal.has(normalize(name))) return name.trim();
  return registeredName.trim() && !internal.has(normalize(registeredName)) ? registeredName.trim() : "";
}
