/**
 * Short curability / management hints for scan alert banners.
 * Primary signal is `category`; `label` reserved for future label-specific rules.
 */
export function getCurabilityHint(label: string, category: string): string {
  void label;
  if (category === "healthy") return "";
  switch (category) {
    case "fungal":
      return "May respond to fungicide treatment";
    case "bacterial":
      return "Bacterial infections can be managed with proper care";
    case "pest":
      return "Monitor and apply appropriate pest control";
    default:
      return "Consult a local agricultural expert";
  }
}
