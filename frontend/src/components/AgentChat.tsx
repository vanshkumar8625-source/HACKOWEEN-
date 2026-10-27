import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

type Message = {
  id: string;
  agent: string;
  status: 'STARTED' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  details: string;
  timestamp: string;
};

export const AgentChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', agent: 'System', status: 'STARTED', details: 'Listening for Neural Swarm telemetry on secure socket...', timestamp: new Date().toLocaleTimeString() }
  ]);
  const [criticalError, setCriticalError] = useState<{agent: string, message: string} | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to FastAPI Socket.IO server
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    socketRef.current = io(apiUrl, {
      path: '/socket.io'
    });

    socketRef.current.on('connect', () => {
      setMessages(prev => [...prev, { id: Date.now().toString(), agent: 'System', status: 'COMPLETED', details: 'Socket connected. Awaiting mission parameters.', timestamp: new Date().toLocaleTimeString() }]);
    });

    socketRef.current.on('agent_update', (data: any) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + Math.random(),
        agent: data.agent,
        status: data.status,
        details: data.details,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      if (data.status === 'ERROR') {
        setCriticalError({ agent: data.agent, message: data.details });
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const getAgentColor = (agent: string) => {
    if (agent === 'WeatherAgent') return 'bg-medical-cyan/10 border-medical-cyan text-medical-cyan';
    if (agent === 'CommanderAgent') return 'bg-emergency-orange/10 border-emergency-orange text-emergency-orange';
    if (agent === 'RoadAgent') return 'bg-rescue-red/10 border-rescue-red text-rescue-red';
    return 'bg-storm-700/50 border-steel-gray text-warm-white';
  };

  return (
    <>
      <AnimatePresence>
        {criticalError && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-obsidian/90 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-navy-950 border-2 border-rescue-red/50 rounded-xl shadow-[0_0_50px_rgba(244,63,94,0.3)] max-w-lg w-full p-8 flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-rescue-red shadow-[0_0_10px_rgba(244,63,94,1)] animate-pulse"></div>
              <AlertTriangle className="w-20 h-20 text-rescue-red mb-6 animate-pulse" />
              <h2 className="text-2xl font-display font-bold text-warm-white mb-2">SYSTEM FAILURE</h2>
              <p className="text-sm font-semibold text-rescue-red mb-6 uppercase tracking-wider">{criticalError.agent} DISCONNECTED</p>
              
              <div className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded text-left mb-8">
                <p className="text-sm text-steel-gray font-mono">{criticalError.message}</p>
              </div>
              
              <button 
                onClick={() => setCriticalError(null)}
                className="px-6 py-2 bg-rescue-red/10 text-rescue-red border border-rescue-red/30 rounded font-bold hover:bg-rescue-red/20 transition-all uppercase text-sm tracking-wider"
              >
                Acknowledge & Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex flex-col h-full bg-navy-950 overflow-hidden font-sans border-l border-storm-700 relative w-full">
        
        <div className="p-4 border-b border-storm-700 bg-navy-900 flex justify-between items-center z-10">
        <h3 className="font-display font-semibold text-sm tracking-wide text-warm-white flex items-center">
          <Network className="w-4 h-4 mr-2 text-medical-cyan" />
          Decision Pathway
        </h3>
        <span className="flex items-center space-x-2 bg-green-900/20 px-2 py-1 rounded">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-medium text-green-400 uppercase tracking-wide">Live</span>
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10 bg-navy-950">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col p-4 rounded border-l-4 shadow-sm bg-storm-800 ${msg.status === 'ERROR' ? 'border-rescue-red shadow-[0_0_15px_rgba(244,63,94,0.3)] bg-rescue-red/10' : getAgentColor(msg.agent)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-display font-semibold text-sm">{msg.agent}</span>
                <span className="text-xs text-steel-gray">{msg.timestamp}</span>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex items-center
                  ${msg.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 
                    msg.status === 'PROCESSING' ? 'bg-emergency-orange/20 text-emergency-orange' : 
                    msg.status === 'ERROR' ? 'bg-rescue-red/20 text-rescue-red font-bold' :
                    'bg-storm-700 text-warm-white'}`}>
                  {msg.status === 'PROCESSING' && <Loader2 className="w-3 h-3 animate-spin mr-1 inline" />}
                  {msg.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                  {msg.status === 'ERROR' && <AlertTriangle className="w-3 h-3 mr-1 inline animate-pulse" />}
                  {msg.status}
                </span>
              </div>
              <p className="text-warm-white text-sm font-light leading-relaxed opacity-90">{msg.details}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
    </>
  );
}
