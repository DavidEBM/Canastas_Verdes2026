"use client";

import AlliesCarouselClient from "./AlliesCarouselClient";
import { useSiteContent } from "@/hooks/useSiteContent";

export default function AlliesCarousel() {
  const { content, loading, error, lastDateUpdated } = useSiteContent("aliados");

  if (loading && !content.items.length) return null;

  return (
    <AlliesCarouselClient
      content={content}
      contentLoading={loading}
      contentUnavailable={Boolean(error && !lastDateUpdated)}
    />
  );
}
