/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tell Vercel's Node File Tracing to bundle the occt-import-js WASM file
    // inside the /api/convert/step serverless function
    outputFileTracingIncludes: {
      '/api/convert/step': [
        './node_modules/occt-import-js/dist/occt-import-js.wasm',
        './node_modules/occt-import-js/dist/occt-import-js.js',
      ],
    },
  },
}
module.exports = nextConfig
