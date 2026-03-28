import { getCurrentLanguage } from "./i18n.js";

export async function getAppConfig() {
  return {
    platform_name: "DTC",
    vertical_name: "Daycare Control",
    brand_display: "DTC (Daycare Control)",
    language: getCurrentLanguage(),
    currency: "USD"
  };
}