import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Send, X, AlertTriangle, ShieldCheck,
  Volume2, CheckCircle2, Search, ArrowRight, Sparkles, RefreshCw, FileText
} from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated?: () => void;
  apiUrl?: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onIncidentCreated,
  apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
}) => {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    timestamp: string;
    extracted?: any;
    safetyTips?: string[];
    referenceCode?: string;
  }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [canSubmit, setCanSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdRef, setCreatedRef] = useState<string | null>(null);
  const [statusQuery, setStatusQuery] = useState('');
  const [statusResult, setStatusResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'status'>('chat');

  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: language === 'en'
            ? "Hello! I am your Autonomous Emergency Rescue Assistant. You can speak into your microphone or type your situation. I will extract your location, people affected, and needed rescue resources."
            : "Namaste! Main aapka Disaster Response AI Assistant hoon. Aap mic daba kar bol sakte hain ya message type kar sakte hain. Main aapki location, log aur zaroori sahayata control room ko bhejunga.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          safetyTips: [
            "In flooding, move to higher floors immediately.",
            "Do not walk or drive through moving water.",
            "Stay away from downed power lines."
          ]
        }
      ]);
    }
  }, [language]);

  // Setup Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setSpeechTranscript(transcript);
        setInputMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, extractedData]);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please type your message or try the simulated examples below.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setSpeechTranscript('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Mic start error:", err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const msg = (textToSend || inputMessage).trim();
    if (!msg) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user' as const,
      text: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setSpeechTranscript('');

    try {
      const res = await fetch(`${apiUrl}/api/ai-assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          language,
          is_voice: isListening || speechTranscript.length > 0
        })
      });

      if (!res.ok) throw new Error("Failed connecting to assistant");
      const data = await res.json();

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant' as const,
        text: language === 'hi' && data.reply_hi ? data.reply_hi : data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        extracted: data.extracted_data,
        safetyTips: data.safety_tips
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (data.extracted_data) {
        setExtractedData(data.extracted_data);
        setMissingFields(data.missing_fields || []);
        setCanSubmit(data.can_submit);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: "Sorry, I had trouble processing that request. Please type your emergency details directly.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const handleConfirmAndSubmit = async () => {
    if (!extractedData) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/ai-assistant/submit-voice-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: extractedData.title,
          disaster_type: extractedData.disaster_type,
          severity: extractedData.severity,
          location_name: extractedData.location_name,
          latitude: extractedData.latitude,
          longitude: extractedData.longitude,
          description: `AI Assistant Report: ${extractedData.raw_text || ''}`,
          people_affected: extractedData.people_affected,
          casualties_count: extractedData.casualties_count,
          required_skill: extractedData.required_skill,
          voice_transcript: extractedData.raw_text,
          reported_by: language === 'hi' ? 'Citizen Voice SOS (Hindi)' : 'Citizen Voice SOS'
        })
      });

      if (!res.ok) throw new Error("Submission failed");
      const inc = await res.json();
      const ref = `INC-${inc.id.toString().padStart(4, '0')}`;
      setCreatedRef(ref);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'assistant',
        text: language === 'hi'
          ? `Emergency SOS safalta-poorvak darj ho gaya hai! Aapka Reference Number hai: #${ref}. Response deadline nirdharit ho gayi hai aur control room ko alert bhej diya gaya hai.`
          : `Emergency SOS successfully submitted to Central Command! Your reference ticket is #${ref}. A response deadline has been computed and dispatch teams have been alerted.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        referenceCode: ref,
        safetyTips: [
          "Conserve phone battery; do not stream heavy media.",
          "Signal with a bright cloth or whistle if you hear rescue teams."
        ]
      }]);

      setExtractedData(null);
      if (onIncidentCreated) onIncidentCreated();
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusQuery.trim()) return;

    try {
      const res = await fetch(`${apiUrl}/api/ai-assistant/status/${encodeURIComponent(statusQuery.trim())}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Incident not found");
      }
      const data = await res.json();
      setStatusResult(data);
    } catch (err: any) {
      alert(err.message);
      setStatusResult(null);
    }
  };

  // Preset demo speech examples for easy teacher demonstration
  const demoVoiceExamples = [
    {
      label: "Hindi Flood Voice Report",
      text: "Main flood mein phansa hua hoon. Mere paas teen log hain. Humein medical help chahiye. Hamari location Shivaji Nagar Pune."
    },
    {
      label: "English Critical Flood SOS",
      text: "Emergency! Water rising fast at Sangam Bridge Pune Riverside. 5 people stranded on rooftop with elderly person injured. Need rescue boat immediately!"
    },
    {
      label: "Fire & Extrication SOS",
      text: "Fire outbreak in Deccan commercial warehouse, 2 people trapped behind smoke, need fire brigade and breathing gear."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl h-[90vh] max-h-[750px] shadow-2xl flex flex-col overflow-hidden relative font-sans">
        
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-zinc-950 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  AI Emergency Voice Assistant
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-semibold">
                  Meesho-Style Fast SOS
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Voice & Text Triage • English & Hindi • Grounded Dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Selector */}
            <div className="flex bg-zinc-800 rounded-lg p-0.5 border border-zinc-700 text-xs">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded font-semibold transition ${
                  language === 'en' ? 'bg-teal-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-2.5 py-1 rounded font-semibold transition ${
                  language === 'hi' ? 'bg-teal-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Bar */}
        <div className="px-4 py-2 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'chat'
                  ? 'bg-zinc-800 text-teal-300 border border-teal-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice & Chat SOS</span>
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'status'
                  ? 'bg-zinc-800 text-teal-300 border border-teal-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Check Incident Status</span>
            </button>
          </div>

          <span className="text-[10px] text-zinc-500 hidden sm:inline">
            Fast Voice Intake • No Typing Needed
          </span>
        </div>

        {/* Tab 1: Voice & Chat Assistance */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Quick Demo Voice Prompts for Teachers */}
            <div className="px-4 py-2 bg-zinc-950/40 border-b border-zinc-800/80 overflow-x-auto flex items-center gap-2 custom-scrollbar shrink-0">
              <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0">
                Demo Voice Clips:
              </span>
              {demoVoiceExamples.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputMessage(ex.text);
                    handleSendMessage(ex.text);
                  }}
                  className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-teal-300 rounded-full text-[10px] whitespace-nowrap transition border border-zinc-700/60 flex items-center gap-1 shrink-0"
                >
                  <Volume2 className="w-3 h-3 text-teal-400" />
                  <span>{ex.label}</span>
                </button>
              ))}
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar bg-zinc-950/30">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-teal-600 text-white rounded-br-none'
                        : 'bg-zinc-800/90 border border-zinc-700/80 text-zinc-200 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    
                    {/* Safety Tips Card */}
                    {msg.safetyTips && msg.safetyTips.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-700/60 text-[11px] space-y-1">
                        <div className="font-bold text-amber-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Life Safety Guidance:
                        </div>
                        {msg.safetyTips.map((tip, i) => (
                          <div key={i} className="text-zinc-300 flex items-start gap-1.5">
                            <span className="text-teal-400 shrink-0">•</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reference Confirmation Card */}
                    {msg.referenceCode && (
                      <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {msg.referenceCode}
                        </span>
                        <span className="text-[10px] text-emerald-300">
                          Disaster Control Center Alerted
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-zinc-500 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {/* Extracted Entity Review Preview Card (Before submission) */}
              {extractedData && (
                <div className="p-4 bg-teal-950/30 border-2 border-teal-500/40 rounded-xl space-y-3 animate-slideUp">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-300 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-400" /> Extracted Emergency Details
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      extractedData.severity === 'Critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-zinc-950'
                    }`}>
                      {extractedData.severity} Severity
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-zinc-300 font-medium">
                    <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800">
                      <span className="text-zinc-500 block text-[9px] uppercase">Type</span>
                      <span className="capitalize text-white font-bold">{extractedData.disaster_type}</span>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800">
                      <span className="text-zinc-500 block text-[9px] uppercase">Location</span>
                      <span className="text-teal-300 font-bold truncate block">{extractedData.location_name}</span>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800">
                      <span className="text-zinc-500 block text-[9px] uppercase">People Stranded</span>
                      <span className="text-white font-bold font-mono">{extractedData.people_affected} person(s)</span>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800">
                      <span className="text-zinc-500 block text-[9px] uppercase">Casualties / Injured</span>
                      <span className="text-amber-400 font-bold font-mono">{extractedData.casualties_count} reported</span>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800 sm:col-span-2">
                      <span className="text-zinc-500 block text-[9px] uppercase">Primary Rescue Skill</span>
                      <span className="text-indigo-300 font-bold">{extractedData.required_skill}</span>
                    </div>
                  </div>

                  {missingFields.length > 0 && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Missing: {missingFields.join(', ')} (You may still submit incomplete in critical danger)</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      onClick={() => setExtractedData(null)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition"
                    >
                      Edit Report
                    </button>
                    <button
                      onClick={handleConfirmAndSubmit}
                      disabled={submitting}
                      className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-zinc-950 font-bold rounded-lg text-xs shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submitting ? 'Submitting SOS...' : 'Confirm & Dispatch Rescue'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Live Audio Listening Bar */}
            {isListening && (
              <div className="px-4 py-2.5 bg-red-950/80 border-t border-red-800 flex items-center justify-between text-xs animate-pulse">
                <div className="flex items-center space-x-2 text-red-200">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="font-bold">Listening for emergency speech in {language === 'hi' ? 'Hindi' : 'English'}...</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-300 truncate max-w-[280px]">
                  {speechTranscript || "Speak your location and emergency..."}
                </span>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center space-x-2 shrink-0">
              {/* Mic Button */}
              <button
                onClick={toggleListening}
                className={`p-3 rounded-xl transition shadow-lg shrink-0 flex items-center justify-center ${
                  isListening
                    ? 'bg-red-600 text-white animate-bounce'
                    : 'bg-zinc-800 text-teal-400 hover:bg-zinc-700 border border-zinc-700'
                }`}
                title={isListening ? "Stop Listening" : "Press to Speak"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  language === 'hi'
                    ? "Emergency details bolen ya likhen (e.g. Flood Pune Riverside mein 3 log)..."
                    : "Speak or type emergency details (e.g. Trapped in flood Pune Riverside 3 people)..."
                }
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-zinc-500"
              />

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim()}
                className="p-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-xl transition shadow shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Check Incident Status */}
        {activeTab === 'status' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                Verified Incident Tracker
              </h3>
              <p className="text-xs text-zinc-400">
                Check verified live dispatch status, response deadlines, and expected arrival time (ETA).
              </p>
            </div>

            <form onSubmit={handleCheckStatus} className="flex gap-2">
              <input
                type="text"
                required
                value={statusQuery}
                onChange={e => setStatusQuery(e.target.value)}
                placeholder="Enter Incident ID or Reference (e.g. INC-0001 or 1)"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                Track
              </button>
            </form>

            {statusResult && (
              <div className="p-5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <span className="font-mono text-teal-400 font-bold text-xs">{statusResult.reference}</span>
                    <h4 className="font-bold text-sm text-zinc-100">{statusResult.title}</h4>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                    statusResult.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {statusResult.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block uppercase">Assigned Team</span>
                    <span className="font-semibold text-zinc-200">{statusResult.assigned_team}</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block uppercase">Response Deadline</span>
                    <span className="font-mono font-bold text-red-400">{statusResult.response_deadline}</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block uppercase">Estimated Arrival (ETA)</span>
                    <span className="font-mono font-bold text-teal-400">{statusResult.estimated_arrival}</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block uppercase">Location</span>
                    <span className="font-semibold text-zinc-200">{statusResult.location_name}</span>
                  </div>
                </div>

                {statusResult.actual_arrival_at && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Team confirmed arrival on scene at {statusResult.actual_arrival_at}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
