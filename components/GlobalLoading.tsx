"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Loading from "@/components/Loading";

export default function GlobalLoading() {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const pathname = usePathname(); // Get the current pathname
  const searchParams = useSearchParams(); // Get the current search params

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    // Only show if navigation takes a bit (prevents flashing)
    showTimer = setTimeout(() => {
      setIsPageLoading(true);
      hideTimer = setTimeout(() => setIsPageLoading(false), 300);
    }, 150);

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [pathname, searchParams]);

  // Only render if we're actually loading
  if (!isPageLoading) {
    return null;
  }

  return <Loading />; // Show loading animation if loading
}
