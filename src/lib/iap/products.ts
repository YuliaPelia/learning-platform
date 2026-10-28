import type { PlanCode } from "@/generated/prisma/enums";

/**
 * Товари магазинів: tech.itcodecraft.slot<1-3>.<тариф>.monthly. «Місце» (slot) — група підписок у магазині:
 * Apple дозволяє лише одну активну підписку на групу, тому кожній дитині батьків — своя група.
 */
export const SLOT_COUNT = 3;

export function parseProductId(id: string): { slot: number; plan: PlanCode } | null {
  const m = /^tech\.itcodecraft\.slot([1-3])\.(basic|standard|premium)\.monthly$/.exec(id);
  return m ? { slot: Number(m[1]), plan: m[2] as PlanCode } : null;
}
