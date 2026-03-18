import Link from 'next/link';
import { Leaf, MessageSquare, CloudSun, MapPin } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image Setup */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1592982537447-6f2cf29be49c?q=80&w=2070&auto=format&fit=crop')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-green-900/40 to-black/80"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-400/30 backdrop-blur-sm text-green-100 mb-8 animate-fade-in">
          <Leaf className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium tracking-wide uppercase">Agriculture Reimagined</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg">
          Smart Farmer AI
        </h1>
        
        <p className="text-xl md:text-2xl text-green-50 mb-12 max-w-3xl font-light leading-relaxed drop-shadow-md">
          Your personal agricultural expert. Instantly identify crop diseases, get ultra-local weather insights, and chat with AI for better yields.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl justify-center items-center">
          <Link 
            href="/crop-doctor" 
            className="group w-full sm:w-1/2 bg-green-600 hover:bg-green-500 text-white font-bold py-5 px-8 rounded-2xl shadow-[0_0_40px_rgba(22,163,74,0.3)] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_0_60px_rgba(22,163,74,0.5)] flex flex-col items-center justify-center gap-3 border border-green-500/50"
          >
            <Leaf className="w-8 h-8 text-green-200 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-lg">Upload Crop Image</span>
          </Link>
          
          <Link 
            href="/assistant" 
            className="group w-full sm:w-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold py-5 px-8 rounded-2xl shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-white/20 flex flex-col items-center justify-center gap-3"
          >
            <MessageSquare className="w-8 h-8 text-blue-300 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-lg">Ask AI Assistant</span>
          </Link>
        </div>
        
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full text-white/80">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/5">
             <CloudSun className="w-6 h-6 text-yellow-400" />
             <span className="text-sm">Live Weather</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/5">
             <MapPin className="w-6 h-6 text-red-400" />
             <span className="text-sm">Local Advice</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/5">
             <Leaf className="w-6 h-6 text-green-400" />
             <span className="text-sm">Pest Control</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/5">
             <MessageSquare className="w-6 h-6 text-blue-400" />
             <span className="text-sm">24/7 Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
