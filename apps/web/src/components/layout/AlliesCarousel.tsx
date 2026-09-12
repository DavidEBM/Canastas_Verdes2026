import fs from "fs";
import path from "path";

import AlliesCarouselClient from "./AlliesCarouselClient";

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".svg",
]);

export default function AlliesCarousel() {
  const alliesDirectory = path.join(
    process.cwd(),
    "public",
    "images",
    "aliados",
  );

  let files: string[] = [];

  try {
    if (fs.existsSync(alliesDirectory)) {
      files = fs
        .readdirSync(alliesDirectory)
        .filter((file) =>
          ALLOWED_EXTENSIONS.has(
            path.extname(file).toLowerCase(),
          ),
        )
        .sort((a, b) =>
          b.localeCompare(a, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );
    }
  } catch {
    files = [];
  }

  if (files.length === 0) {
    return null;
  }

  const images = files.map((file) => ({
    name: path.parse(file).name,
    src: `/images/aliados/${encodeURIComponent(file)}`,
  }));

  return <AlliesCarouselClient images={images} />;
}