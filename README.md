# ITCodeCraft — навчальна платформа

Онлайн-платформа IT-курсів для дітей 9–17 років: уроки крок за кроком, 2 безкоштовні уроки, домашки з нагадуваннями, рівні й бейджі, кабінети дитини та батьків, оплата підписки через WayForPay.

**Стек:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL · Drizzle ORM · сесії на JWT (jose) · Vitest.

---

## Запуск на своєму комп'ютері

### 1. Що встановити (один раз)
- [Node.js 22 LTS](https://nodejs.org) — перевір: `node -v`
- [PostgreSQL 16](https://www.postgresql.org/download/) — або через Docker (див. нижче)
- [VS Code](https://code.visualstudio.com) і [Git](https://git-scm.com)

### 2. База даних
Найпростіше — Docker:
```bash
docker run --name itc-db -e POSTGRES_USER=itc -e POSTGRES_PASSWORD=itc -e POSTGRES_DB=itcodecraft -p 5432:5432 -d postgres:16
```
Або в уже встановленому PostgreSQL створи користувача `itc` з паролем `itc` і базу `itcodecraft`.

### 3. Проєкт
```bash
npm install
cp .env.example .env.local     # на Windows: copy .env.example .env.local
```
Відкрий `.env.local` і встав у `SESSION_SECRET` випадковий рядок:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Таблиці та демо-дані
```bash
npm run db:push    # створює таблиці за схемою src/db/schema.ts
npm run db:seed    # 22 курси, демо-уроки Python і HTML/CSS/JS, демо-акаунти
```

### 5. Старт
```bash
npm run dev
```
Відкрий http://localhost:3000

### Демо-акаунти
| Хто | Логін | Пароль |
| --- | --- | --- |
| Батьки | `demo@itcodecraft.test` | `demo12345` |
| Дитина | `maks` | `maks12345` |
| Викладач | `teacher@itcodecraft.test` | `teacher12345` |

Поки ключі WayForPay порожні, на сторінці оплати є кнопка **«Імітувати успішну оплату»** — так можна перевірити весь шлях без реальних грошей. У продакшені її немає.

---

## Команди
| Команда | Що робить |
| --- | --- |
| `npm run dev` | сервер розробки |
| `npm run build` / `npm start` | продакшен-збірка і запуск |
| `npm test` | юніт-тести (доступ, рівні, підписи WayForPay) |
| `npm run lint` · `npm run typecheck` | перевірка коду |
| `npm run db:push` | застосувати зміни схеми до бази |
| `npm run db:seed` | заповнити курси й демо-акаунти |
| `npm run db:studio` | переглядати базу в браузері |

---

## Структура
```
src/
  app/                    сторінки (кожна папка = адреса сайту)
    page.tsx              головна
    pricing/              тарифи + оформлення з двома згодами
    register/ login/      реєстрація батьків і вхід
    cabinet/parent/       кабінет батьків: прогрес, домашки, підписка, дані
    cabinet/student/      кабінет дитини: рівень, серія, шлях уроків, бейджі
    courses/[slug]/       сторінка курсу
    learn/[slug]/[order]/ урок + домашка
    checkout/[ref]/       перехід на оплату WayForPay
    teacher/              перевірка домашок (тариф Преміум)
    legal/[doc]/          оферта, конфіденційність, повернення, правила, контакти
    api/payments/wayforpay/callback  ← serviceUrl (результат оплати)
    api/payments/wayforpay/return    ← returnUrl (повернення батьків)
    api/cron/daily        нагадування та закриття прострочених підписок
  actions/                серверні дії (форми): auth, children, learning, checkout, teacher
  db/                     схема бази, підключення, seed
  lib/
    plans.ts              ТАРИФИ І ЦІНИ — міняти тут
    access.ts             правила доступу (2 безкоштовні уроки, підписки)
    wayforpay.ts          підписи та форма WayForPay
    billing.ts            обробка платежів
    gamification.ts       XP, рівні, серія днів, бейджі
    dal.ts / session.ts   хто увійшов і з якою роллю
  content/legal.ts        тексти юридичних документів (ЧЕРНЕТКИ)
  proxy.ts                не пускає без входу в /cabinet, /learn, /checkout
```

---

## Підключення WayForPay (бойовий режим)
1. В особистому кабінеті WayForPay візьми **Merchant login**, **Merchant secret key** і **Merchant password**.
2. У `.env.local` (на сервері — у змінних оточення хостингу) заповни `WAYFORPAY_MERCHANT_ACCOUNT`, `WAYFORPAY_SECRET_KEY`, `WAYFORPAY_MERCHANT_PASSWORD`, `WAYFORPAY_MERCHANT_DOMAIN` (напр. `itcodecraft.tech`) і `APP_URL` (напр. `https://learn.itcodecraft.tech`).
3. `APP_URL` має бути **публічною HTTPS-адресою** — WayForPay надсилає результат на `APP_URL/api/payments/wayforpay/callback`. З `localhost` callback не дійде.
4. Перевір увесь цикл малою сумою на свою картку: оплата → статус «Активна» → скасування → повернення коштів.

Як це працює: підписка створюється зі статусом «очікує оплату», батьки платять на сторінці WayForPay з регулярним щомісячним платежем, WayForPay надсилає callback з підписом, ми перевіряємо підпис і суму — і лише тоді відкриваємо доступ. Щомісячні списання приходять тим самим callback-ом (orderReference з суфіксом `_WFPREG-N`) і продовжують доступ на місяць. Скасування в кабінеті викликає `regularApi REMOVE`.

> Перед запуском обов'язково протестуй щомісячне списання в тестовому режимі WayForPay: переконайся, що повторні платежі приходять на `serviceUrl` саме з таким форматом `orderReference`.

---

## Деплой (Vercel + Neon)
1. Залий код на GitHub.
2. Створи базу PostgreSQL на [Neon](https://neon.tech) або [Supabase](https://supabase.com), скопіюй рядок підключення.
3. Імпортуй репозиторій у [Vercel](https://vercel.com), додай усі змінні з `.env.example` (з реальними значеннями).
4. Локально з `DATABASE_URL` бойової бази: `npm run db:push && npm run db:seed` (демо-акаунти потім видали або зміни паролі!).
5. `vercel.json` уже запускає `/api/cron/daily` щодня о 07:00 UTC — Vercel сам підставить `CRON_SECRET`.

---

## Перед запуском з реальними клієнтами
- [ ] Юрист перевіряє тексти в `src/content/legal.ts`; заповнити реквізити в квадратних дужках (і у футері `src/components/site-chrome.tsx`)
- [ ] Змінити ціни в `src/lib/plans.ts`, якщо потрібно
- [ ] Видалити/змінити демо-акаунти
- [ ] Підключити Resend (або інший сервіс листів) і домен відправника
- [ ] Бойовий тест оплати, скасування, повернення
- [ ] Бухгалтер: ПРРО / фіскальні чеки
- [ ] Додати обмеження кількості спроб входу (rate limiting)
