/**
 * Початкові дані: каталог курсів, демо-уроки та демо-акаунти.
 * Запуск: `npm run db:seed` (можна запускати повторно — дані оновлюються, а не дублюються).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

type SeedCourse = {
  slug: string;
  title: string;
  category: "start" | "web" | "design" | "code" | "mobile" | "games";
  ageFrom: number;
  ageTo: number;
  description: string;
};

const COURSES: SeedCourse[] = [
  { slug: "scratch", title: "Scratch", category: "start", ageFrom: 9, ageTo: 11, description: "Перші програми з блоків: анімації, мультфільми та ігри." },
  { slug: "minecraft", title: "Minecraft", category: "start", ageFrom: 9, ageTo: 12, description: "Логіка й алгоритми у світі Minecraft: команди, автоматизація, моди." },
  { slug: "roblox", title: "Roblox", category: "start", ageFrom: 9, ageTo: 14, description: "Створюємо власні ігри в Roblox Studio на мові Lua." },
  { slug: "html-css-js", title: "HTML + CSS + JS", category: "web", ageFrom: 11, ageTo: 17, description: "Перший власний сайт: розмітка, стилі й інтерактив." },
  { slug: "javascript", title: "JavaScript", category: "web", ageFrom: 12, ageTo: 17, description: "Головна мова вебу: змінні, функції, масиви, події." },
  { slug: "typescript", title: "TypeScript", category: "web", ageFrom: 14, ageTo: 17, description: "JavaScript з типами — як пишуть код у великих командах." },
  { slug: "react", title: "React.js", category: "web", ageFrom: 14, ageTo: 17, description: "Сучасні інтерфейси з компонентів." },
  { slug: "nextjs", title: "Next.js", category: "web", ageFrom: 15, ageTo: 17, description: "Повноцінні сайти й застосунки на React." },
  { slug: "angular", title: "Angular", category: "web", ageFrom: 15, ageTo: 17, description: "Фреймворк для великих вебзастосунків." },
  { slug: "vue", title: "Vue", category: "web", ageFrom: 14, ageTo: 17, description: "Простий і гнучкий фреймворк для інтерфейсів." },
  { slug: "nodejs", title: "Node.js", category: "web", ageFrom: 14, ageTo: 17, description: "Серверна частина: API, бази даних, бекенд." },
  { slug: "figma", title: "Figma", category: "design", ageFrom: 11, ageTo: 17, description: "Проєктуємо інтерфейси й макети, як справжні дизайнери." },
  { slug: "web-design", title: "Web design", category: "design", ageFrom: 11, ageTo: 17, description: "Композиція, колір, типографіка та UX для сайтів." },
  { slug: "blender", title: "Blender", category: "design", ageFrom: 10, ageTo: 17, description: "3D-моделювання, анімація та рендер." },
  { slug: "python", title: "Python", category: "code", ageFrom: 12, ageTo: 17, description: "Найпопулярніша мова для початку: від перших програм до ігор і ботів." },
  { slug: "java", title: "Java", category: "code", ageFrom: 12, ageTo: 17, description: "Мова для Android, серверів і моди до Minecraft." },
  { slug: "csharp", title: "C#", category: "code", ageFrom: 13, ageTo: 17, description: "Мова Unity та застосунків Microsoft." },
  { slug: "cpp", title: "C++", category: "code", ageFrom: 14, ageTo: 17, description: "Швидка мова для ігор, олімпіад і систем." },
  { slug: "dotnet", title: ".NET", category: "code", ageFrom: 15, ageTo: 17, description: "Платформа для вебу, десктопу й хмари на C#." },
  { slug: "flutter", title: "Flutter", category: "mobile", ageFrom: 14, ageTo: 17, description: "Мобільні застосунки для Android та iOS з одного коду." },
  { slug: "react-native", title: "React Native", category: "mobile", ageFrom: 15, ageTo: 17, description: "Мобільні застосунки на React." },
  { slug: "unity", title: "Unity", category: "games", ageFrom: 12, ageTo: 17, description: "Від ідеї до гри, в яку грають друзі." },
];

type SeedLesson = { title: string; summary: string; content: string; homeworkPrompt?: string; xp?: number };

// Демо-уроки. Реальну програму курсів створюють викладачі — це приклад формату.
const LESSONS: Record<string, SeedLesson[]> = {
  python: [
    {
      title: "Привіт, Python!",
      summary: "Що таке програма і як написати першу.",
      content: `## Що таке програма
Програма — це список команд для комп'ютера. Як рецепт: крок за кроком, і в результаті — смачний пиріг (або гра).

## Перша команда
Команда \`print\` виводить текст на екран:

\`\`\`
print("Привіт, світе!")
\`\`\`

- Текст беремо в лапки.
- Команда закінчується дужкою.

**Спробуй:** виведи своє ім'я та улюблену гру.`,
      homeworkPrompt: "Напиши програму з трьох рядків print: твоє ім'я, вік і улюблена гра. Встав код у поле відповіді.",
    },
    {
      title: "Змінні — коробки для даних",
      summary: "Зберігаємо значення та використовуємо їх знову.",
      content: `## Змінна — це підписана коробка
Кладемо в коробку значення і пишемо на ній назву:

\`\`\`
name = "Макс"
level = 4
print(name, "має рівень", level)
\`\`\`

- Назва змінної — англійськими літерами, без пробілів.
- Значення можна змінювати: \`level = level + 1\`.`,
      homeworkPrompt: "Створи змінні hero і coins. Збільш coins на 10 і виведи результат.",
    },
    {
      title: "Введення: input()",
      summary: "Програма, яка питає користувача.",
      content: `## Програма, що розмовляє
\`input\` чекає, поки користувач щось напише:

\`\`\`
name = input("Як тебе звати? ")
print("Радий знайомству,", name)
\`\`\`

Все, що повертає \`input\`, — це текст. Щоб отримати число: \`int(input())\`.`,
    },
    {
      title: "Умови: if / else",
      summary: "Програма приймає рішення.",
      content: `## Якщо… інакше…
\`\`\`
age = int(input("Скільки тобі років? "))
if age >= 12:
    print("Відкрито курс Python!")
else:
    print("Почнімо зі Scratch")
\`\`\`

- Після умови ставимо двокрапку.
- Команди всередині — з відступом у 4 пробіли.`,
      homeworkPrompt: "Напиши гру «Вгадай пароль»: якщо введено правильне слово — «Доступ відкрито», інакше — «Спробуй ще».",
    },
    {
      title: "Цикл for",
      summary: "Повторюємо дії без копіювання коду.",
      content: `## Повторення — суперсила програміста
\`\`\`
for level in range(1, 6):
    print("Новий рівень!", level)
\`\`\`

\`range(1, 6)\` дає числа від 1 до 5. Цикл виконає тіло 5 разів.`,
      homeworkPrompt: "Виведи таблицю множення на 7 від 7×1 до 7×10 за допомогою for.",
    },
    {
      title: "Цикл while",
      summary: "Повторюємо, поки умова правдива.",
      content: `## Поки… роби…
\`\`\`
secret = 7
guess = 0
while guess != secret:
    guess = int(input("Вгадай число від 1 до 10: "))
print("Вгадав!")
\`\`\`

Обережно: якщо умова ніколи не стане хибною, цикл буде нескінченним.`,
      homeworkPrompt: "Зроби гру «Вгадай число»: комп'ютер підказує «більше» або «менше», доки гравець не вгадає.",
    },
  ],
  "html-css-js": [
    {
      title: "Як влаштований сайт",
      summary: "HTML, CSS і JavaScript — скелет, одяг і рухи.",
      content: `## Три мови вебу
- **HTML** — скелет сторінки: заголовки, текст, кнопки.
- **CSS** — одяг: кольори, шрифти, розташування.
- **JavaScript** — рухи: що станеться, коли натиснеш кнопку.

\`\`\`
<h1>Мій перший сайт</h1>
<p>Привіт! Я вчуся в ITCodeCraft.</p>
\`\`\``,
      homeworkPrompt: "Створи файл index.html із заголовком, абзацом про себе та списком з трьох хобі. Встав код у відповідь.",
    },
    {
      title: "CSS: даємо сторінці стиль",
      summary: "Кольори, шрифти й відступи.",
      content: `## Правило CSS
\`\`\`
h1 {
  color: #7CE38B;
  font-size: 40px;
}
\`\`\`

- \`h1\` — кого стилізуємо.
- У фігурних дужках — властивості та значення.`,
    },
    {
      title: "JavaScript: перша кнопка",
      summary: "Реагуємо на натискання.",
      content: `## Кнопка, яка вітається
\`\`\`
<button id="hi">Натисни</button>
<script>
  document.getElementById("hi").onclick = () => alert("Привіт!");
</script>
\`\`\``,
      homeworkPrompt: "Додай на свою сторінку кнопку, яка змінює колір заголовка.",
    },
  ],
};

async function main() {
  console.log("Сідування курсів…");
  for (const [i, c] of COURSES.entries()) {
    const status = LESSONS[c.slug] ? "published" : "soon";
    await db
      .insert(schema.courses)
      .values({ ...c, status, sortOrder: i })
      .onConflictDoUpdate({
        target: schema.courses.slug,
        set: { title: c.title, category: c.category, ageFrom: c.ageFrom, ageTo: c.ageTo, description: c.description, status, sortOrder: i },
      });
  }

  for (const [slug, lessons] of Object.entries(LESSONS)) {
    const [course] = await db.select().from(schema.courses).where(eq(schema.courses.slug, slug));
    for (const [i, l] of lessons.entries()) {
      const values = {
        courseId: course.id,
        order: i + 1,
        title: l.title,
        summary: l.summary,
        content: l.content,
        xp: l.xp ?? 100,
        homeworkPrompt: l.homeworkPrompt ?? null,
      };
      const [existing] = await db
        .select()
        .from(schema.lessons)
        .where(and(eq(schema.lessons.courseId, course.id), eq(schema.lessons.order, i + 1)));
      if (existing) await db.update(schema.lessons).set(values).where(eq(schema.lessons.id, existing.id));
      else await db.insert(schema.lessons).values(values);
    }
  }

  console.log("Демо-акаунти…");
  const upsertUser = async (u: typeof schema.users.$inferInsert) => {
    const [row] = await db
      .insert(schema.users)
      .values(u)
      .onConflictDoUpdate({ target: schema.users.login, set: { name: u.name, passwordHash: u.passwordHash } })
      .returning();
    return row;
  };
  const hash = (p: string) => bcrypt.hash(p, 10);

  const parent = await upsertUser({
    role: "parent",
    login: "demo@itcodecraft.test",
    email: "demo@itcodecraft.test",
    name: "Олена",
    passwordHash: await hash("demo12345"),
  });
  await upsertUser({
    role: "student",
    login: "maks",
    name: "Макс",
    birthYear: new Date().getFullYear() - 12,
    parentId: parent.id,
    passwordHash: await hash("maks12345"),
  });
  await upsertUser({
    role: "teacher",
    login: "teacher@itcodecraft.test",
    email: "teacher@itcodecraft.test",
    name: "Викладач",
    passwordHash: await hash("teacher12345"),
  });

  console.log("Готово ✔");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
