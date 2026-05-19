import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { messages as catalogs } from "@seosh/shared/i18n";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

async function resolveLocale(): Promise<Locale> {
  // 1. Explicit cookie wins. LocaleSwitcher always sets this, and it lets
  //    demo users override their session-cached locale immediately
  //    (better-auth caches sessions for 5 min).
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  // 2. Persisted user preference for signed-in users.
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userLocale = (session?.user as { locale?: string } | undefined)?.locale;
    if (isLocale(userLocale)) return userLocale;
  } catch {
    // unauthenticated request — fall through
  }

  // 3. Accept-Language hint.
  const accept = (await headers()).get("accept-language") ?? "";
  if (/\bru\b/i.test(accept)) return "ru";
  if (/\ben\b/i.test(accept)) return "en";

  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: catalogs[locale],
  };
});
