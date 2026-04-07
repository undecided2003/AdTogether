import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed w-full z-50 top-0 left-0 border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between p-4 px-6 md:px-12">
        <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <span className="self-center text-2xl font-bold whitespace-nowrap text-white">
            Ad<span className="text-blue-500">Together</span>
          </span>
        </Link>
        <div className="flex md:order-2 space-x-3 md:space-x-4 rtl:space-x-reverse">
          <Link
            href="/login"
            className="text-white hover:text-blue-400 font-medium rounded-lg text-sm px-4 py-2 transition-colors duration-300"
          >
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-5 py-2 transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:shadow-[0_0_25px_rgba(37,99,235,0.8)]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
