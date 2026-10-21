"use client";

import dynamic from "next/dynamic";

// three.js (~500 КБ) вантажимо окремим чанком і лише на клієнті — hero з'являється без очікування 3D
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

export function HeroSceneLazy() {
  return <HeroScene />;
}
