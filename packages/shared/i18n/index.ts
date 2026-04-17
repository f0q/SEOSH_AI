/**
 * @module @seosh/shared/i18n
 * @description i18n message exports for SEOSH.AI
 */

import en from './en.json';
import ru from './ru.json';

export const messages = { en, ru } as const;
export type Locale = keyof typeof messages;
export const locales: Locale[] = ['en', 'ru'];
export const defaultLocale: Locale = 'en';

export { en, ru };
