/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a minimal self-contained server in .next/standalone for Docker.
  output: "standalone",
};

module.exports = nextConfig;
