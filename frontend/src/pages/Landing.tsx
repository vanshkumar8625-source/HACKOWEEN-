import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Globe } from '../components/3d/Globe';
import { Activity, Network, ArrowRight, BrainCircuit, Radar, ShieldCheck, Zap } from 'lucide-react';
import { GlassPanel } from '../components/ui/GlassPanel';

export default function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  const { scrollY } = useScroll();
  const globeY = useTransform(scrollY, [0, 1000], [0, 300]);
  const [stats, setStats] = useState({ agents: 12, decisions: 4021, time: 0.8 });

  useEffect(() => {
    // Fake live incrementing stats
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        decisions: prev.decisions + Math.floor(Math.random() * 3)
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-obsidian text-warm-white relative font-sans">
      
      {/* 3D Background - Parallax */}
      <motion.div style={{ y: globeY }} className="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <Globe />
        </Canvas>
      </motion.div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-obsidian/80 backdrop-blur-md border-b border-zinc-800">
        <div className="container mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="ResQNet Logo" className="w-7 h-7 object-contain" />
            <h1 className="text-xl font-display font-bold tracking-tight">ResQNet</h1>
          </div>
          <button 
            onClick={onLaunch} 
            className="px-5 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-warm-white transition-all text-sm font-medium cursor-pointer"
          >
            Access Operations
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-20 px-6 container mx-auto flex flex-col items-center text-center min-h-[90vh] justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-400 text-xs font-semibold uppercase tracking-widest"
        >
          <Activity className="w-4 h-4" />
          <span>v2.0 Neural Engine Live</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 leading-tight max-w-4xl"
        >
          Autonomous Intelligence for <br />
          <span className="text-gradient-primary">Global Disaster Response</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-steel-gray mb-10 max-w-2xl font-light leading-relaxed"
        >
          Coordinate rescue operations, predict hazards, and route medical resources in real-time using a 12-agent AI swarm.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button 
            onClick={onLaunch}
            className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-obsidian font-semibold rounded-lg shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all flex items-center justify-center space-x-2 cursor-pointer text-lg"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-warm-white font-semibold rounded-lg border border-zinc-700 transition-all cursor-pointer text-lg">
            View Architecture
          </button>
        </motion.div>
      </section>

      {/* Live Stats Banner */}
      <section className="relative z-10 border-y border-zinc-800 bg-zinc-900/50 backdrop-blur-sm py-8">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-zinc-800">
          <div>
            <div className="text-4xl font-display font-bold text-teal-400 mb-2">{stats.agents}</div>
            <div className="text-steel-gray text-sm font-medium uppercase tracking-wider">Active Neural Agents</div>
          </div>
          <div className="pt-8 md:pt-0">
            <div className="text-4xl font-display font-bold text-indigo-400 mb-2">{stats.decisions.toLocaleString()}</div>
            <div className="text-steel-gray text-sm font-medium uppercase tracking-wider">Live Decisions Made</div>
          </div>
          <div className="pt-8 md:pt-0">
            <div className="text-4xl font-display font-bold text-teal-400 mb-2">{stats.time}s</div>
            <div className="text-steel-gray text-sm font-medium uppercase tracking-wider">Avg Swarm Latency</div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="relative z-10 py-32 container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Unprecedented <span className="text-gradient">Situational Awareness</span></h2>
          <p className="text-steel-gray text-lg max-w-2xl mx-auto">Our multi-agent system processes thousands of live data points to give you absolute clarity during chaotic emergencies.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Card 1 */}
          <GlassPanel className="col-span-1 md:col-span-2 md:row-span-2 flex flex-col justify-end p-10 min-h-[400px] bg-gradient-to-br from-zinc-900 to-slate-900">
            <Network className="w-10 h-10 text-teal-500 mb-6" />
            <h3 className="text-2xl font-display font-bold mb-3">12-Agent Neural Swarm</h3>
            <p className="text-steel-gray text-lg max-w-md">Led by a Commander Agent, a swarm of 12 specialized models (including Supply Chain, Social Media, and Risk Prediction) collaborate instantly to formulate comprehensive rescue strategies.</p>
          </GlassPanel>

          {/* Card 2 */}
          <GlassPanel className="col-span-1 min-h-[200px]">
            <Radar className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">Live Map Telemetry</h3>
            <p className="text-steel-gray text-sm">Real-time geospatial tracking of active hazards and resources.</p>
          </GlassPanel>

          {/* Card 3 */}
          <GlassPanel className="col-span-1 min-h-[200px]">
            <BrainCircuit className="w-8 h-8 text-amber-500 mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">Predictive Risk</h3>
            <p className="text-steel-gray text-sm">Anticipate secondary disasters before they occur.</p>
          </GlassPanel>

          {/* Card 4 */}
          <GlassPanel className="col-span-1 min-h-[200px]">
            <ShieldCheck className="w-8 h-8 text-teal-400 mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">Enterprise Security</h3>
            <p className="text-steel-gray text-sm">Role-based access, automated PII data masking, and strict API audit logging.</p>
          </GlassPanel>

          {/* Card 5 */}
          <GlassPanel className="col-span-1 md:col-span-2 min-h-[200px] flex items-center">
            <div className="flex-1">
              <Zap className="w-8 h-8 text-teal-500 mb-4" />
              <h3 className="text-xl font-display font-bold mb-2">MCP Server Plugin Architecture</h3>
              <p className="text-steel-gray text-sm max-w-sm">Built on Model Context Protocol. Agents seamlessly invoke external APIs for Live Routing, Weather Data, and Hospital Database Queries.</p>
            </div>
          </GlassPanel>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 border-t border-zinc-800 bg-gradient-to-b from-obsidian to-zinc-900">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-8">Ready to initiate operations?</h2>
          <button 
            onClick={onLaunch}
            className="px-10 py-5 bg-warm-white text-obsidian font-bold rounded-lg shadow-xl hover:scale-105 transition-all text-lg cursor-pointer"
          >
            Enter Command Center
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800 bg-obsidian py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-steel-gray">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <img src="/logo.png" alt="ResQNet Logo" className="w-5 h-5 object-contain" />
            <span className="font-display font-semibold text-warm-white">ResQNet</span>
          </div>
          <div>© 2026 ResQNet Operations. All systems normal.</div>
        </div>
      </footer>

    </div>
  );
}
