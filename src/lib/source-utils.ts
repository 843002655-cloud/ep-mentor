/**
 * Format a case source string for display by stripping common book prefixes/suffixes.
 * Used in case cards and detail pages to keep source lines concise.
 */
export function formatSource(source: string): string {
  return source
    .replace(/^Clinical Cases in Cardiac Electrophysiology:\s*/, "")
    .replace(/, Lucian Muresan \(ed\.\), Springer \d{4}/, "")
    .replace(/\. Cardiotext Publishing, \d{4}\./, "")
    .replace(/^Bogun FM\.\s*/, "");
}
