"use client";

import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";
import { LENIS_OPTIONS } from "@/lib/motion";
import "lenis/dist/lenis.css";

export function HomeScrollExperience({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
