/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next 14 only reads this under `experimental`; at the top level it is ignored
    // and the STEP converter's WASM is missing from the Vercel function bundle.
    outputFileTracingIncludes: {
      '/api/convert/step': [
        './node_modules/occt-import-js/dist/occt-import-js.wasm',
        './node_modules/occt-import-js/dist/occt-import-js.js',
      ],
    },
  },
}
module.exports = nextConfig
