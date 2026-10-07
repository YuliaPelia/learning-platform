/**
 * Початкові дані: тарифи, каталог курсів, демо-уроки та демо-акаунти.
 * Запуск: `npm run db:seed` (можна запускати повторно — дані не дублюються;
 * курси й уроки, які вже є в базі, лишаються як є — їх редагують в адмін-панелі /admin).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../generated/prisma/client";
import type { CourseCategory, LessonType, PlanCode, Role } from "../generated/prisma/enums";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Ціни в копійках. Змінити ціну потім можна прямо в базі (npm run db:studio) — seed її перезапише лише при повторному запуску.
const PLAN_SEED: Array<{ code: PlanCode; name: string; price: number; rank: number }> = [
  { code: "basic", name: "Простий", price: 24900, rank: 1 },
  { code: "standard", name: "Середній", price: 44900, rank: 2 },
  { code: "premium", name: "Преміум", price: 89900, rank: 3 },
];

type SeedCourse = {
  slug: string;
  title: string;
  category: CourseCategory;
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

type SeedLesson = {
  title: string;
  summary: string;
  type?: LessonType; // за замовчуванням text
  content: string; // Markdown
  questions?: Array<{ q: string; options: string[]; answer: number }>; // для type: "quiz"
  homeworkPrompt?: string;
  xp?: number;
};

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
    {
      title: "Перевір себе: основи Python",
      summary: "Короткий тест за модулем.",
      type: "quiz",
      xp: 150,
      content: "Ти пройшов перший модуль! Відповідай на питання — щоб пройти тест, потрібно 60% правильних відповідей.",
      questions: [
        { q: "Яка команда виводить текст на екран?", options: ["input()", "print()", "int()"], answer: 1 },
        { q: "Що поверне input()?", options: ["Число", "Текст", "Нічого"], answer: 1 },
        { q: "Скільки разів виконається тіло циклу for i in range(1, 6)?", options: ["5", "6", "1"], answer: 0 },
        { q: "Що ставимо в кінці рядка з if?", options: ["Крапку з комою", "Двокрапку", "Нічого"], answer: 1 },
      ],
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
  console.log("Тарифи…");
  for (const p of PLAN_SEED) {
    await prisma.plan.upsert({
      where: { code: p.code },
      update: { name: p.name, price: p.price, rank: p.rank },
      create: { ...p, period: "month" },
    });
  }
  const basic = await prisma.plan.findUniqueOrThrow({ where: { code: "basic" } });

  console.log("Курси…");
  for (const [i, c] of COURSES.entries()) {
    const status = LESSONS[c.slug] ? "published" : "soon";
    const data = { ...c, status, sortOrder: i } as const;
    // Наявні курси не чіпаємо: їх редагує адмін у /admin, і повторний seed не має затирати його зміни
    await prisma.course.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...data, minPlanId: basic.id },
    });
  }

  console.log("Уроки й домашки…");
  for (const [slug, lessons] of Object.entries(LESSONS)) {
    const course = await prisma.course.findUniqueOrThrow({ where: { slug }, include: { _count: { select: { lessons: true } } } });
    // Демо-уроки додаємо лише в порожній курс — програму, яку вже веде адмін, не перезаписуємо
    if (course._count.lessons > 0) continue;
    for (const [i, l] of lessons.entries()) {
      const type = l.type ?? "text";
      const content: Prisma.InputJsonValue = type === "quiz" ? { markdown: l.content, questions: l.questions ?? [] } : { markdown: l.content };
      const data = { type, title: l.title, summary: l.summary, xp: l.xp ?? 100, content };
      const lesson = await prisma.lesson.upsert({
        where: { courseId_order: { courseId: course.id, order: i + 1 } },
        update: data,
        create: { ...data, courseId: course.id, order: i + 1 },
      });
      if (l.homeworkPrompt) {
        await prisma.homework.upsert({
          where: { lessonId: lesson.id },
          update: { task: l.homeworkPrompt },
          create: { lessonId: lesson.id, task: l.homeworkPrompt },
        });
      }
    }
  }

  console.log("Демо-акаунти…");
  const hash = (p: string) => bcrypt.hash(p, 10);
  const upsertUser = async (u: { role: Role; login: string; email?: string; name: string; password: string; birthYear?: number; parentId?: string }) => {
    const { password, ...rest } = u;
    const passwordHash = await hash(password);
    return prisma.user.upsert({
      where: { login: u.login },
      update: { name: u.name, passwordHash },
      create: { ...rest, passwordHash },
    });
  };

  const parent = await upsertUser({ role: "parent", login: "demo@itcodecraft.test", email: "demo@itcodecraft.test", name: "Олена", password: "demo12345" });
  await upsertUser({ role: "student", login: "maks", name: "Макс", birthYear: new Date().getFullYear() - 12, parentId: parent.id, password: "maks12345" });
  await upsertUser({ role: "teacher", login: "teacher@itcodecraft.test", email: "teacher@itcodecraft.test", name: "Викладач", password: "teacher12345" });
  await upsertUser({ role: "admin", login: "admin@itcodecraft.test", email: "admin@itcodecraft.test", name: "Адміністратор", password: "admin12345" });

  console.log("Готово ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
