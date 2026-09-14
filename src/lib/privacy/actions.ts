import { clearCommerceAnalytics } from "../analytics";
import { writeConsent } from "./store";

export function savePrivacyChoice(analytics: boolean) {
  const persisted = writeConsent(analytics);
  // Never remove the bag or security cookies when withdrawing measurement consent.
  if (!analytics) clearCommerceAnalytics();
  return persisted;
}
