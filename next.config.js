/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/convert/step': [
      './node_modules/occt-import-js/dist/occt-import-js.wasm',
      './node_modules/occt-import-js/dist/occt-import-js.js',
    ],
  },
}
module.exports = nextConfig
