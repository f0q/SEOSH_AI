# SEOSH.AI — Billing

Биллинг SEOSH.AI — модульный. Любой платёжный провайдер подключается через
интерфейс `BillingProvider`, регистрируется в реестре и активируется через
админку. Из коробки доступны:

| Slug             | Что это                              | Принимает деньги? |
|------------------|--------------------------------------|-------------------|
| `yookassa`       | ЮKassa (kassa.yookassa.ru), карты/SBP/банки | ✅ |
| `manual_invoice` | Безналичный счёт, токены кредит вручную | ❌ (админ) |

---

## Поток оплаты

```
Пользователь   /billing  →  «Купить» (tariff × provider)
                  │
                  ├─ billing.createPayment        ─►  Payment row (PENDING)
                  │                                   └─ provider.createPayment
                  │                                       returns confirmationUrl
                  │
                  └─ window.location = confirmationUrl
                                                      │
                                                      ▼
                              Хостовая страница провайдера
                                                      │
                                          провайдер  │  webhook
                                                      ▼
                                  /api/payments/yookassa/webhook
                                                      │
                                       paymentService.applyProviderUpdate
                                                      │
                                                      ▼
                                    Payment SUCCEEDED + tokens credited
```

Пользователь возвращается на `/billing/success?paymentId=…`. Эта страница
параллельно поллит `billing.getPayment` каждые 3с и форсирует один раз
`billing.refreshPayment` — это перепроверяет статус прямо у провайдера, на
случай если вебхук ещё не дошёл.

### Manual invoice flow

`/billing` → «Счёт на оплату» → редирект на `/billing/invoice/{id}`. Там
сгенерирована печатная страница со всеми реквизитами компании-получателя
(см. ниже). Пользователь оплачивает по реквизитам, присылает подтверждение
на email из реквизитов, админ в `/admin → Платежи` нажимает «Зачислить» —
вызывается `admin.markPaymentSucceeded`, которая идемпотентно кредит токены
через тот же `paymentService.applyProviderUpdate`.

---

## Настройка YooKassa

1. В ЛК ЮKassa получи **shopId** и **secretKey**
   (https://yookassa.ru/developers/using-api/interaction-format#auth).
2. На проде открой `https://seosh.aijam.pro/admin → Провайдеры → ЮKassa`:
   - `shopId` = идентификатор магазина
   - `secretKey` = секретный ключ
   - **Включён** ✓
   - Тестовый режим — для песочницы оставь, для боя выключи.
3. Установи в ЛК ЮKassa **HTTP-уведомления** на URL
   `https://seosh.aijam.pro/api/payments/yookassa/webhook`.
   Включи события `payment.succeeded`, `payment.canceled`, `payment.waiting_for_capture`.

Ключи в БД шифруются AES-256-GCM ключом из `ENCRYPTION_SECRET`. В UI они
никогда не возвращаются — только список имён.

---

## Тарифы (TokenPackage)

Тарифы создаются и редактируются в `/admin → Тарифы`. Поля:

| Поле          | Что                                                                  |
|---------------|----------------------------------------------------------------------|
| `slug`        | Уникальный идентификатор (`starter`, `pro`, `business`)              |
| `name`        | Название, видимое пользователю                                       |
| `description` | Короткое описание (≤ 1 строка)                                       |
| `tokens`      | Сколько токенов получает пользователь после оплаты                   |
| `priceRub`    | **В копейках**: для 490 ₽ ставь `49000`                              |
| `sortOrder`   | Меньшее значение = левее на странице                                 |
| `active`      | Виден ли в /billing                                                  |
| `highlighted` | Подсветить как «популярный» с золотой звёздочкой                     |

При первом деплое сидером создаются три тарифа: Starter / Pro / Business.

---

## Реквизиты компании-получателя

`/admin → Реквизиты`. Один singleton-ряд в таблице `company_details`.
Используется для генерации страницы `/billing/invoice/{id}`. Минимум,
который надо заполнить для работающего invoice flow:

- Юр. название, ИНН, ОГРН
- Юридический адрес
- Банк, расчётный счёт, корр. счёт, БИК
- Email для подтверждения оплаты

---

## Ручное начисление токенов

`/admin → Пользователи` → выбрать → ввести «Amount» + опц. причину → `Top Up`
или `Deduct`. Это создаёт `TokenTransaction` с reason `ADMIN_GRANT` или
`ADMIN_REVOKE`.

Под капотом — `tokenService.topUp(userId, amount, reason, details)`, та же
функция, что вызывается при успешной оплате (reason `PURCHASE`).

---

## ENV переменные

| Переменная             | Где используется            | Обязательная? |
|------------------------|------------------------------|---------------|
| `ENCRYPTION_SECRET`    | шифрование credentials       | да            |
| `NEXT_PUBLIC_APP_URL`  | webhook return_url           | да            |
| `ADMIN_SECRET`         | альтернативный admin-доступ через header | нет |

Никаких `YOOKASSA_*` env-переменных нет — credentials живут только в БД.

---

## Добавление нового провайдера

1. Создай `apps/web/src/server/services/billing/providers/<slug>.ts`
   с классом, реализующим `BillingProvider`:

```ts
export class MyProvider implements BillingProvider {
  readonly slug = "my_provider";
  readonly canCharge = true;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    // → запрос к API провайдера, вернуть externalId + confirmationUrl
  }

  async parseWebhook(input: VerifyWebhookInput): Promise<WebhookEvent> {
    // → верифицировать подпись, вернуть { externalId, status, rawPayload }
  }
}
```

2. Зарегистрируй фабрику в
   `apps/web/src/server/services/billing/registry.ts`:

```ts
const FACTORIES = {
  yookassa: (cfg) => new YooKassaProvider(cfg),
  my_provider: (cfg) => new MyProvider(cfg),
};
```

3. Добавь поля в `CREDENTIAL_FIELDS` в
   `apps/web/src/app/admin/ProvidersSection.tsx`.

4. Добавь ряд в `payment_provider_configs` (миграция или вручную):

```sql
INSERT INTO payment_provider_configs (id, slug, displayName, enabled, testMode, credentials, "updatedAt")
VALUES (gen_random_uuid()::text, 'my_provider', 'Мой провайдер', false, true, '{}', NOW());
```

5. Если у провайдера есть webhook — создай route handler
   `apps/web/src/app/api/payments/my_provider/webhook/route.ts` по аналогии
   с YooKassa.

Для типового хостового checkout этого хватит. Списания токенов и
идемпотентность не трогаются — это общий код в `paymentService.ts`.
