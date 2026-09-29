import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Champion icons are bundled 128px PNGs already; serving them as-is keeps them sharp and means
  // no image-optimisation usage on Vercel (the owner's no-recurring-costs rule).
  images: { unoptimized: true },
};

export default nextConfig;
