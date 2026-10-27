import React, { useState } from 'react';
import {
  Mic, AlertOctagon, FileText, Search, ShieldCheck,
  CheckCircle2, AlertTriangle, Droplets, Home, PhoneCall,
  Sparkles, Compass, Clock, MapPin, ArrowRight, HeartPulse,
  Waves, Flame, Radio
} from 'lucide-react';

interface CitizenDashboardProps {
  shelters: any[];
  routes: any[];
  simStatus: any;
  onOpenVoiceSOS: () => void;
  onOpenReportModal: () => void;
  apiUrl: string;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({
  shelters,
  routes,
  simStatus,
  onOpenVoiceSOS,
  onOpenReportModal,
  apiUrl
}) => {
  const [ticketQuery, setTicketQuery] = useState('');
  const [trackedIncident, setTrackedIncident] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  // Fast Panic SOS trigger
  const [panicSubmitting, setPanicSubmitting] = useState(false);
  const [panicSuccessRef, setPanicSuccessRef] = useState<string | null>(null);

  const handleInstantPanic = async () => {
    setPanicSubmitting(true);
    setPanicSuccessRef(null);
    try {
      let lat = 18.5204;
      let lng = 73.8567;
      let locName = "Citizen Device Location (Pune Basin)";

      if (navigator.geolocation) {
        await new Promise<void>(resolve => {
          navigator.geolocation.getCurrentPosition(
            pos => {
              lat = pos.coords.latitude;
              lng = pos.coords.longitude;
              locName = `GPS Location: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
              resolve();
            },
            () => resolve(),
            { timeout: 3000 }
          );
        });
      }

      const res = await fetch(`${apiUrl}/api/ai-assistant/submit-voice-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "🚨 URGENT CITIZEN PANIC SOS",
          disaster_type: "flood",
          severity: "Critical",
          location_name: locName,
          latitude: lat,
          longitude: lng,
          people_affected: 2,
          casualties_count: 0,
          required_skill: "Search & Rescue",
          description: "Immediate 1-Tap SOS triggered by citizen via Public Portal.",
          reported_by: "Citizen 1-Tap SOS"
        })
      });

      if (!res.ok) throw new Error("Failed to dispatch panic signal");
      const data = await res.json();
      const ref = `RESQ-${data.id.toString().padStart(4, '0')}`;
      setPanicSuccessRef(ref);
      setTicketQuery(ref);
      handleTrackTicket(ref);
    } catch (err: any) {
      alert("Error submitting panic SOS: " + err.message);
    } finally {
      setPanicSubmitting(false);
    }
  };

  const handleTrackTicket = async (refToSearch?: string) => {
    const q = (refToSearch || ticketQuery).trim();
    if (!q) return;
    setTrackingLoading(true);
    setTrackingError(null);
    try {
      const res = await fetch(`${apiUrl}/api/ai-assistant/status/${encodeURIComponent(q)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ticket reference not found.");
      }
      const data = await res.json();
      setTrackedIncident(data);
    } catch (err: any) {
      setTrackingError(err.message);
      setTrackedIncident(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-y-auto custom-scrollbar font-sans">
      
      {/* Top Citizen Lifeline Banner */}
      <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-950 border-b border-red-500/30 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </span>
          <div>
            <span className="text-xs font-bold text-red-300 block">
              {language === 'en' ? 'Public Emergency Lifeline Active' : 'नागरिक आपातकालीन पोर्टल सक्रिय'}
            </span>
            <span className="text-[11px] text-slate-400">
              National Disaster Helpline: <strong className="text-white">112</strong> • Ambulance: <strong className="text-white">108</strong> • Pune Disaster Control: <strong className="text-white">020-25501269</strong>
            </span>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded font-bold transition ${
              language === 'en' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`px-3 py-1 rounded font-bold transition ${
              language === 'hi' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      <div className="max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        
        {/* Panic SOS Confirmation Alert */}
        {panicSuccessRef && (
          <div className="p-4 bg-emerald-950/80 border-2 border-emerald-500/60 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-slideUp">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">Emergency SOS Transmitted to Central Dispatch!</h4>
                <p className="text-xs text-emerald-300">
                  Your reference ticket is <strong className="font-mono text-white text-sm">#{panicSuccessRef}</strong>. An emergency response team has been alerted.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider shrink-0">
              Dispatched
            </span>
          </div>
        )}

        {/* Hero Section: 3 Primary Lifesaving Actions */}
        <div>
          <div className="text-center mb-6">
            <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase tracking-widest inline-block mb-2">
              {language === 'en' ? 'Fast Emergency Intake' : 'त्वरित आपातकालीन सहायता'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {language === 'en' ? 'How Can We Help You Right Now?' : 'हम आपकी क्या सहायता कर सकते हैं?'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {language === 'en'
                ? 'Speak in your language, trigger 1-tap GPS SOS, or report an incident for rescue dispatch.'
                : 'अपनी भाषा में बोलें, 1-क्लिक GPS SOS भेजें, या बचाव टीम के लिए घटना दर्ज करें।'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: AI Voice SOS (Primary) */}
            <div className="p-6 bg-gradient-to-br from-teal-950/60 via-slate-900 to-slate-900 border-2 border-teal-500/50 rounded-2xl shadow-xl flex flex-col justify-between hover:border-teal-400 transition group relative overflow-hidden">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-teal-500/20 group-hover:scale-105 transition">
                  <Mic className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-white">
                      {language === 'en' ? 'Bilingual Voice SOS' : 'आवाज द्वारा SOS दर्ज करें'}
                    </h3>
                    <span className="px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold">
                      Hindi / English
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {language === 'en'
                      ? 'No typing required. Speak naturally into your phone or laptop. Extracts location, trapped count, and needed help.'
                      : 'टाइप करने की जरूरत नहीं। माइक दबाकर बोलें। लोकेशन और जरूरी मदद अपने आप दर्ज होगी।'}
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenVoiceSOS}
                className="mt-5 w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>{language === 'en' ? 'LAUNCH VOICE SOS' : 'आवाज SOS शुरू करें'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Card 2: 1-Tap Fast Panic SOS */}
            <div className="p-6 bg-gradient-to-br from-red-950/60 via-slate-900 to-slate-900 border-2 border-red-500/50 rounded-2xl shadow-xl flex flex-col justify-between hover:border-red-400 transition group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shadow-lg shadow-red-600/30 group-hover:scale-105 transition">
                  <AlertOctagon className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {language === 'en' ? '1-Tap Emergency Panic SOS' : '1-क्लिक तुरंत SOS (खतरे में)'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {language === 'en'
                      ? 'In immediate, life-threatening danger? Transmit your device GPS coordinates instantly to emergency control room.'
                      : 'तत्काल गंभीर खतरे में हैं? एक क्लिक में अपनी लाइव लोकेशन कंट्रोल रूम को भेजें।'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleInstantPanic}
                disabled={panicSubmitting}
                className="mt-5 w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black rounded-xl text-xs transition shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>{panicSubmitting ? 'DISPATCHING SOS...' : language === 'en' ? 'TRIGGER INSTANT SOS' : 'तुरंत SOS भेजें'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Card 3: Detailed Incident Report */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between hover:border-slate-700 transition group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black group-hover:scale-105 transition">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {language === 'en' ? 'Submit Detailed Report' : 'विस्तृत रिपोर्ट दर्ज करें'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {language === 'en'
                      ? 'Submit specific details via web form: disaster type, landmark address, photos, and required relief supplies.'
                      : 'वेब फॉर्म द्वारा घटना का विवरण, पता, फोटो और आवश्यक राहत सामग्री दर्ज करें।'}
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenReportModal}
                className="mt-5 w-full py-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{language === 'en' ? 'OPEN REPORT FORM' : 'रिपोर्ट फॉर्म खोलें'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* Real-time Ticket Tracker */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-teal-400" />
                {language === 'en' ? 'Track My Emergency SOS Status' : 'अपने SOS टिकट की स्थिति ट्रैक करें'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'en'
                  ? 'Enter your Ticket Reference Code to check live response team dispatch and estimated arrival.'
                  : 'रेफरेंस कोड दर्ज करके बचाव टीम के पहुंचने का समय और लाइव स्थिति देखें।'}
              </p>
            </div>
            <span className="text-[11px] text-teal-400 font-mono">Example: RESQ-0001 or 1</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={ticketQuery}
              onChange={e => setTicketQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTrackTicket()}
              placeholder="Enter reference code (e.g. RESQ-0001, INC-0001, or 1)..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={() => handleTrackTicket()}
              disabled={trackingLoading || !ticketQuery.trim()}
              className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition disabled:opacity-40 flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              <span>{trackingLoading ? 'Checking...' : 'Check Status'}</span>
            </button>
          </div>

          {trackingError && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{trackingError}</span>
            </div>
          )}

          {trackedIncident && (
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4 animate-slideUp">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-teal-400 block">{trackedIncident.reference}</span>
                  <h4 className="text-base font-bold text-white">{trackedIncident.title}</h4>
                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    {trackedIncident.location_name}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                  trackedIncident.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  trackedIncident.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {trackedIncident.status}
                </span>
              </div>

              {/* Progress Milestones */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Assigned Unit</span>
                  <span className="text-white font-bold">{trackedIncident.assigned_team}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Response Deadline</span>
                  <span className="text-red-400 font-bold font-mono">{trackedIncident.response_deadline}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Estimated Arrival (ETA)</span>
                  <span className="text-teal-300 font-bold font-mono">{trackedIncident.estimated_arrival}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Arrival Status</span>
                  <span className="text-amber-300 font-bold">
                    {trackedIncident.actual_arrival_at ? `On Scene (${trackedIncident.actual_arrival_at})` : 'En Route to Target'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-lg text-xs text-teal-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span>
                  <strong>Safety Directive:</strong> Conserve your mobile battery. Do not attempt to cross flooded roadways. Stay visible to incoming aerial or boat rescue teams.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Public Hazard & Safety Advisory Center */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Hydrology & Road Closures */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Waves className="w-4 h-4 text-cyan-400" />
                {language === 'en' ? 'Pune Basin Hydrology & Flooding' : 'नदी जलस्तर एवं बाढ़ चेतावनी'}
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                simStatus.flood_level_m >= 4.5 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-teal-500/20 text-teal-300'
              }`}>
                {simStatus.flood_level_m >= 4.5 ? 'CRITICAL SURGE' : 'NORMAL / CONTROLLED'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Mutha River Height</span>
                <span className="text-2xl font-black text-cyan-300 font-mono">{simStatus.flood_level_m.toFixed(2)}m</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Danger Threshold: 4.50m</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block">Rainfall Rate</span>
                <span className="text-xl font-bold text-white font-mono">{simStatus.rainfall_mm.toFixed(1)} mm/h</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Basin Inundation</span>
              </div>
            </div>

            {/* Blocked Routes List */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Roadway Status Across City:
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {routes.map(r => (
                  <div key={r.id} className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{r.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === 'Blocked' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {r.status === 'Blocked' ? 'BLOCKED (FLOODED)' : 'SAFE PASSAGE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Accessible Public Shelters */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-400" />
                {language === 'en' ? 'Designated Evacuation Shelters' : 'नागरिक सुरक्षित आश्रय स्थल'}
              </h3>
              <span className="text-xs text-slate-400">Walk-In & Medical Ready</span>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar">
              {shelters.map(sh => (
                <div key={sh.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-white">{sh.name}</h5>
                    <span className="text-[11px] text-slate-400 block">{sh.location_name}</span>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      <span className="text-emerald-400 font-semibold">✓ Food & Water Rations</span>
                      <span className="text-teal-400 font-semibold">✓ First Aid Station</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-emerald-400 text-sm">{sh.vacancy} beds free</span>
                    <span className="text-[10px] text-slate-500 block">{sh.occupancy}/{sh.capacity} occupied</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
