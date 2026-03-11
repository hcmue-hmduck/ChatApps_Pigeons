/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Bolt, 
  MessageSquare, 
  Users, 
  Phone, 
  Settings, 
  Search, 
  Video, 
  MoreVertical, 
  PlusCircle, 
  Smile, 
  Send, 
  User, 
  Bell, 
  FileText, 
  TableProperties,
  CheckCheck
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  return (
    <div className="flex h-full w-full p-4 gap-4">
      {/* Sidebar Navigation */}
      <aside className="w-20 flex flex-col items-center py-8 gap-8 glass-panel rounded-2xl">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,242,255,0.3)]">
          <Bolt size={28} />
        </div>
        <nav className="flex flex-col gap-6 flex-1">
          <button className="p-3 rounded-xl text-primary bg-primary/10 border border-primary/20 transition-all hover:shadow-[0_0_10px_rgba(0,242,255,0.2)]">
            <MessageSquare size={24} />
          </button>
          <button className="p-3 rounded-xl text-slate-500 hover:text-primary transition-colors">
            <Users size={24} />
          </button>
          <button className="p-3 rounded-xl text-slate-500 hover:text-primary transition-colors">
            <Phone size={24} />
          </button>
          <button className="p-3 rounded-xl text-slate-500 hover:text-primary transition-colors">
            <Settings size={24} />
          </button>
        </nav>
        <div className="mt-auto">
          <div className="w-10 h-10 rounded-full border border-white/10 p-0.5">
            <img 
              className="w-full h-full rounded-full object-cover" 
              src="https://picsum.photos/seed/user-profile/100/100" 
              alt="User profile"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </aside>

      {/* Chat List Column */}
      <section className="w-80 flex flex-col glass-panel rounded-2xl overflow-hidden">
        <div className="p-6">
          <h1 className="text-xl font-bold mb-6 tracking-wide neon-glow">Messages</h1>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary/50 focus:border-primary/50 text-slate-200 outline-none transition-all" 
              placeholder="Search conversations" 
              type="text" 
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-2">
          {/* Active Chat Item */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 cursor-pointer neon-border transition-all">
            <div className="relative">
              <img 
                className="w-12 h-12 rounded-full border border-primary/40 p-0.5" 
                src="https://picsum.photos/seed/alex/100/100" 
                alt="Alex Rivers"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 shadow-[0_0_8px_#4ade80]"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="font-semibold truncate text-sm">Alex Rivers</h3>
                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">12:45 PM</span>
              </div>
              <p className="text-xs text-primary/80 font-medium truncate">Typing...</p>
            </div>
          </div>
          {/* Chat Item */}
          <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer transition-all">
            <div className="relative">
              <img 
                className="w-12 h-12 rounded-full border border-white/5" 
                src="https://picsum.photos/seed/team/100/100" 
                alt="Cyber Design Team"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="font-semibold truncate text-sm">Cyber Design Team</h3>
                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">09:12 AM</span>
              </div>
              <p className="text-xs text-slate-500 truncate">Liam: The glass effect looks great!</p>
            </div>
            <div className="w-5 h-5 bg-primary/20 border border-primary/40 rounded-full flex items-center justify-center text-[10px] font-bold text-primary">2</div>
          </div>
          {/* More Chat Items */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 border border-transparent cursor-pointer transition-all">
              <img 
                className="w-12 h-12 rounded-full opacity-60 border border-white/5" 
                src={`https://picsum.photos/seed/contact-${i}/100/100`} 
                alt="Contact"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-semibold truncate text-sm">Contact {i}</h3>
                  <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Yesterday</span>
                </div>
                <p className="text-xs text-slate-500 truncate">Latest message preview goes here...</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Chat Window */}
      <main className="flex-1 flex flex-col glass-panel rounded-2xl relative overflow-hidden">
        {/* Chat Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img 
                className="w-10 h-10 rounded-full border border-primary/30 p-0.5" 
                src="https://picsum.photos/seed/alex/100/100" 
                alt="Active contact"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-slate-900 shadow-[0_0_8px_#4ade80]"></div>
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide">Alex Rivers</h2>
              <p className="text-[10px] text-green-400 uppercase tracking-widest font-bold neon-glow">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg text-slate-400 hover:text-primary transition-all">
              <Video size={20} />
            </button>
            <button className="p-2 rounded-lg text-slate-400 hover:text-primary transition-all">
              <Phone size={20} />
            </button>
            <button className="p-2 rounded-lg text-slate-400 hover:text-primary transition-all">
              <MoreVertical size={20} />
            </button>
          </div>
        </header>

        {/* Message Flow */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Received Message */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4 max-w-[80%]"
          >
            <img 
              className="w-8 h-8 rounded-full border border-white/10" 
              src="https://picsum.photos/seed/alex/100/100" 
              alt="Alex Rivers"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col gap-2">
              <div className="glass-card rounded-2xl rounded-tl-none px-5 py-3 shadow-xl">
                <p className="text-sm leading-relaxed text-slate-300">Hey! Did you check out the new dark mode aesthetic for the project? 🎨</p>
              </div>
              <span className="text-[10px] text-slate-600 uppercase tracking-tighter">12:30 PM</span>
            </div>
          </motion.div>

          {/* Received Message with Image */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-4 max-w-[80%]"
          >
            <img 
              className="w-8 h-8 rounded-full border border-white/10" 
              src="https://picsum.photos/seed/alex/100/100" 
              alt="Alex Rivers"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col gap-3">
              <div className="glass-card rounded-2xl rounded-tl-none p-2 shadow-2xl">
                <img 
                  className="rounded-xl w-full object-cover max-h-64 opacity-90 hover:opacity-100 transition-opacity cursor-zoom-in" 
                  src="https://picsum.photos/seed/design-concept/600/400" 
                  alt="UI design concept"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="glass-card rounded-2xl rounded-tl-none px-5 py-3 shadow-xl">
                <p className="text-sm leading-relaxed text-slate-300">I'm thinking about using this glassmorphism effect for the dashboard panels. What do you think?</p>
              </div>
              <div className="flex gap-2">
                <div className="reaction-pill px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-2">
                  <span>🔥</span> <span className="text-slate-400">4</span>
                </div>
                <div className="reaction-pill px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-2">
                  <span>❤️</span> <span className="text-slate-400">1</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sent Message */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-start gap-4 max-w-[80%] ml-auto flex-row-reverse"
          >
            <div className="flex flex-col items-end gap-2">
              <div className="message-gradient rounded-2xl rounded-tr-none px-5 py-3 shadow-[0_0_20px_rgba(0,242,255,0.05)]">
                <p className="text-sm leading-relaxed text-white">That looks incredible! The neon glows really pop against that deep background. Let's definitely go with that. 🚀</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 uppercase tracking-tighter">
                <span>12:45 PM</span>
                <CheckCheck size={14} className="text-primary" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Message Input - Floating Capsule */}
        <div className="p-8">
          <div className="glass-card rounded-full flex items-center px-5 py-2.5 gap-4 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <button className="text-slate-500 hover:text-primary transition-colors flex items-center justify-center">
              <PlusCircle size={24} strokeWidth={1.5} />
            </button>
            <input 
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-200 placeholder-slate-600 outline-none" 
              placeholder="Type a message..." 
              type="text" 
            />
            <div className="flex items-center gap-3">
              <button className="text-slate-500 hover:text-primary transition-colors flex items-center justify-center">
                <Smile size={24} strokeWidth={1.5} />
              </button>
              <button className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-slate-900 transition-all shadow-[0_0_10px_rgba(0,242,255,0.2)]">
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Right Hand Panel: Shared Media */}
      <aside className="w-72 glass-panel rounded-2xl flex flex-col overflow-hidden">
        <div className="p-8 text-center border-b border-white/10">
          <div className="relative inline-block mb-4">
            <img 
              className="w-24 h-24 rounded-full border-2 border-primary/20 p-1.5" 
              src="https://picsum.photos/seed/alex/200/200" 
              alt="Alex Rivers profile"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-400 rounded-full border-4 border-slate-900 shadow-[0_0_10px_#4ade80]"></div>
          </div>
          <h3 className="font-bold text-lg tracking-wide neon-glow">Alex Rivers</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-6">Lead Product Designer</p>
          <div className="flex justify-center gap-4">
            <button className="w-10 h-10 rounded-full glass-card text-slate-400 flex items-center justify-center hover:text-primary hover:border-primary/40 transition-all">
              <User size={20} />
            </button>
            <button className="w-10 h-10 rounded-full glass-card text-slate-400 flex items-center justify-center hover:text-primary hover:border-primary/40 transition-all">
              <Bell size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shared Media</h4>
              <button className="text-primary text-[10px] font-bold uppercase tracking-tighter">View All</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <img 
                  key={i}
                  className="rounded-lg aspect-square object-cover border border-white/5 opacity-80 hover:opacity-100 transition-opacity" 
                  src={`https://picsum.photos/seed/media-${i}/150/150`} 
                  alt="Shared media"
                  referrerPolicy="no-referrer"
                />
              ))}
              <div className="rounded-lg aspect-square glass-card flex items-center justify-center text-primary text-[10px] font-bold">+12</div>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 px-1">Shared Files</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl glass-card hover:border-primary/30 transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate text-slate-200">Brand_Guidelines.pdf</p>
                  <p className="text-[10px] text-slate-600">4.2 MB • Oct 12</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl glass-card hover:border-primary/30 transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <TableProperties size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate text-slate-200">User_Feedback_Q3.xlsx</p>
                  <p className="text-[10px] text-slate-600">1.8 MB • Oct 10</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
