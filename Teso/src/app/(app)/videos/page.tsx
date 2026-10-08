"use client";
import { Suspense } from "react";
import { Explore } from "@/components/learn/Explore";

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="flex-1 p-6 text-muted-foreground text-sm">Loading videos...</div>}>
      <Explore />
    </Suspense>
  );
}

