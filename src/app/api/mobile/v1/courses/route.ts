import { prisma } from "@/db";
import { FREE_LESSONS } from "@/lib/plans";

/** Каталог курсів: відкритий для всіх, вхід не потрібен. */
export async function GET() {
  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { lessons: true } } },
  });
  return Response.json(
    {
      courses: courses.map((c) => ({
        slug: c.slug,
        title: c.title,
        description: c.description,
        category: c.category,
        ageFrom: c.ageFrom,
        ageTo: c.ageTo,
        status: c.status,
        lessonsCount: c._count.lessons,
        freeLessons: FREE_LESSONS,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
