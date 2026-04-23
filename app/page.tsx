import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-bold text-gray-900">PB 3D</span>
          <span className="text-xl font-bold text-gray-900">Printing</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </button>
          <Link
            href="/upload"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-full transition-colors text-sm"
          >
            New Order
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1">

        {/* Hero Section */}
        <section className="px-6 pt-10 pb-8">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
            Bring Your Ideas<br />to Life in 3D
          </h1>
          <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-sm">
            High-precision 3D printing service for creators and engineers. Upload your models, choose your materials, and watch your vision become reality.
          </p>
          <div className="flex flex-col gap-3 mb-8">
            <Link
              href="/upload"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-full text-base transition-colors text-center w-fit"
            >
              Start Printing Now
            </Link>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-8 py-4 rounded-full text-base transition-colors w-fit">
              View Samples
            </button>
          </div>
          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold">A</div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold">B</div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">C</div>
            </div>
            <span className="text-sm text-gray-500 font-medium">Trusted by 2,000+ engineers and designers</span>
          </div>
        </section>

        {/* Feature image */}
        <section className="px-6 mb-6">
          <div className="rounded-2xl overflow-hidden bg-gray-900 aspect-video flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">🖨️</div>
              <p className="text-gray-300 text-sm">High-precision FDM Printing</p>
            </div>
          </div>
        </section>

        {/* Photo Grid */}
        <section className="px-6 mb-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl overflow-hidden bg-gray-800 aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl">⚙️</div>
                <p className="text-gray-400 text-xs mt-2">FDM Printer</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-700 aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl">🏭</div>
                <p className="text-gray-400 text-xs mt-2">Workspace</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden bg-amber-900 aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl">🔩</div>
                <p className="text-gray-400 text-xs mt-2">Infill Structure</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden bg-gray-900 aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl">🗿</div>
                <p className="text-gray-400 text-xs mt-2">3D Model</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Card */}
        <section className="px-6 mb-10">
          <div className="bg-gray-900 rounded-3xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
              Ready to start<br />your project?
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Join thousands of innovators who use PB3D Printing to turn digital designs into physical reality in record time.
            </p>
            <Link
              href="/upload"
              className="bg-white text-gray-900 font-bold px-8 py-4 rounded-full text-sm hover:bg-gray-100 transition-colors inline-block"
            >
              Create Your First Order
            </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 bg-white">
        <p className="font-bold text-gray-900 text-base mb-1">PB 3D Printing</p>
        <p className="text-gray-400 text-xs mb-4">© 2024 PB3D Printing. All rights reserved.</p>
        <div className="flex gap-5 mb-5">
          <a href="#" className="text-gray-400 text-sm hover:text-gray-600 transition-colors">Support</a>
          <a href="#" className="text-gray-400 text-sm hover:text-gray-600 transition-colors">Contact Us</a>
          <a href="#" className="text-gray-400 text-sm hover:text-gray-600 transition-colors">Terms of Service</a>
        </div>
        <div className="flex gap-3">
          <button className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </button>
          <button className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </button>
        </div>
      </footer>

    </div>
  )
}
