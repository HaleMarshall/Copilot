/** @type {import('next').NextConfig} */
const nextConfig = {
  // PGlite ships WASM + worker assets — keep it external to the server bundle.
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default nextConfig;
