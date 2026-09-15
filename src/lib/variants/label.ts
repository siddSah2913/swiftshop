// Order-line snapshot name for variant products. The chosen option labels are
// baked into `OrderItem.name` ("Tee — Size M, Red") so analytics and the CSV
// export (both group by name) see each variant as its own row. Pure module.

export const VARIANT_NAME_SEPARATOR = " — ";

export function formatVariantName(name: string, optionNames: string[]): string {
  if (optionNames.length === 0) return name;
  return `${name}${VARIANT_NAME_SEPARATOR}${optionNames.join(", ")}`;
}