import { z } from "zod";

function parse(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isWebUrl(value: string) {
  const url = parse(value);
  return !!url && (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname;
}

export function isLinkUrl(value: string) {
  if (isWebUrl(value)) return true;
  const url = parse(value);
  return !!url && (url.protocol === "mailto:" || url.protocol === "tel:") && url.pathname.length > 0;
}

export const webUrl = z.string().trim().max(2048).refine(isWebUrl, "Enter a link that starts with http:// or https://");
export const linkUrl = z.string().trim().max(2048).refine(isLinkUrl, "Enter a link that starts with http://, https://, mailto: or tel:");