# Як вчитися на цьому проєкті

Цей код — твій «Перший реальний проєкт» з роадмапу. Не треба розуміти все одразу: кожен етап навчання відкриває нову частину коду.

| Етап роадмапу | Що читати в проєкті | Що спробувати змінити |
| --- | --- | --- |
| 1. HTML + CSS | `src/app/page.tsx` (розмітка), `src/app/globals.css` (кольори й класи) | Змінити колір акценту `--color-accent`, текст заголовка |
| 2. JavaScript | `src/lib/gamification.ts`, `src/lib/access.ts` | Додати новий бейдж у `computeBadges` |
| 2+. TypeScript | типи в `src/lib/plans.ts`, `prisma/schema.prisma` (з неї генеруються типи) | Додати поле в тип `Plan` і подивитись, де TypeScript підкаже помилки |
| 3. React | `src/components/course-catalog.tsx` (`useState`), `pricing-client.tsx` | Додати фільтр «Мобільні» |
| 3+. Next.js | папки в `src/app` = адреси сторінок; `"use server"` у `src/actions` | Створити сторінку `/about` |
| 4. Node.js / бекенд | `src/actions/*`, `src/app/api/*/route.ts`, `src/lib/wayforpay.ts` | Написати тест на новий випадок у `src/lib/__tests__` |
| 5. PostgreSQL + Prisma | `prisma/schema.prisma`, `prisma/migrations`, `npm run db:studio` | Додати поле `avatar` у модель `User`, виконати `npm run db:migrate` і подивитись на згенерований SQL |
| 6. Git + GitHub | уся історія змін | Кожну зміну — окремим комітом з поясненням |
| 7. Docker + деплой | README → «Деплой» | Задеплоїти на Vercel |

## Ключові ідеї, які тут використано
- **Сервер vs клієнт.** Файли з `"use client"` виконуються в браузері (кнопки, стан). Решта — на сервері, там можна ходити в базу.
- **Ніколи не довіряй браузеру.** Кожна дія на сервері знову перевіряє, хто користувач і чи має він доступ (`requireUser`, `canAccessLesson`).
- **Одне джерело правди.** Ціни — лише в `plans.ts`; правила доступу — лише в `access.ts`.
- **Підпис.** WayForPay і сесії захищені підписом (HMAC / JWT) — без секретного ключа їх не підробити.
- **Тести.** `npm test` перевіряє найважливішу логіку за секунду. Змінив правила — запусти тести.
