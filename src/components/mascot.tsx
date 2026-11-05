import Image from "next/image";

/**
 * Робот Кодик — 3D-маскот ITCodeCraft (public/mascot/robot.webp, 930×735).
 * У картинки власний лавандовий фон, тому вона або лежить у картці того ж відтінку (`framed`),
 * або розчиняється краями в оточенні через маску (за замовчуванням).
 * Декоративний: текст поруч читається окремо, тож alt порожній.
 */
export function Mascot({
  className = "",
  framed = false,
  cover = false,
  float = true,
  priority = false,
  sizes = "(min-width: 1024px) 480px, 80vw",
}: {
  className?: string;
  framed?: boolean;
  /** заповнити контейнер повністю (object-cover) — для великих карток-ілюстрацій */
  cover?: boolean;
  float?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden ${framed ? "rounded-(--radius-card) bg-[#efeafd]" : ""} ${className}`}
      style={
        framed
          ? undefined
          : {
              maskImage: "radial-gradient(closest-side, #000 72%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(closest-side, #000 72%, transparent 100%)",
            }
      }
    >
      <Image
        src="/mascot/robot.webp"
        alt=""
        width={930}
        height={735}
        sizes={sizes}
        priority={priority}
        className={`h-full w-full ${cover ? "object-cover object-[50%_35%]" : "object-contain"} ${float && !cover ? "anim-mascot" : ""}`}
      />
    </div>
  );
}

/** Кругла «аватарка» з головою робота — для підказок і порожніх станів. */
export function MascotAvatar({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-[#efeafd] ring-4 ring-white ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/mascot/robot.webp"
        alt=""
        width={930}
        height={735}
        sizes={`${size * 3}px`}
        className="absolute max-w-none"
        // голова робота займає приблизно x 330–700, y 80–360 вихідного зображення
        style={{ width: size * 2.5, height: "auto", left: -size * 0.88, top: -size * 0.08 }}
      />
    </span>
  );
}
