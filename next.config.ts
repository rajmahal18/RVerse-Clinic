import type { NextConfig } from "next";
import { validateProductionConfig } from "./src/lib/security-config";

validateProductionConfig();

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
