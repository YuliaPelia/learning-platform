import "server-only";

/** Налаштування магазинів з env. Усе необов'язкове: без ключів ендпоінти покупок відповідають 503. */
export const iapConfig = () => ({
  bundleId: process.env.IOS_BUNDLE_ID ?? "tech.itcodecraft.app",
  appleAppId: process.env.APPLE_APP_ID ? Number(process.env.APPLE_APP_ID) : undefined,
  packageName: process.env.ANDROID_PACKAGE ?? "tech.itcodecraft.app",
  googleServiceAccount: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON,
  /** Секрет в адресі webhook Google Pub/Sub (RTDN). */
  googleRtdnToken: process.env.GOOGLE_RTDN_TOKEN,
  /** Sandbox/тестові покупки приймаємо лише поза продакшеном або за явним прапорцем. */
  allowSandbox: process.env.NODE_ENV !== "production" || process.env.IAP_ALLOW_SANDBOX === "1",
});
