# План: вхід через Google

Специфікація: `docs/superpowers/specs/2026-10-21-google-auth-design.md`

Парольний вхід і cookie `itc_session` не замінюються. Мережу Google у тестах не викликаємо: обмін `code` і перевірку ID token підміняємо.

## Задача 1. Схема користувача

Файли: `prisma/schema.prisma`, нова міграція в `prisma/migrations/`.

- `passwordHash` стає `String?`.
- Додати `googleSub String? @unique @map("google_sub")`.
- Міграція: `ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL` і колонка `google_sub` з унікальним індексом.
- `npm run db:generate`. На локальну базу — `npm run db:migrate`. На Neon цю міграцію застосувати окремо тим самим прямим рядком, що й попередні, коли дійдемо до деплою.

## Задача 2. Порожній пароль

Файли: `src/lib/password.ts`, `src/actions/auth.ts`, `src/lib/__tests__/auth.test.ts`.

- `verifyPassword` на початку: якщо `stored` порожній, повернути `false`.
- У `login` перед перевіркою пароля: немає користувача або немає `passwordHash` — та сама гілка, що й невірний пароль, включно з `recordFailure`.
- Тест: користувач із `passwordHash: null` дає помилку «Невірний логін або пароль» і не викликає успішний `createSession`.

## Задача 3. Необов’язкова пошта дитини

Файли: `src/lib/validation.ts`, `src/actions/children.ts`, `src/components/add-child-form.tsx`, `src/lib/__tests__/children.test.ts`.

- У `ChildSchema` поле `email`: порожній рядок перетворюється на відсутність значення; якщо рядок є — це коректний email у нижньому регістрі.
- `addChild` перевіряє, що email не зайнятий (`findFirst` по `email` або `login`), і пише його в `user.email`.
- У формі поле «Email для входу через Google», не обов’язкове. Текст успіху лишає логін і пароль і додає, що з цією поштою дитина зможе натиснути Google.
- Тести: порожній email не йде в базу; зайнятий email повертає помилку і не створює користувача; вільний email потрапляє в `create`.

## Задача 4. Чисті функції Google

Новий файл `src/lib/google-auth.ts` і тест `src/lib/__tests__/google-auth.test.ts`.

Без `fetch` і без Prisma. Функції:

- `googleAuthUrl({ state, redirectUri, clientId })` — адреса `https://accounts.google.com/o/oauth2/v2/auth` з `openid email profile`, `response_type=code`.
- `safeNext` — лише шлях, що починається з одного `/`.
- `signGoogleSignup` / `readGoogleSignup` — JWT через уже наявний `jose` і `SESSION_SECRET`, термін 10 хвилин, payload `{ email, name, sub, next }`.
- `applyGoogleProfile(userBySub, userByEmail, profile)` повертає одне з:
  - `{ type: "sign-in", userId, role, linkSub, emailUpdate }` — знайдено за `sub` або за email, `googleSub` порожній або збігається;
  - `{ type: "signup" }` — нікого немає;
  - `{ type: "reject", reason: "sub-mismatch" | "unverified" }`.
- Якщо знайдено за `sub` і нова пошта вільна, а `login` дорівнював старій пошті, `emailUpdate` містить нові `email` і `login`.

Тести на кожну гілку: батьки, дитина, викладач, адмін, порожній `googleSub`, чужий `googleSub`, непідтверджена пошта, зміна пошти, зайнята нова пошта (тоді `emailUpdate` відсутній, вхід усе одно є).

## Задача 5. Старт і callback

Файли: `src/app/api/auth/google/route.ts`, `src/app/api/auth/google/callback/route.ts`, `src/lib/google-oauth.ts`.

- `GET /api/auth/google` читає `next`, пише httpOnly-cookie `google_oauth_state` (`state` + `next`, 10 хвилин, `secure` у production, `sameSite: lax`) і робить redirect на Google. `redirect_uri` = `APP_URL` без кінцевого `/` + `/api/auth/google/callback`.
- `google-oauth.ts`: `exchangeCode(code)` ходить на `https://oauth2.googleapis.com/token`, `verifyIdToken(token)` перевіряє підпис через JWKS `https://www.googleapis.com/oauth2/v3/certs` і audience `GOOGLE_CLIENT_ID`. У тестах ці дві функції мокаються, маршрут callback їх викликає.
- Callback: немає `code`, `error` від Google або `state` не збігся з cookie — redirect `/login?error=google` і cookie state стирається. Сесії немає.
- Далі `applyGoogleProfile`. `reject` — той самий redirect. `signup` — cookie `google_signup` і redirect `/login/google`. `sign-in` — оновити користувача (`googleSub`, за потреби email/login), `createSession`, стерти обидві google-cookie, redirect на `next` або `homeFor`.
- Тест маршруту callback з підміненими `exchangeCode` і `verifyIdToken`: існуючий користувач отримує `createSession`; невідома пошта не створює користувача; чужий state не викликає обмін коду.

## Задача 6. Сторінка «Хто ви?»

Файли: `src/app/login/google/page.tsx`, `src/actions/google-signup.ts`, `src/components/google-role-form.tsx`, тест `src/lib/__tests__/google-signup.test.ts`.

- Сторінка читає `google_signup`. Cookie немає або підпис прострочений — redirect `/login?error=google`.
- Форма показує пошту і два шляхи. Ім’я заповнене з Google.
- Батьки: позначка 18 років, ті самі посилання на політику й правила, що в `RegisterForm`. Дія `completeGoogleParent` створює користувача і згоду `age_confirm` однією транзакцією, потім сесію, стирає `google_signup`, веде в кабінет батьків.
- Дитина: рік народження з тими самими межами, що `ChildSchema`. Дія `completeGoogleStudent` створює `student` без `parentId` і без згоди, потім сесію і кабінет дитини.
- Повторна відправка, якщо пошту вже хтось зайняв, повертає помилку і не створює дубль.
- Тести: без cookie дія нічого не створює; батьки без позначки не створюють користувача; успішні батьки пишуть згоду; успішна дитина має `parentId: null` і збережений рік.

## Задача 7. Кнопки

Файли: `src/components/auth-forms.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`.

- Посилання «Увійти через Google» над парольною формою, на `/api/auth/google`, з `next`, якщо він є.
- `/login` показує текст для `error=google`: «Не вдалося увійти через Google. Спробуйте ще раз.»
- Підказка на вході: батьки й діти з поштою можуть натиснути Google, дитина без пошти — логін і пароль.

## Задача 8. Змінні

Файл: `.env.example`.

- Порожні `GOOGLE_CLIENT_ID` і `GOOGLE_CLIENT_SECRET`.
- Коментар: адреса повернення в Google Cloud — `APP_URL/api/auth/google/callback`.

На Vercel ці два значення і вже наявний `APP_URL` додає людина. У Google Cloud той самий callback для локального `http://localhost:3000` і для адреси деплою.

## Порядок і перевірка

Задачі йдуть по черзі: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Після кожної — `npm test` для зачепленого файлу, наприкінці `npm test` і `npm run typecheck`.

У браузері, коли будуть клієнтські ключі: кнопка на `/login` і `/register`, відмова при скасуванні Google, вхід наявної пошти, створення батьків, створення дитини, повторний вхід тієї самої дитини без сторінки ролі, пароль для Google-акаунта дає «Невірний логін або пароль».
