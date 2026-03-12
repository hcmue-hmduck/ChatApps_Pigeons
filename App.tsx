import { Shield, Lock, Zap, Mail, Share2, LogIn, ChevronRight, Github } from 'lucide-react';
import { motion } from 'motion/react';

const Navbar = () => (
  <nav className="sticky top-6 z-50 max-w-7xl mx-auto px-6">
    <div className="glass-panel rounded-3xl px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,242,255,0.15)]">
          <Shield className="w-6 h-6 fill-primary/20" />
        </div>
        <span className="text-xl font-black tracking-tighter uppercase text-white neon-glow">CyberChat</span>
      </div>
      
      <div className="hidden md:flex items-center gap-10">
        {['Network', 'Protocol', 'Nodes', 'Pricing'].map((item) => (
          <a key={item} href="#" className="text-sm font-bold tracking-wide hover:text-primary transition-colors text-slate-400">
            {item}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button className="px-5 py-2 text-sm font-bold text-slate-400 hover:text-primary transition-colors">Log In</button>
        <button className="bubble-me text-slate-900 px-6 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-105 active:scale-95">
          Get Started
        </button>
      </div>
    </div>
  </nav>
);

const Hero = () => (
  <section className="grid lg:grid-cols-2 gap-16 items-center py-12 md:py-24">
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
        Next-Gen Encryption Live
      </div>
      
      <h1 className="text-6xl md:text-7xl font-black leading-[1.05] tracking-tight text-white">
        The Future of <br/>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 neon-glow">Secure</span> Chat
      </h1>
      
      <p className="text-lg text-slate-400 max-w-xl leading-relaxed font-medium">
        Experience a premium, high-tech interface with advanced glassmorphism and military-grade privacy. Built for the modern web with unparalleled speed.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <button className="bubble-me text-slate-900 px-8 py-4 rounded-3xl font-black text-lg transition-all hover:scale-[1.03] active:scale-95">
          Create Private Vault
        </button>
        <button className="glass-card text-white px-8 py-4 rounded-3xl font-bold text-lg border-white/10 hover:bg-white/5 transition-colors">
          View Protocol
        </button>
      </div>

      <div className="flex items-center gap-6 pt-8 border-t border-white/5">
        <div className="flex -space-x-3">
          {[1, 2, 3].map((i) => (
            <img 
              key={i}
              src={`https://picsum.photos/seed/user${i}/100/100`} 
              className="w-10 h-10 rounded-full border-2 border-background-dark"
              referrerPolicy="no-referrer"
              alt="User"
            />
          ))}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Trusted by <span className="text-white">2M+ developers</span>
        </p>
      </div>
    </motion.div>

    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="relative"
    >
      <div className="absolute -inset-8 bg-primary/20 blur-[100px] rounded-full opacity-30"></div>
      <div className="glass-panel p-2 rounded-[2.5rem] border-white/5 shadow-2xl relative">
        <div className="rounded-[2.2rem] overflow-hidden aspect-[4/3] bg-[#0d1117] flex items-center justify-center relative">
          <img 
            className="w-full h-full object-cover opacity-80" 
            src="https://picsum.photos/seed/cyber/1200/900" 
            alt="Dashboard Mockup"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-6 left-6 right-6 p-4 glass-panel bg-slate-900/90 rounded-2xl border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
              <div className="h-2 w-32 bg-white/20 rounded-full"></div>
              <div className="ml-auto h-2 w-12 bg-white/10 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  </section>
);

const Features = () => (
  <section className="py-24 grid md:grid-cols-3 gap-8">
    {[
      { icon: Zap, title: "Crystal Clear UI", desc: "An interface that breathes. High-performance glassmorphism effects for a focused, distraction-free experience." },
      { icon: Lock, title: "AES-256 Vault", desc: "Your messages are yours alone. End-to-end encryption ensures that not even we can read your private data." },
      { icon: Zap, title: "Hyper-Fast Sync", desc: "Built on low-latency protocols. Instant message delivery across all your devices in mere milliseconds." }
    ].map((feature, i) => (
      <motion.div 
        key={i}
        whileHover={{ y: -5 }}
        className="glass-panel p-8 rounded-3xl hover:border-primary/40 transition-all group"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-primary/20 shadow-[0_0_15px_rgba(0,242,255,0.1)]">
          <feature.icon className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-3 text-white tracking-tight">{feature.title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed font-medium">{feature.desc}</p>
      </motion.div>
    ))}
  </section>
);

const AuthSection = () => (
  <section className="py-20">
    <div className="glass-panel rounded-[2.5rem] max-w-5xl mx-auto overflow-hidden">
      <div className="grid md:grid-cols-2">
        <div className="relative hidden md:flex flex-col justify-end p-12 overflow-hidden bg-[#0d1117]">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent z-10"></div>
          <img 
            src="https://picsum.photos/seed/secure/800/800" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
            alt="Secure Background"
            referrerPolicy="no-referrer"
          />
          <div className="relative z-20">
            <h4 className="text-3xl font-black mb-3 text-white tracking-tight">Secure Entry</h4>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">Access your encrypted workspace with hardware-level biometric keys.</p>
          </div>
        </div>

        <div className="p-8 md:p-14 bg-[#0a0c10]/80">
          <div className="flex items-center gap-8 mb-12 border-b border-white/5">
            <button className="text-sm font-black border-b-2 border-primary pb-3 text-white uppercase tracking-widest">Sign In</button>
            <button className="text-sm font-bold text-slate-600 pb-3 hover:text-white transition-colors uppercase tracking-widest">Register</button>
          </div>
          
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Node Identifier</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5 group-focus-within:text-primary transition-colors" />
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-white/[0.08] transition-all placeholder:text-slate-700"
                  placeholder="user@cyberchat.io"
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Access Key</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5 group-focus-within:text-primary transition-colors" />
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-white/[0.08] transition-all placeholder:text-slate-700"
                  placeholder="••••••••••••"
                  type="password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="rounded bg-white/5 border-white/10 text-primary focus:ring-primary focus:ring-offset-background-dark w-4 h-4" />
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-300">Remember Node</span>
              </label>
              <a href="#" className="text-xs font-bold text-primary hover:underline underline-offset-4">Lost Key?</a>
            </div>

            <button className="w-full bubble-me py-4 rounded-2xl font-black text-slate-900 shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3">
              AUTHORIZE ACCESS
              <LogIn className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 space-y-4">
            <p className="text-center text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">External Protocols</p>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-3.5 glass-card rounded-2xl hover:bg-white/5 transition-colors text-white border-white/5">
                <span className="text-xs font-black uppercase tracking-widest">Google</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-3.5 glass-card rounded-2xl hover:bg-white/5 transition-colors text-white border-white/5">
                <Github className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">GitHub</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-white/5 py-16 mt-12">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/30">
          <Shield className="w-5 h-5 fill-primary/20" />
        </div>
        <span className="text-lg font-black tracking-tighter uppercase text-white neon-glow">CyberChat</span>
      </div>

      <div className="flex flex-wrap justify-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {['Privacy', 'Transparency', 'API Keys', 'Status'].map((item) => (
          <a key={item} href="#" className="hover:text-primary transition-colors">{item}</a>
        ))}
      </div>

      <div className="flex gap-4">
        <button className="w-11 h-11 rounded-2xl glass-card flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/40 transition-all">
          <Share2 className="w-5 h-5" />
        </button>
        <button className="w-11 h-11 rounded-2xl glass-card flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/40 transition-all">
          <Mail className="w-5 h-5" />
        </button>
      </div>
    </div>
    <div className="text-center mt-12 text-[10px] font-bold text-slate-700 uppercase tracking-[0.3em]">
      © 2024 CyberChat Encrypted Systems • Built for a secure tomorrow
    </div>
  </footer>
);

export default function App() {
  return (
    <div className="min-h-screen relative overflow-x-hidden pt-6">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6">
        <Hero />
        <Features />
        <AuthSection />
      </main>
      <Footer />
    </div>
  );
}
