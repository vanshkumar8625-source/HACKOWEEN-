import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Globe } from '../components/3d/Globe';
import {
  Activity, ArrowRight, BrainCircuit, Radar,
  ShieldCheck, Zap, AlertTriangle, Radio, Sparkles
} from 'lucide-react';
import { GlassPanel } from '../components/ui/GlassPanel';
import { ResQGridLogo } from '../components/ui/ResQGridLogo';

export default function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  const { scrollY } = useScroll();
  const globeY = useTransform(scrollY, [0, 1000], [0, 300]);
  const [stats, setStats] = useState({
    incidentsTracked: 1420,
    evacRoutesActive: 48,
    avgResponseLatency: 0.6
  });

  useEffect(() => {
    // Subtle incrementing of live decisions
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        incidentsTracked: prev.incidentsTracked + Math.floor(Math.random() * 2)
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative font-sans selection:bg-teal-500/30">
      
      {/* 3D Background - Parallax */}
      <motion.div style={{ y: globeY }} className="fixed inset-0 z-0 opacity-35 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <Globe />
        </Canvas>
      </motion.div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="container mx-auto px-6 h-16 flex justify-between items-center">
          <ResQGridLogo size="md" />
          
          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Intelligence Grid Active
            </span>
            <button 
              onClick={onLaunch} 
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold transition-all text-xs tracking-wide shadow-[0_0_15px_rgba(20,184,166,0.25)] cursor-pointer flex items-center gap-1.5"
            >
              <span>Access Operations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-36 pb-20 px-6 container mx-auto flex flex-col items-center text-center min-h-[88vh] justify-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs font-semibold uppercase tracking-widest shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span>ResQGrid Autonomous Platform v2.5</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-display font-black tracking-tight mb-6 leading-[1.1] max-w-5xl"
        >
          AI-Powered Disaster Intelligence <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-400 to-cyan-400">
            & Emergency Response Platform
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="mb-6 text-xl sm:text-2xl font-display font-bold text-teal-400 tracking-wide"
        >
          “Predict Early. Respond Faster. Save Lives.”
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-base sm:text-lg text-slate-400 mb-10 max-w-2xl font-normal leading-relaxed"
        >
          ResQGrid coordinates time-bound rescue operations, provides computer-vision damage assessment, predicts flood hazard vectors, and directs ground units with transparent 5-star performance tracking.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          <button 
            onClick={onLaunch}
            className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-extrabold rounded-xl shadow-[0_0_25px_rgba(20,184,166,0.35)] transition-all flex items-center justify-center space-x-2 cursor-pointer text-base"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button 
            onClick={onLaunch}
            className="px-8 py-4 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer text-base shadow-sm"
          >
            View Live Grid Operations
          </button>
        </motion.div>
      </section>

      {/* Live Operational Metrics Banner */}
      <section className="relative z-10 border-y border-slate-800/80 bg-slate-900/60 backdrop-blur-md py-8">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
          <div>
            <div className="text-3xl sm:text-4xl font-display font-bold text-teal-400 mb-1">{stats.incidentsTracked.toLocaleString()}</div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Verified Emergency Missions</div>
          </div>
          <div className="pt-8 md:pt-0">
            <div className="text-3xl sm:text-4xl font-display font-bold text-emerald-400 mb-1">{stats.evacRoutesActive} Active</div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Dynamic Evacuation Corridors</div>
          </div>
          <div className="pt-8 md:pt-0">
            <div className="text-3xl sm:text-4xl font-display font-bold text-cyan-400 mb-1">&lt; {stats.avgResponseLatency}s</div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Autonomous Triage Latency</div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="relative z-10 py-24 container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-display font-bold mb-4 text-white">
            Unprecedented <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Situational Intelligence</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            ResQGrid synthesizes IoT hydrology sensors, road-hazard telemetry, and ground responder coordinates into a single pane of glass during complex crises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Card 1 */}
          <GlassPanel className="col-span-1 md:col-span-2 md:row-span-2 flex flex-col justify-end p-8 sm:p-10 min-h-[380px] bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/80">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-6">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-3 text-white">Time-Bound Rescue Deadlines & ETAs</h3>
            <p className="text-slate-300 text-base max-w-lg leading-relaxed">
              Every emergency receives a deterministic response deadline derived from incident severity and transit physics. Arrival and victim rescue are tracked as independent operational events to ensure complete ground accountability.
            </p>
          </GlassPanel>

          {/* Card 2 */}
          <GlassPanel className="col-span-1 min-h-[190px] p-6 bg-slate-900/80 border border-slate-800/80">
            <Radar className="w-7 h-7 text-cyan-400 mb-3" />
            <h3 className="text-lg font-display font-bold mb-2 text-white">Live Operations Map</h3>
            <p className="text-slate-400 text-xs leading-relaxed">MapLibre GL vector tracking of active casualties, accessible shelters, and flooded road bypasses.</p>
          </GlassPanel>

          {/* Card 3 */}
          <GlassPanel className="col-span-1 min-h-[190px] p-6 bg-slate-900/80 border border-slate-800/80">
            <BrainCircuit className="w-7 h-7 text-amber-400 mb-3" />
            <h3 className="text-lg font-display font-bold mb-2 text-white">AI Voice SOS (Bilingual)</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Conversational intake in English and Hindi extracting location, injuries, and necessary equipment automatically.</p>
          </GlassPanel>

          {/* Card 4 */}
          <GlassPanel className="col-span-1 min-h-[190px] p-6 bg-slate-900/80 border border-slate-800/80">
            <ShieldCheck className="w-7 h-7 text-emerald-400 mb-3" />
            <h3 className="text-lg font-display font-bold mb-2 text-white">Fair Team Accountability</h3>
            <p className="text-slate-400 text-xs leading-relaxed">5-star rating system with automatic protections against penalties when disasters render roads impassable.</p>
          </GlassPanel>

          {/* Card 5 */}
          <GlassPanel className="col-span-1 md:col-span-2 min-h-[190px] p-6 flex items-center bg-slate-900/80 border border-slate-800/80">
            <div className="flex-1">
              <Zap className="w-7 h-7 text-teal-400 mb-3" />
              <h3 className="text-lg font-display font-bold mb-2 text-white">Dynamic Evacuation Replanning</h3>
              <p className="text-slate-400 text-xs max-w-xl leading-relaxed">
                When flood waters breach safety thresholds, OSRM automatically calculates perimeter detours and diverts evacuees to shelters with confirmed bed vacancies.
              </p>
            </div>
          </GlassPanel>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 border-t border-slate-800/80 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-5xl font-display font-bold mb-4 text-white">
            Ready to initiate crisis response?
          </h2>
          <p className="text-slate-400 text-base mb-8 max-w-md mx-auto">
            Launch the ResQGrid central command center to monitor real-time telemetry and dispatch rescue reinforcements.
          </p>
          <button 
            onClick={onLaunch}
            className="px-9 py-4 bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-extrabold rounded-xl shadow-xl hover:scale-105 transition-all text-base cursor-pointer"
          >
            Enter Command Center
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400">
          <div className="mb-4 md:mb-0">
            <ResQGridLogo size="sm" showTagline={true} />
          </div>
          <div className="text-slate-500">
            © 2026 ResQGrid — AI-Powered Disaster Intelligence & Response Platform.
          </div>
        </div>
      </footer>

    </div>
  );
}
