import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="bg-green-700 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold flex items-center gap-2">
          🌱 Smart Farmer AI
        </Link>
        <div className="hidden md:flex gap-6">
          <Link href="/crop-doctor" className="hover:text-green-200">Crop Doctor</Link>
          <Link href="/weather" className="hover:text-green-200">Weather</Link>
          <Link href="/assistant" className="hover:text-green-200">Assistant</Link>
          <Link href="/recommendations" className="hover:text-green-200">Recommendations</Link>
          <Link href="/market" className="hover:text-green-200">Market</Link>
        </div>
        <Link href="/login" className="bg-white text-green-700 px-4 py-2 rounded font-medium hover:bg-green-50">
          Login
        </Link>
      </div>
    </nav>
  );
}
