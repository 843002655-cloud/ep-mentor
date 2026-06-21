export const ECG_ACADEMY_PRODUCT = "ecg-academy";
export const EP_MENTOR_PRODUCT = "ep-mentor";

/** PostgREST: EP Mentor + legacy rows without product tag */
export const EP_MENTOR_CASES_OR_FILTER =
  `content_json->>product.is.null,content_json->>product.eq.${EP_MENTOR_PRODUCT}`;

export function getCaseProduct(
  contentJson: Record<string, unknown> | null | undefined
): string | null {
  const product = contentJson?.product;
  return typeof product === "string" && product.length > 0 ? product : null;
}

export function isEcgAcademyCase(
  contentJson: Record<string, unknown> | null | undefined
): boolean {
  return getCaseProduct(contentJson) === ECG_ACADEMY_PRODUCT;
}

export function isEpMentorCase(
  contentJson: Record<string, unknown> | null | undefined
): boolean {
  return !isEcgAcademyCase(contentJson);
}

export function withEpMentorProduct(
  contentJson: Record<string, unknown> | undefined
): Record<string, unknown> {
  return { ...contentJson, product: EP_MENTOR_PRODUCT };
}
