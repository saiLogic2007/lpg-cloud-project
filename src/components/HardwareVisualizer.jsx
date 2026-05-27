import React from 'react';
import { motion } from 'motion/react';
import { Cpu, ShieldAlert, Zap, Volume2, VolumeX } from 'lucide-react';

/**
 * Interactive ESP32 / Breadboard visualizer with audio alerts
 */
export const HardwareVisualizer = ({ value, severity }) => {
  const isDanger = severity === "Danger" || severity === "Critical";
  const isWarning = severity === "Warning";
  const isCritical = severity === "Critical";

  // Web Audio API Synth for Buzzer Beep
  const [soundEnabled, setSoundEnabled] = React.useState(false);
  const audioContextRef = React.useRef(null);
  const intervalRef = React.useRef(null);

  // Voice synthesis flag
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const lastSpokenSeverityRef = React.useRef("");

  // Speak alert messages based on severity
  React.useEffect(() => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;

    if (severity !== lastSpokenSeverityRef.current) {
      window.speechSynthesis.cancel(); // Stop current speech
      let speakText = "";

      if (severity === "Warning") {
        speakText = "Warning. Elevated LPG gas levels detected. Please monitor the kitchen environment.";
      } else if (severity === "Danger") {
        speakText = "Danger! High gas concentration! Please open all windows immediately.";
      } else if (severity === "Critical") {
        speakText = "Critical emergency! Evacuate immediately! Automated community and neighbor alerts have been sent.";
      } else {
        speakText = "LPG levels have returned to normal. System state is clear.";
      }

      const utterance = new SpeechSynthesisUtterance(speakText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
      lastSpokenSeverityRef.current = severity;
    }
  }, [severity, voiceEnabled]);

  // Start/Stop actual buzzer sound simulator using browser Web Audio API
  React.useEffect(() => {
    if (!soundEnabled) {
      stopBuzzer();
      return;
    }

    if (isDanger || isCritical) {
      startBuzzerInterval(isCritical ? 150 : 400);
    } else if (isWarning) {
      startBuzzerInterval(800);
    } else {
      stopBuzzer();
    }

    return () => stopBuzzer();
  }, [severity, soundEnabled]);

  const startBuzzerInterval = (ms) => {
    stopBuzzer();
    
    // Lazy initialize AudioContext on client interaction
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const playBeep = () => {
      try {
        const ctx = audioContextRef.current;
        if (!ctx || ctx.state === 'closed') return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(2600, ctx.currentTime); // Piezo high frequency buzzer (2.6kHz)

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch (e) {
        console.error(e);
      }
    };

    intervalRef.current = setInterval(playBeep, ms);
  };

  const stopBuzzer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const toggleSound = () => {
    if (!soundEnabled) {
      // Audio needs click interaction to start in modern browsers
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
      setSoundEnabled(true);
    } else {
      setSoundEnabled(false);
      stopBuzzer();
    }
  };

  // Safe position calculations for smoke particle flow
  const particleCount = isCritical ? 8 : (isDanger ? 5 : (isWarning ? 3 : 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" /> ESP32 Hardware Schematic
        </h4>
        <div className="flex gap-2">
          {/* Sounds toggles */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-lg border transition-colors ${
              soundEnabled ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted duration-100 text-muted-foreground'
            }`}
            title={soundEnabled ? "Mute Buzzer" : "Unmute Buzzer"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
              voiceEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            Voice: {voiceEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <div className="relative aspect-[16/10] w-full rounded-2xl bg-slate-900 border border-slate-800 p-4 overflow-hidden flex flex-col justify-between shadow-inner animate-fade-in">
        {/* Connection matrix / Breadboard lines */}
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 opacity-20 pointer-events-none">
          {Array.from({ length: 96 }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-slate-700 m-0.5 rounded-[1px] bg-slate-850" />
          ))}
        </div>

        {/* LED Alert Indicators */}
        <div className="flex justify-between items-start z-10">
          <div className="flex gap-3">
            {/* Green Power LED */}
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-slate-400 font-mono tracking-wider mb-1">PWR</span>
              <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
            </div>
            {/* Warning LED */}
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-slate-400 font-mono tracking-wider mb-1">WARN</span>
              <div className={`h-3 w-3 rounded-full transition-all duration-300 ${
                isWarning || isDanger 
                  ? 'bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,1)] animate-pulse' 
                  : 'bg-yellow-950 border border-yellow-900'
              }`} />
            </div>
            {/* Critical LED */}
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-slate-400 font-mono tracking-wider mb-1">ALARM</span>
              <div className={`h-3 w-3 rounded-full transition-all duration-150 ${
                isCritical 
                  ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)] animate-ping' 
                  : isDanger 
                    ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                    : 'bg-red-950 border border-red-900'
              }`} />
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <span className="text-[8px] font-mono text-slate-400">STATUS</span>
            <span className={`text-[10px] font-bold tracking-wider font-mono px-2 py-0.5 rounded-full ${
              isCritical ? 'bg-red-500/20 text-red-400 animate-pulse' :
              isDanger ? 'bg-orange-500/20 text-orange-400' :
              isWarning ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {severity}
            </span>
          </div>
        </div>

        {/* Smoke particles rising above gas sensor simulation */}
        <div className="absolute right-12 bottom-16 w-16 h-24 flex flex-col-reverse items-center justify-start pointer-events-none z-20">
          {Array.from({ length: particleCount }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-6 h-6 rounded-full bg-slate-400/20 filter blur-sm"
              initial={{ opacity: 0.1, y: 0, scale: 0.5 }}
              animate={{
                opacity: [0, 0.5, 0.3, 0],
                y: -80,
                x: Math.sin(i) * 20,
                scale: [0.5, 1.5, 2.5],
              }}
              transition={{
                duration: 2 + Math.random() * 1.5,
                repeat: Infinity,
                delay: i * 0.4,
              }}
            />
          ))}
        </div>

        {/* Component Drawings Layout */}
        <div className="flex justify-between items-end z-10">
          {/* ESP32 Module Drawing */}
          <div className="bg-slate-850 border border-slate-700/80 rounded-lg p-2.5 w-[110px] shadow-lg flex flex-col gap-1.5 relative">
            <div className="flex justify-between items-center border-b border-slate-700 pb-1">
              <span className="text-[8px] font-bold text-slate-300 font-mono">ESP32-DEVKIT</span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_4px_#3b82f6] animate-pulse" title="Wi-Fi Signal" />
            </div>
            
            {/* MCU Chip drawing */}
            <div className="bg-slate-800 border border-slate-750 p-1 rounded font-mono text-center relative overflow-hidden">
              <div className="text-[7px] text-slate-500">NodeMCU-32S</div>
              <div className="h-1 w-full bg-slate-700 rounded-sm my-0.5" />
              <div className="text-[8px] font-bold text-slate-300 tracking-tighter">ESP-WROOM-32</div>
            </div>

            {/* Pins schematic drawing of ESP32 bottom side */}
            <div className="flex justify-between text-[5px] text-slate-600 font-mono">
              <div className="space-y-0.5">
                <div>3V3</div>
                <div>GND</div>
                <div>D34 (MQ6)</div>
                <div>D25 (BZ)</div>
              </div>
              <div className="space-y-0.5 text-right">
                <div>EN</div>
                <div>VP</div>
                <div>TX</div>
                <div>RX</div>
              </div>
            </div>
            {/* Visual jump wires going from ESP32 to MQ-6 */}
            <svg className="absolute top-2 left-[105px] w-16 h-20 pointer-events-none overflow-visible">
              <path d="M 0 5 Q 35 -15 65 30" fill="none" stroke="#2563eb" strokeWidth="1" strokeDasharray="3,3" />
              <path d="M 0 15 Q 40 45 65 40" fill="none" stroke="#ef4444" strokeWidth="1" />
              <path d="M 0 25 Q 20 60 45 45" fill="none" stroke="#eab308" strokeWidth="1" />
            </svg>
          </div>

          {/* Buzzer Drawing */}
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-mono text-slate-500 mb-1">PIEZO BUZZER</span>
            <motion.div 
              animate={ (isDanger || isCritical) && soundEnabled ? { scale: [1, 1.1, 1], rotate: [-2, 2, -2] } : {} }
              transition={{ repeat: Infinity, duration: 0.15 }}
              className={`h-9 w-9 rounded-full bg-slate-800 border flex items-center justify-center relative shadow-md ${
                (isDanger || isCritical) && soundEnabled ? 'border-red-500 bg-red-950/20' : 'border-slate-700'
              }`}
            >
              <div className="h-3 w-3 rounded-full bg-black border-2 border-slate-600 flex items-center justify-center">
                <div className="h-1 w-1 rounded-full bg-slate-400" />
              </div>
              {/* Audio warning waves */}
              {(isDanger || isCritical) && soundEnabled && (
                <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-60" />
              )}
            </motion.div>
          </div>

          {/* MQ-6 Gas Sensor module */}
          <div className="bg-slate-850 border border-slate-700 rounded-lg p-2.5 w-[85px] shadow-lg flex flex-col items-center gap-1">
            <span className="text-[7.5px] font-bold text-slate-400 font-mono tracking-wider">MQ-6 SENSOR</span>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-slate-500 shadow-md flex items-center justify-center relative overflow-hidden">
              {/* Copper grid textured lines */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-750/30 via-slate-850/50 to-slate-900/40 pointer-events-none" />
              <div className="text-[6.5px] text-slate-300 font-bold tracking-tight">LPG</div>
            </div>
            <div className="flex justify-between items-center w-full text-[6px] text-slate-500 font-mono">
              <span>VCC • GND • AD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
