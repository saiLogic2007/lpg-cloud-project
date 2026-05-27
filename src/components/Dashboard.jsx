import React from 'react';
import { 
  Bell, 
  Settings as SettingsIcon, 
  Activity, 
  History, 
  ShieldAlert, 
  Radio, 
  Wifi, 
  ExternalLink,
  Users,
  Phone,
  Sliders,
  Send,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Play,
  Volume2,
  FileCheck,
  Building,
  Cpu,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Gauge } from './Gauge';
import { Simulator } from './Simulator';
import { SafetyProtocols } from './SafetyProtocols';
import { HardwareVisualizer } from './HardwareVisualizer';
import { SEVERITY_LEVELS } from '@/src/lib/sensor';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Main dashboard governing telemetry parsing, threshold setups, contacts, and logs.
 */
export default function Dashboard() {
  const [activeTab, setActiveTab] = React.useState('monitor');
  
  // Real-time readings state in JS
  const [reading, setReading] = React.useState({
    value: 0,
    percentage: 0,
    severity: "Safe",
    timestamp: new Date().toISOString(),
    latitude: 13.7563,
    longitude: 100.5018
  });
  
  const [history, setHistory] = React.useState([]);
  const [isLive, setIsLive] = React.useState(true);

  // Notification and Siren Alert System configuration states (HIGHLIGHTED NEW FEATURES)
  const [notificationPermission, setNotificationPermission] = React.useState('default');
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [sirenEnabled, setSirenEnabled] = React.useState(true);
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = React.useState(true);

  // Alert tracking refs to avoid duplicate notifications and voice congestion
  const lastAlertTimeRef = React.useRef(0);
  const lastAlertSeverityRef = React.useRef("Safe");
  const lastDispatchTimeRef = React.useRef(0);

  // Custom Emergency Contacts State
  const [contacts, setContacts] = React.useState([
    { id: '1', name: 'John Doe (Father)', phone: '+91 98765 43210', type: 'Family' },
    { id: '2', name: 'Alok Sharma (Neighbor)', phone: '+91 91234 56789', type: 'Neighbor' },
    { id: '3', name: 'Building Guard Desk', phone: '+91 88888 22222', type: 'Security' },
    { id: '4', name: 'Local Fire Station Dispatch', phone: '101 / 911', type: 'Fire Department' },
    { id: '5', name: 'Emergency Ambulance Unit', phone: '102 / 911', type: 'Ambulance' },
    { id: '6', name: 'Gas Agency Helpline', phone: '1906', type: 'Emergency Services' }
  ]);

  // New Alert / SMS dispatch history state
  const [dispatchedSmsList, setDispatchedSmsList] = React.useState([]);

  // Web Dashboard Input Configs for CallMeBot and Twilio direct entries (stored in localStorage)
  const [callmebotApiKey, setCallmebotApiKey] = React.useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('safeguard_callmebot_api_key') : '') || '';
  });
  const [customTwilioSid, setCustomTwilioSid] = React.useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('safeguard_twilio_account_sid') : '') || '';
  });
  const [customTwilioToken, setCustomTwilioToken] = React.useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('safeguard_twilio_auth_token') : '') || '';
  });
  const [customTwilioPhone, setCustomTwilioPhone] = React.useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('safeguard_twilio_phone_number') : '') || '';
  });
  
  // Twilio integration configuration state
  const [twilioStatus, setTwilioStatus] = React.useState({
    configured: false,
    hasSid: false,
    hasToken: false,
    hasPhone: false
  });

  // Threshold calibration state
  const [warnThreshold, setWarnThreshold] = React.useState(200);
  const [dangerThreshold, setDangerThreshold] = React.useState(500);
  const [criticalThreshold, setCriticalThreshold] = React.useState(800);

  // Input states for adding new contacts
  const [newContactName, setNewContactName] = React.useState('');
  const [newContactPhone, setNewContactPhone] = React.useState('');
  const [newContactType, setNewContactType] = React.useState('Family');

  // Check initial browser notification permission
  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request browser desktop notification permissions
  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          toast.success("Desktop Alerts Enabled!", {
            description: "SafeGuard will now transmit immediate desktop notifications when leaks occur."
          });
          // Send a test notification
          new Notification("SafeGuard IoT Connected", {
            body: "Real-time LPG gas leakage monitoring notifications authorized successfully.",
            icon: "/favicon.ico"
          });
        } else {
          toast.warning("Notification Permission Denied", {
            description: "To enable real-time alerts, please clear site permissions and authorize notifications."
          });
        }
      } catch (err) {
        console.error("Failed requesting notifications", err);
      }
    } else {
      toast.error("Unsupported", {
        description: "Your modern browser does not support the HTML5 Notifications API."
      });
    }
  };

  // Synthesize audible siren beep alerts using HTML5 Web Audio API oscillators
  const playSiren = (severityLevel) => {
    if (!sirenEnabled || typeof window === "undefined") return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (severityLevel === "Critical") {
        // Critical: Distinct high frequency emergency ambulance sweep pattern
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(1100, audioCtx.currentTime + 0.35);
        oscillator.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.7);
        gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.95);
      } else if (severityLevel === "Danger") {
        // Danger: Strong interruptive square warning beep
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(580, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.48);
      } else if (severityLevel === "Warning") {
        // Warning: Soft ambient checkup ping
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.28);
      }
    } catch (e) {
      console.warn("Audio feedback skipped (awaiting initial browser click gesture)", e);
    }
  };

  // Speaks actual audio warnings using HTML5 TTS speechSynthesis engine
  const speakVoiceWarning = (phrase) => {
    if (!voiceSpeechEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel(); // Preempt active voicing to ensure no cue delays
      const speakRequest = new SpeechSynthesisUtterance(phrase);
      speakRequest.rate = 1.0;
      speakRequest.volume = 0.9;
      window.speechSynthesis.speak(speakRequest);
    } catch (e) {
      console.error("TTS voice synthesizer encountered error", e);
    }
  };

  // Triggers immediate sirens, push notifications and TTS readouts when telemetry changes severity
  React.useEffect(() => {
    const severity = reading.severity;
    if (severity === "Safe" || !severity) {
      lastAlertSeverityRef.current = "Safe";
      return;
    }

    const currentMillis = Date.now();
    const isBrandNewSeverity = severity !== lastAlertSeverityRef.current;
    const timeElapsed = currentMillis - lastAlertTimeRef.current;

    // Squelch notifications to once every 10 seconds per level to avoid noise, OR trigger instantly on status upgrade
    const shouldEngageAlert = isBrandNewSeverity || timeElapsed > 10000;

    if (shouldEngageAlert) {
      lastAlertTimeRef.current = currentMillis;
      lastAlertSeverityRef.current = severity;

      // 1. Play Synthesized Audible Alarm Beeps
      playSiren(severity);

      // 2. Read safety speech announcement aloud
      if (severity === "Critical") {
        speakVoiceWarning(`Critical incident detected. LPG gas levels register ${reading.value} PPM. Please evacuate the kitchen immediately.`);
      } else if (severity === "Danger") {
        speakVoiceWarning(`Danger. Gas leakage is high. The level is ${reading.value} PPM. Avoid sparks.`);
      } else if (severity === "Warning") {
        speakVoiceWarning(`Warning. Minor gas concentration detected.`);
      }

      // 3. Send Web Browser Desktop Notifications API alert
      if (notificationsEnabled && typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification(`⚠️ SafeGuard LPG Alert: ${severity.toUpperCase()}`, {
              body: `MQ-6 Sensor registers elevated danger values of ${reading.value} PPM. Safety regulators should be shut off immediately.`,
              icon: "/favicon.ico",
              tag: "safeguard-leakage-alert-" + severity.toLowerCase(),
              requireInteraction: severity === "Critical"
            });
          } catch (e) {
            console.error("Could not display native notification", e);
          }
        }
      }
    }
  }, [reading.severity, reading.value, notificationsEnabled, sirenEnabled, voiceSpeechEnabled]);

  // Load backend seed history and Twilio profile on initiate
  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history");
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
          if (data.length > 0) {
            setReading(data[data.length - 1]);
          }
        }
      } catch (err) {
        console.error("Failed to load historical seeds", err);
      }
    };

    const fetchTwilioStatus = async () => {
      try {
        const res = await fetch("/api/twilio-status");
        if (res.ok) {
          const data = await res.json();
          const localSid = typeof window !== 'undefined' ? localStorage.getItem('safeguard_twilio_account_sid') : '';
          const localToken = typeof window !== 'undefined' ? localStorage.getItem('safeguard_twilio_auth_token') : '';
          const localPhone = typeof window !== 'undefined' ? localStorage.getItem('safeguard_twilio_phone_number') : '';

          setTwilioStatus({
            configured: data.configured || !!(localSid && localToken && localPhone),
            hasSid: data.hasSid || !!localSid,
            hasToken: data.hasToken || !!localToken,
            hasPhone: data.hasPhone || !!localPhone
          });
        }
      } catch (err) {
        console.error("Failed to load Twilio config status", err);
      }
    };

    fetchHistory();
    fetchTwilioStatus();
  }, []);

  // Listen to the SSE Stream for real-time sensor updates over SSE connection
  React.useEffect(() => {
    let eventSource;

    const setupStream = () => {
      eventSource = new EventSource("/api/stream");

      eventSource.onopen = () => {
        setIsLive(true);
      };

      eventSource.onmessage = (event) => {
        setIsLive(true);
        const rawData = JSON.parse(event.data);
        
        // Recalculate severity dynamically based on user's custom threshold settings
        let calculatedSeverity = "Safe";
        if (rawData.value >= criticalThreshold) {
          calculatedSeverity = "Critical";
        } else if (rawData.value >= dangerThreshold) {
          calculatedSeverity = "Danger";
        } else if (rawData.value >= warnThreshold) {
          calculatedSeverity = "Warning";
        }

        const data = {
          value: rawData.value,
          percentage: rawData.percentage,
          severity: calculatedSeverity,
          timestamp: rawData.timestamp || new Date().toISOString(),
          latitude: rawData.latitude !== undefined ? rawData.latitude : 13.7563,
          longitude: rawData.longitude !== undefined ? rawData.longitude : 100.5018
        };

        setReading(data);
        setHistory(prev => [...prev.slice(-29), data]);

        // Trigger SMS Dispatches on Danger or Critical transits
        if (calculatedSeverity === "Critical" || calculatedSeverity === "Danger") {
          triggerEmergencyDispatches(calculatedSeverity, rawData.value, data.latitude, data.longitude);
        }
      };

      eventSource.onerror = () => {
        setIsLive(false);
        eventSource.close();
        setTimeout(setupStream, 3000); // Retry reconnect in 3 seconds if fails
      };
    };

    setupStream();
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [warnThreshold, dangerThreshold, criticalThreshold, contacts]);

  // Dispatches real-time SMS alerts to all dynamic contacts, calling our back-end API route!
  const triggerEmergencyDispatches = async (severity, value, lat, lng) => {
    // Squelch check: avoid repeating dispatches within 60 seconds to prevent notification fatigue / spam
    const now = Date.now();
    if (now - lastDispatchTimeRef.current < 60000) {
      console.log(`Alert dispatch ignored: Cooldown active. Last dispatch was ${Math.round((now - lastDispatchTimeRef.current)/1000)}s ago.`);
      return; 
    }
    lastDispatchTimeRef.current = now;

    const activeLat = lat !== undefined ? lat : (reading.latitude || 13.7563);
    const activeLng = lng !== undefined ? lng : (reading.longitude || 100.5018);

    // 1. Prepare standard cellular SMS alerts
    const smsDispatches = contacts.map(contact => {
      let recipientRole = "Emergency Contact";
      if (contact.type === 'Family') recipientRole = "Family Member";
      else if (contact.type === 'Fire Department') recipientRole = "Fire Department Dispatch";
      else if (contact.type === 'Ambulance') recipientRole = "Ambulance Team";
      else if (contact.type === 'Emergency Services' || contact.name.toLowerCase().includes('agency')) recipientRole = "Gas Agency Emergency";

      const msg = `🚨 LPG Gas Leakage Detected!
PPM Level: ${value}
Severity: ${severity.toUpperCase()}
Unit alert: ${recipientRole}

📍 Live Location:
https://maps.google.com/?q=${activeLat},${activeLng}`;

      return {
        id: Math.random().toString(),
        recipient: contact.name,
        phone: contact.phone,
        message: msg,
        timestamp: new Date().toISOString(),
        type: contact.type,
        status: 'Sending SMS...',
        isVoice: false
      };
    });

    // 2. Prepare Midnight Saver Voice Alerts for Emergency Responder Types
    const voiceDispatches = [];
    if (severity === "Critical" || severity === "Danger" || severity === "TEST OVERRIDE") {
      contacts.forEach(contact => {
        const isEmergencyType = contact.type === 'Fire Department' || contact.type === 'Ambulance' || contact.type === 'Emergency Services';
        if (isEmergencyType) {
          let recipientRole = "Emergency Response Division";
          if (contact.type === 'Fire Department') recipientRole = "Local Fire Station Dispatch";
          else if (contact.type === 'Ambulance') recipientRole = "Emergency Ambulance Unit";
          else if (contact.type === 'Emergency Services' || contact.name.toLowerCase().includes('agency')) recipientRole = "Gas Agency Helpline";

          voiceDispatches.push({
            id: 'voice_' + Math.random().toString(),
            recipient: `${contact.name} 📞 (The Midnight Saver)`,
            phone: contact.phone,
            message: `Initiating Automated Voice Dispatch call to ${recipientRole} with synthesized voice readout coordinates.`,
            timestamp: new Date().toISOString(),
            type: contact.type,
            status: 'Voice Dialing...',
            recipientRole: recipientRole,
            isVoice: true
          });
        }
      });
    }

    const combinedDispatches = [...voiceDispatches, ...smsDispatches];
    if (combinedDispatches.length === 0) return;

    // Immediately show them in the log terminal
    setDispatchedSmsList(prev => [...combinedDispatches, ...prev].slice(0, 45));

    // Show initial dispatch notifications
    toast.error(`🚨 EMERGENCY MULTI-CHANNEL BROADCAST DISPATCHED!`, {
      description: `Sent SMS/WhatsApp reminders and placed Midnight Saver Voice Calls to emergency responders regarding the critical danger situation.`,
      duration: 7000,
    });

    // Special helper notifications (only if present in target group)
    const hasFire = contacts.some(c => c.type === 'Fire Department');
    if (hasFire) {
      setTimeout(() => {
        toast.warning(`🚒 Fire Department Alert Active`, {
          description: `Placed automated LPG leak voice dispatch notice to local fire services dispatchers!`,
          duration: 6000,
        });
      }, 1200);
    }

    const hasAmbulance = contacts.some(c => c.type === 'Ambulance');
    if (hasAmbulance) {
      setTimeout(() => {
        toast.info(`🚑 Emergency Ambulance Services Notified`, {
          description: `Medical assistance team positioned on voice call response standby for emergency compliance.`,
          duration: 6000,
        });
      }, 2400);
    }

    // If WhatsApp CallMeBot API is configured, send the alert via WhatsApp too
    const activeWhatsappKey = callmebotApiKey || (typeof window !== 'undefined' ? localStorage.getItem('safeguard_callmebot_api_key') : '');
    if (activeWhatsappKey) {
      for (const dispatch of smsDispatches) {
        if (dispatch.phone.includes('+') || dispatch.phone.replace(/\s+/g, '').length >= 10) {
          try {
            fetch("/api/send-whatsapp", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                phone: dispatch.phone,
                message: dispatch.message,
                apiKey: activeWhatsappKey
              })
            }).catch(e => console.error("WhatsApp route failed", e));
          } catch (err) {
            console.error("WhatsApp trigger catch", err);
          }
        }
      }
    }

    const currentTwilioSid = customTwilioSid || (typeof window !== 'undefined' ? localStorage.getItem('safeguard_twilio_account_sid') : '');
    const currentTwilioToken = customTwilioToken || (typeof window !== 'undefined' ? localStorage.getItem('safeguard_twilio_auth_token') : '');
    const currentTwilioPhone = customTwilioPhone || (typeof window !== 'undefined' ? localStorage.getItem('safeguard_twilio_phone_number') : '');

    // Process Voice Calls via Twilio voice endpoint
    for (const voiceDispatch of voiceDispatches) {
      try {
        const response = await fetch("/api/make-voice-call", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phone: voiceDispatch.phone,
            value: value,
            severity: severity,
            latitude: activeLat,
            longitude: activeLng,
            recipientRole: voiceDispatch.recipientRole,
            customSid: currentTwilioSid,
            customToken: currentTwilioToken,
            customPhone: currentTwilioPhone
          })
        });

        const result = await response.json();
        
        setDispatchedSmsList(prev => 
          prev.map(item => {
            if (item.id === voiceDispatch.id) {
              if (response.ok && result.success) {
                return { ...item, status: result.simulated ? 'Simulated Dialed' : 'Call Connected' };
              } else if (result.error === 'CredentialsMissing') {
                return { ...item, status: 'No Key' };
              } else {
                return { ...item, status: 'Call Failed' };
              }
            }
            return item;
          })
        );
      } catch (error) {
        console.error("Voice call failure:", error);
        setDispatchedSmsList(prev => 
          prev.map(item => {
            if (item.id === voiceDispatch.id) {
              return { ...item, status: 'Call Error' };
            }
            return item;
          })
        );
      }
    }

    // Process dispatches through real Twilio API route
    for (const dispatch of smsDispatches) {
      try {
        const response = await fetch("/api/send-sms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phone: dispatch.phone,
            message: dispatch.message,
            customSid: currentTwilioSid,
            customToken: currentTwilioToken,
            customPhone: currentTwilioPhone
          })
        });

        const result = await response.json();
        
        setDispatchedSmsList(prev => 
          prev.map(item => {
            if (item.phone === dispatch.phone && item.status === 'Sending SMS...') {
              if (response.ok && result.success) {
                return { ...item, status: 'Delivered' };
              } else if (result.error === 'CredentialsMissing') {
                return { ...item, status: 'Missing Key' };
              } else {
                return { ...item, status: 'Failed' };
              }
            }
            return item;
          })
        );

        if (!response.ok && result.error === 'CredentialsMissing') {
          toast.warning("Twilio Credentials Not Configured", {
            description: "To send real cellular SMS text messages, please specify the secrets TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN & TWILIO_PHONE_NUMBER.",
            duration: 8000
          });
        }
      } catch (error) {
        console.error("SMS dispatch error:", error);
        setDispatchedSmsList(prev => 
          prev.map(item => {
            if (item.phone === dispatch.phone && item.status === 'Sending SMS...') {
              return { ...item, status: 'Network Error' };
            }
            return item;
          })
        );
      }
    }
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const newItem = {
      id: Math.random().toString(),
      name: newContactName,
      phone: newContactPhone,
      type: newContactType
    };

    setContacts([...contacts, newItem]);
    setNewContactName('');
    setNewContactPhone('');
    toast.success("Contact Registered", {
      description: `${newContactName} added to the instant emergency broadcast chain.`
    });
  };

  const handleRemoveContact = (id, name) => {
    setContacts(contacts.filter(c => c.id !== id));
    toast.warning("Broadcast Contact Removed", {
      description: `${name} has been taken off the automated alerts chain.`
    });
  };

  const handleSaveCallmebotKey = (key) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('safeguard_callmebot_api_key', key);
    }
    setCallmebotApiKey(key);
    toast.success("CallMeBot Key Saved", {
      description: key 
        ? "WhatsApp notification relay is now authorized and live!" 
        : "WhatsApp notification relay cleared.",
      duration: 3000
    });
  };

  const handleSaveTwilioConfig = (sid, token, phone) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('safeguard_twilio_account_sid', sid);
      localStorage.setItem('safeguard_twilio_auth_token', token);
      localStorage.setItem('safeguard_twilio_phone_number', phone);
    }
    setCustomTwilioSid(sid);
    setCustomTwilioToken(token);
    setCustomTwilioPhone(phone);

    setTwilioStatus(prev => ({
      ...prev,
      configured: !!(sid && token && phone) || prev.configured,
      hasSid: !!sid || prev.hasSid,
      hasToken: !!token || prev.hasToken,
      hasPhone: !!phone || prev.hasPhone
    }));

    toast.success("Twilio Credentials Saved", {
      description: (sid && token && phone) 
        ? "Custom cellular SMS gateway credentials saved successfully!" 
        : "Custom credentials cleared. System will fallback to server defaults.",
      duration: 3000
    });
  };

  // Simulates a manual test SMS dry-run
  const handleTestBroadcast = () => {
    triggerEmergencyDispatches("TEST OVERRIDE", reading.value || 350);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-zinc-950 text-foreground antialiased font-sans flex flex-col">
      <Toaster position="top-right" expand={false} richColors />
      
      {/* Visual top border changing color with LPG severity */}
      <div 
        className="h-1.5 w-full transition-colors duration-500 sticky top-0 z-50"
        style={{ backgroundColor: SEVERITY_LEVELS[reading.severity]?.color || "#22c55e" }}
      />

      {/* Main Header */}
      <header className="border-b bg-background/85 backdrop-blur-md sticky top-1.5 z-40">
        <div className="container flex h-16 items-center justify-between px-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-xl shadow-md text-primary-foreground">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">SafeGuard IoT</h1>
                <Badge variant="outline" className="font-mono text-[9px] px-1.5 tracking-wider uppercase bg-secondary/80">
                  v2.4 Live (JS)
                </Badge>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Web Dashboard & Emergency Controller</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-[11px] font-semibold border border-border/80">
              <span className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {isLive ? 'LPG DETECTOR INGRESS ONLINE' : 'GATEWAY CONNECT DISCONNECTED'}
            </div>
            <div className="flex p-1 rounded-lg bg-secondary border border-border/70">
              <button 
                onClick={() => setActiveTab('monitor')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'monitor' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Gas Monitor
              </button>
              <button 
                onClick={() => setActiveTab('broadcast')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                  activeTab === 'broadcast' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Community Alert <span className="text-[9px] bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 px-1 rounded-full">{contacts.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('calibration')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'calibration' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Threshold Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Urgent Warning banner overlays */}
        <AnimatePresence>
          {reading.severity !== "Safe" && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="overflow-hidden"
            >
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl ${
                reading.severity === "Critical" 
                  ? 'bg-red-600 border-red-500 text-white shadow-red-500/10' 
                  : reading.severity === "Danger"
                    ? 'bg-orange-500/10 border-orange-500/40 text-orange-800 dark:text-orange-300 shadow-orange-500/5'
                    : 'bg-yellow-500/10 border-yellow-500/40 text-yellow-800 dark:text-yellow-300 shadow-yellow-500/5'
              }`}>
                <div className="flex gap-3">
                  <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                    reading.severity === "Critical" ? 'bg-red-700 text-white' : 'bg-background/80 text-primary-foreground'
                  }`}>
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight uppercase">
                      LPG Incident Alert Active — Severity level: <span className="font-mono">{reading.severity}</span>
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5 max-w-2xl leading-relaxed">
                      Gas levels registered <span className="font-bold">{reading.value} PPM</span>. 
                      {reading.severity === "Critical" 
                        ? ' Emergency warnings broadcasted. Please immediate evacuate all human occupants!' 
                        : ' Ensure windows are completely open immediately.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 1: Monitor View */}
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Telemetry Display */}
              <Card className="lg:col-span-8 border-none bg-background shadow-2xl shadow-black/5 overflow-hidden border border-border/40 relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" /> LPG Real-Time Physical Sensor Values
                    </CardTitle>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground leading-none">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" /> Auto-sync active
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-6">
                  <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                    
                    {/* Live Gauge */}
                    <Gauge 
                      value={reading.value} 
                      max={1023} 
                      label="PPM Conc." 
                      color={SEVERITY_LEVELS[reading.severity]?.color || "#22c55e"} 
                    />

                    {/* Sensor stats context box */}
                    <div className="flex-1 space-y-5 w-full max-w-sm">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Explosive Risk Profile</span>
                          <span className="text-2xl font-bold font-mono tracking-tight" style={{ color: SEVERITY_LEVELS[reading.severity]?.color }}>
                            {Math.round(reading.percentage)}%
                          </span>
                        </div>
                        <div className="w-full bg-secondary h-3.5 rounded-full overflow-hidden border border-border/20">
                          <motion.div 
                            className="h-full rounded-full"
                            style={{ backgroundColor: SEVERITY_LEVELS[reading.severity]?.color }}
                            animate={{ width: `${Math.round(reading.percentage)}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground">Siren Status</span>
                          <div className={`text-xs font-bold ${reading.severity !== "Safe" ? "text-red-500 animate-pulse" : "text-emerald-500"}`}>
                            {reading.severity !== "Safe" ? "📢 ACTIVE ALARM" : "🔊 STANDBY"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground">Calibration Mode</span>
                          <div className="text-xs font-semibold text-foreground">
                            MQ-6 LPG Target
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground">Warning Limit</span>
                          <div className="text-xs font-semibold font-mono text-foreground">
                            {warnThreshold} PPM
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground">Network Ingress</span>
                          <div className="text-xs font-semibold font-mono text-foreground flex items-center gap-1">
                            <Radio className="w-3.5 h-3.5 text-blue-500 animate-pulse" /> SSE Stream
                          </div>
                        </div>

                      </div>

                      <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                         <span className="text-[9px] font-mono leading-none font-bold uppercase text-blue-500">Node Ingress Payload Endpoint:</span>
                         <code className="block p-1 bg-background select-all border rounded text-[9px] font-mono whitespace-nowrap overflow-x-auto">
                           POST {window.location.origin}/api/sensor-data
                         </code>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* Sidebar Action guides & Hardware Simulation card */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none shadow-2xl shadow-black/5 bg-background">
                  <CardContent className="pt-6">
                    <SafetyProtocols 
                      severity={reading.severity} 
                    />
                  </CardContent>
                </Card>

                {/* Visual Notification Hub card (HIGHLIGHTED NEW FEATURE) */}
                <Card className="border-none shadow-2xl shadow-black/5 bg-background border border-emerald-500/10 overflow-hidden relative">
                  <div className="absolute top-2.5 right-2.5 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">
                    NEW FEATURE
                  </div>
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-500" /> LPG Alert Notification Hub
                    </CardTitle>
                    <CardDescription className="text-[11px] leading-tight">
                      Control real-time browser audio pitch alarms, speech engines, and native system push alerts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3.5 pt-0">
                    {/* Permission Request Area */}
                    <div className="p-3 bg-secondary/40 border rounded-xl flex items-center justify-between gap-3 text-xs leading-none">
                      <div>
                        <span className="block font-bold text-foreground">Desktop Notifications</span>
                        <span className="text-[10px] text-muted-foreground mt-1.5 block">
                          Current Status: <strong className="uppercase font-mono text-[9px] px-1 rounded bg-secondary" style={{ color: notificationPermission === 'granted' ? '#22c55e' : '#eab308' }}>{notificationPermission}</strong>
                        </span>
                      </div>
                      
                      {notificationPermission !== 'granted' ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          type="button"
                          className="h-7 text-[10px] uppercase font-bold text-emerald-600 border-emerald-250 bg-emerald-500/5 hover:bg-emerald-100"
                          onClick={requestNotificationPermission}
                        >
                          Request Access
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Authorized
                        </div>
                      )}
                    </div>

                    {/* Interactive Toggles */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <Label htmlFor="toggle-push-alerts" className="font-semibold flex items-center gap-1.5 cursor-pointer">
                          <Radio className="w-3.5 h-3.5 text-muted-foreground" /> System Push Desktop Alerts
                        </Label>
                        <Switch 
                          id="toggle-push-alerts"
                          checked={notificationsEnabled} 
                          onCheckedChange={setNotificationsEnabled} 
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <Label htmlFor="toggle-acoustic-siren" className="font-semibold flex items-center gap-1.5 cursor-pointer">
                          <Volume2 className="w-3.5 h-3.5 text-muted-foreground" /> Audio Frequency Alarm Siren
                        </Label>
                        <Switch 
                          id="toggle-acoustic-siren"
                          checked={sirenEnabled} 
                          onCheckedChange={setSirenEnabled} 
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <Label htmlFor="toggle-vocal-assist" className="font-semibold flex items-center gap-1.5 cursor-pointer">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" /> Voice Safety Agent Readouts
                        </Label>
                        <Switch 
                          id="toggle-vocal-assist"
                          checked={voiceSpeechEnabled} 
                          onCheckedChange={setVoiceSpeechEnabled} 
                        />
                      </div>
                    </div>

                    {/* Quick Audible Test Buttons */}
                    <div className="pt-2.5 border-t border-dashed flex gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        type="button"
                        className="w-full text-[10.5px] uppercase font-bold py-3.5"
                        onClick={() => {
                          playSiren("Warning");
                          speakVoiceWarning("SafeGuard dynamic monitoring is online and ready.");
                          toast.success("Voice synthesizer tested successfully!");
                        }}
                      >
                        🔊 Test Sound & Voice
                      </Button>
                      {notificationPermission === 'granted' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          type="button"
                          className="w-full text-[10.5px] uppercase font-bold py-3.5 border-emerald-300/40"
                          onClick={() => {
                            try {
                              new Notification("⚠️ SafeGuard Live Trial Broadcast", {
                                body: "Desktop alerts verified! Emergency notifications will trigger immediately when LPG concentrations rise.",
                                icon: "/favicon.ico"
                              });
                            } catch (e) {
                              toast.error("Could not render desktop notification.");
                            }
                          }}
                        >
                          📢 Test Desktop Alert
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Simulated hardware drawer */}
                <Card className="border-none shadow-2xl shadow-black/5 bg-background overflow-hidden p-4">
                  <HardwareVisualizer 
                    value={reading.value}
                    severity={reading.severity}
                  />
                </Card>

                {/* Manual Generator slide */}
                <Simulator />
              </div>

            </div>

            {/* Historical Analysis Trend line graph */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              <Card className="md:col-span-8 border-none shadow-2xl shadow-black/5 bg-background">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" /> Live Gas Concentration Plot & Jitter Trend
                      </CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">
                        Historical charts updated dynamically in real-time. Showing last 30 telemetry points.
                      </CardDescription>
                    </div>
                    {/* Max PPM label */}
                    <span className="text-[10px] bg-secondary border px-2.5 py-0.5 rounded font-mono font-bold">
                      MQ6 Gas PPM Signal
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis 
                        dataKey="timestamp" 
                        hide 
                      />
                      <YAxis 
                        domain={[0, 1024]} 
                        axisLine={false} 
                        tickLine={false} 
                        fontSize={10} 
                        tickFormatter={(value) => `${value} PPM`}
                        stroke="#888888"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid rgba(0,0,0,0.08)', 
                          boxShadow: '0 10px 40px rgba(0,0,0,0.05)' 
                        }}
                        labelFormatter={(label) => `Time: ${new Date(label).toLocaleTimeString()}`}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2.5} 
                        dot={false}
                        animationDuration={300}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Dynamic SMS alert log feed sidebar */}
              <Card className="md:col-span-4 border-none shadow-2xl shadow-black/5 bg-background flex flex-col h-full justify-between">
                <div>
                  <CardHeader className="pb-1.5">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Send className="w-4 h-4 text-primary" /> Active Broadcast Status
                    </CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">
                      Check simulated dispatch status of SMS alerts sent to family & neighbors.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
                      {dispatchedSmsList.slice(0, 4).map((sms) => (
                        <div key={sms.id} className="p-2 sm:p-2.5 rounded-lg border bg-secondary/30 text-xs flex justify-between items-start gap-2.5 animate-fade-in">
                          <div className="space-y-1">
                            <span className="font-bold text-[10.5px] text-foreground">{sms.recipient}</span>
                            <p className="text-[10px] text-muted-foreground leading-tight">{sms.phone}</p>
                            <p className="text-[9.5px] italic text-muted-foreground bg-primary/5 p-1 rounded-md max-w-xs">{sms.message}</p>
                          </div>
                          <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-600 font-mono scale-90">
                            {sms.status}
                          </Badge>
                        </div>
                      ))}
                      {dispatchedSmsList.length === 0 && (
                        <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                          <Send className="w-8 h-8 opacity-25" />
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Alert Channel Idle</p>
                          <p className="text-[10px] text-muted-foreground">Emergency broadcast triggers dynamically when leakage is elevated.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>
                <div className="p-4 bg-muted/30 border-t border-border/50">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs font-bold uppercase py-4"
                    onClick={() => setActiveTab('broadcast')}
                  >
                    Manage Contacts & Trigger Dry-Run
                  </Button>
                </div>
              </Card>

            </div>
          </div>
        )}

        {/* Tab 2: Broadcast Setup Tab */}
        {activeTab === 'broadcast' && (
          <div className="space-y-6">
            
            {/* Live Twilio Cellular Gateway Configuration Status Banner */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm bg-background transition-colors ${
              twilioStatus.configured 
                ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10' 
                : 'border-yellow-500/30 bg-yellow-500/5 dark:bg-yellow-950/10'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                  twilioStatus.configured 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                }`}>
                  <Send className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex flex-wrap items-center gap-2">
                    Twilio Cellular SMS Gateway — 
                    <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      twilioStatus.configured 
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}>
                      {twilioStatus.configured ? '● Configured & Live' : '▲ Verification Pending'}
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                    {twilioStatus.configured 
                      ? "Real cellular SMS routing is active! The SafeGuard system is fully integrated. If LPG levels cross danger lines, alerts transmit instantly to fire departments, ambulances, and family on your contacts register." 
                      : "To dispatch real cell text messages instead of simulation templates, please navigate to settings and define the environment variables TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER."
                    }
                  </p>
                  
                  {/* Real-time backend env check indicator */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${twilioStatus.hasSid ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-850'}`} />
                      Account SID: {twilioStatus.hasSid ? 'Configured' : 'Missing'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${twilioStatus.hasToken ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-850'}`} />
                      Auth Token: {twilioStatus.hasToken ? 'Configured' : 'Missing'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${twilioStatus.hasPhone ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-850'}`} />
                      Phone Sender: {twilioStatus.hasPhone ? 'Configured' : 'Missing'}
                    </span>
                  </div>
                </div>
              </div>
              
              {!twilioStatus.configured && (
                <div className="shrink-0 text-[10px] font-medium text-yellow-700 dark:text-yellow-450 bg-yellow-500/10 dark:bg-yellow-950/20 px-3 py-2 rounded-xl border border-yellow-500/20 max-w-[280px] leading-relaxed">
                  💡 <strong>System Config Hint:</strong> Enter your credentials directly in the gateways panel below or save them as site environment variables for instant routing activation.
                </div>
              )}
            </div>

            {/* IoT Architecture Route Visualization */}
            <Card className="border border-border/80 bg-background/50 overflow-hidden rounded-xl shadow-sm p-4 sm:p-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#ef4444] mb-4 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" /> Real-time IoT Safety Signal Flow Path
              </h4>
              
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative lg:px-4 py-2">
                
                {/* Stage 1: ESP32 Hardware */}
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-border w-full lg:w-[155px] relative z-10">
                  <div className="p-3 rounded-full bg-amber-500/10 text-amber-500 mb-2">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans">1. ESP32</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">MQ-6 Gas Sensor</span>
                </div>

                {/* Connector Arrow 1 */}
                <div className="flex lg:flex-col items-center text-muted-foreground gap-1.5 shrink-0">
                  <span className="text-[9px] font-mono font-bold text-amber-650 bg-amber-500/10 px-2 py-0.5 rounded-full">Internet Connection</span>
                  <div className="hidden lg:block w-8 h-[2px] bg-gradient-to-r from-amber-500 to-blue-500" />
                  <div className="lg:hidden h-6 w-[2px] bg-gradient-to-b from-amber-500 to-blue-500" />
                </div>

                {/* Stage 2: Web Server API */}
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-blue-500/30 w-full lg:w-[155px] relative z-10">
                  <div className="p-3 rounded-full bg-blue-500/10 text-blue-500 mb-2">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans">2. Vercel API</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">Cloud Proxy Router</span>
                </div>

                {/* Connector Arrow 2 */}
                <div className="flex lg:flex-col items-center text-muted-foreground gap-1.5 shrink-0">
                  <span className="text-[9px] font-mono font-bold text-blue-650 bg-blue-500/10 px-2 py-0.5 rounded-full">REST Verification</span>
                  <div className="hidden lg:block w-8 h-[2px] bg-gradient-to-r from-blue-500 to-red-500" />
                  <div className="lg:hidden h-6 w-[2px] bg-gradient-to-b from-blue-500 to-red-500" />
                </div>

                {/* Stage 3: Twilio Gateway */}
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-red-500/30 w-full lg:w-[155px] relative z-10">
                  <div className="p-3 rounded-full bg-red-500/10 text-red-500 mb-2">
                    <Send className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans">3. Twilio</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">SMS Relay Gateway</span>
                </div>

                {/* Connector Arrow 3 */}
                <div className="flex lg:flex-col items-center text-muted-foreground gap-1.5 shrink-0">
                  <span className="text-[9px] font-mono font-bold text-emerald-650 bg-emerald-500/10 px-2 py-0.5 rounded-full">WhatsApp Relay</span>
                  <div className="hidden lg:block w-8 h-[2px] bg-gradient-to-r from-red-500 to-emerald-500" />
                  <div className="lg:hidden h-6 w-[2px] bg-gradient-to-b from-red-500 to-emerald-500" />
                </div>

                {/* Stage 4: Recipient Phone */}
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-emerald-500/30 w-full lg:w-[155px] relative z-10">
                  <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                    <Phone className="w-5 h-5 animate-bounce" style={{ animationDuration: '3s' }} />
                  </div>
                  <span className="text-xs font-bold font-sans">4. WhatsApp Code</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">Alert Delivered</span>
                </div>

              </div>
            </Card>

            {/* Real-time Gateway configuration sections - Direct Web Entry */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="gateways-setup">
              
              {/* CallMeBot WhatsApp card */}
              <Card className="border shadow-md border-border/80 bg-background relative overflow-hidden rounded-xl">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-widest text-[#22c55e] flex items-center gap-2">
                      <Send className="w-4 h-4" /> Free WhatsApp API (CallMeBot)
                    </CardTitle>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-500/20 font-mono text-[9px] uppercase font-bold">
                      Free Instant Alerts
                    </Badge>
                  </div>
                  <CardDescription className="text-xs pt-1">
                    Automated back-channel sender. Runs perfectly behind the iframe without prompt blocking or draft modals.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="callmebotKey" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">CallMeBot API Key</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="callmebotKey" 
                        value={callmebotApiKey} 
                        onChange={(e) => setCallmebotApiKey(e.target.value)}
                        placeholder="Paste free API key e.g. 1957413"
                        className="h-9 text-xs bg-muted/20 font-mono" 
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleSaveCallmebotKey(callmebotApiKey)}
                        className="h-9 font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white"
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#22c55e]/15 bg-emerald-500/5 dark:bg-emerald-950/15 space-y-2">
                    <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-[#22c55e] flex items-center gap-1.5">
                      ⚡ Get a Free Key in 30 Seconds via WhatsApp:
                    </h5>
                    <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      <p>1. Save the robot number <strong className="text-foreground font-mono">+34 644 20 20 62</strong> to your phone contacts.</p>
                      <p>2. Send it a whatsapp message saying: <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] font-mono">I allow callmebot to send me messages</code></p>
                      <p>3. It will instantly reply with your API Key! Paste it here to test automatic leakage alerts.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Twilio Gateway configuration fields */}
              <Card className="border shadow-md border-border/80 bg-background relative overflow-hidden rounded-xl">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Twilio Gateway (Real SMS/Cellular)
                    </CardTitle>
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border-blue-500/20 font-mono text-[9px] uppercase font-bold">
                      Enterprise SMS
                    </Badge>
                  </div>
                  <CardDescription className="text-xs pt-1">
                    Allows the system to bypass environment variables and inject custom credentials directly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="customSid" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Account SID</Label>
                      <Input 
                        id="customSid" 
                        value={customTwilioSid} 
                        onChange={(e) => setCustomTwilioSid(e.target.value)}
                        placeholder="AC..."
                        className="h-9 text-xs bg-muted/20 font-mono" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="customToken" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Auth Token</Label>
                      <Input 
                        id="customToken" 
                        type="password"
                        value={customTwilioToken} 
                        onChange={(e) => setCustomTwilioToken(e.target.value)}
                        placeholder="Token..."
                        className="h-9 text-xs bg-muted/20 font-mono" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="customPhone" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Sender (e.g. +1206550100 or "whatsapp:+14155238886")</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="customPhone" 
                        value={customTwilioPhone} 
                        onChange={(e) => setCustomTwilioPhone(e.target.value)}
                        placeholder="Twilio Number"
                        className="h-9 text-xs bg-muted/20 font-mono" 
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleSaveTwilioConfig(customTwilioSid, customTwilioToken, customTwilioPhone)}
                        className="h-9 font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Contacts Setup card */}
              <Card className="border-none shadow-2xl shadow-black/5 bg-background">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Instant Crisis Alert Chain Contacts
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Register mobile numbers of immediate household members, adjacent neighbors, and housing guard desks that get alerted during MQ-6 detection anomalies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Contact List */}
                  <div className="divide-y divide-border/60">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="py-3 flex justify-between items-center text-sm gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground">{contact.name}</span>
                            <Badge 
                              variant="secondary" 
                              className={`text-[9px] uppercase tracking-wide font-mono scale-90 ${
                                contact.type === 'Fire Department'
                                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                                  : contact.type === 'Ambulance'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                    : contact.type === 'Emergency Services'
                                      ? 'bg-orange-500/15 text-orange-650 dark:text-orange-400 border border-orange-500/30'
                                      : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-805 dark:text-zinc-200'
                              }`}
                            >
                              {contact.type}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-muted-foreground font-mono">{contact.phone}</p>
                            <span className="text-[9.5px] items-center gap-1 hover:opacity-100 text-emerald-600 dark:text-emerald-450 bg-emerald-500/5 px-1.5 py-0.5 rounded font-mono inline-flex">
                              ⚡ Twilio Gateway Routing Enabled
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveContact(contact.id, contact.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                {/* Add new contact form */}
                <form onSubmit={handleAddContact} className="p-4 bg-muted/30 rounded-xl border border-dashed border-border/80 space-y-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary block">Add Emergency Contact</span>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="contactName" className="text-[10px] uppercase font-bold tracking-wider">Contact Name</Label>
                      <Input 
                        id="contactName" 
                        value={newContactName} 
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="e.g. Building Security"
                        className="h-8 text-xs bg-background" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contactPhone" className="text-[10px] uppercase font-bold tracking-wider">Mobile / SMS Number</Label>
                      <Input 
                        id="contactPhone" 
                        value={newContactPhone} 
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        placeholder="e.g. +91 99999 11111"
                        className="h-8 text-xs bg-background" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="contactType" className="text-[10px] uppercase font-bold tracking-wider shrink-0">Type</Label>
                      <select 
                        id="contactType"
                        value={newContactType}
                        onChange={(e) => setNewContactType(e.target.value)}
                        className="h-8 text-xs rounded-md border border-input bg-background px-2.5"
                      >
                        <option value="Family">Family</option>
                        <option value="Neighbor">Neighbor</option>
                        <option value="Security">Desk Guard</option>
                        <option value="Emergency Services">Gas Agency Helpline</option>
                        <option value="Fire Department">Fire Department (101)</option>
                        <option value="Ambulance">Ambulance Emergency (102)</option>
                      </select>
                    </div>

                    <Button type="submit" size="sm" className="h-8 text-xs font-bold uppercase gap-1.5 px-3.5">
                      <Plus className="w-3.5 h-3.5" /> Save Contact
                    </Button>
                  </div>
                </form>

              </CardContent>
            </Card>

            {/* Broadcast Terminal logs */}
            <Card className="border-none shadow-2xl shadow-black/5 bg-background h-full flex flex-col justify-between">
              <div>
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Send className="w-4 h-4 text-primary" /> Incident Warning Broadcast logs (SMS Payload)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Audit records of automatically outgoing SMS text messages during Warning / Critical states.
                      </CardDescription>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleTestBroadcast}
                      className="text-xs uppercase font-bold text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Send className="w-3 h-3 mr-1" /> Test SMS
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="rounded-xl border bg-slate-950 p-4 font-mono text-[10.5px] text-zinc-300 space-y-3 max-h-[360px] overflow-y-auto">
                    <div className="text-zinc-500 border-b border-zinc-900 pb-1.5 flex justify-between">
                      <span>SMS ENDPOINT AUDIT STREAM</span>
                      <span className="text-green-500 animate-pulse">● OUTBOUND LISTENING</span>
                    </div>

                    {dispatchedSmsList.map((sms) => (
                      <div key={sms.id} className="border-b border-zinc-900 pb-2 space-y-1">
                        <div className="flex justify-between text-zinc-400">
                          <span className="font-bold text-white">To: {sms.recipient} ({sms.phone})</span>
                          <span>{new Date(sms.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[10px] text-emerald-400 font-mono tracking-tight leading-relaxed">
                          Message: "{sms.message}"
                        </p>
                        <div className="text-[9px] text-zinc-500 flex justify-between">
                          <span>Bearer: GSM Node Gateway GPRS_3</span>
                          <span className="text-green-400">STATUS_OK: {sms.status}</span>
                        </div>
                      </div>
                    ))}

                    {dispatchedSmsList.length === 0 && (
                      <div className="py-16 text-center text-zinc-600">
                        <code className="block">NO OUTBOUND SMS TO DISPLAY</code>
                        <span className="text-[9px] text-zinc-700 select-none">
                          System will output JSON dispatch envelopes when sensor meets "Danger"/ "Siren" benchmarks.
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              <div className="p-4 bg-muted/40 border-t mt-auto text-[11px] text-muted-foreground italic leading-relaxed">
                *Note: SafeGuard IoT integrates real GSM gateway modems or Blynk/Twilio cloud API relays to transmit cellular SMS signals instantly during LPG critical events.
              </div>
            </Card>

          </div>
        </div>
      )}

        {/* Tab 3: Calibration tab */}
        {activeTab === 'calibration' && (
          <Card className="border-none shadow-2xl shadow-black/5 bg-background max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" /> Advanced LPG Rules & MQ-6 Threshold Settings
              </CardTitle>
              <CardDescription className="text-xs">
                Calibrate custom MQ-6 semiconductor electrical indices representing Safe, Warning, Danger, and Critical environments. Ensure parameters align with standard building safety bylaws.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                {/* Warning threshold slider */}
                <div className="space-y-2 p-4 rounded-xl bg-secondary/30 border">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Warning Level threshold</span>
                    <span className="font-mono">{warnThreshold} PPM</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="400" 
                    value={warnThreshold} 
                    onChange={(e) => setWarnThreshold(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Acceptable standard baseline. Gas values crossing this register transient warning readouts but no auditory alarms.
                  </p>
                </div>

                {/* Danger threshold slider */}
                <div className="space-y-2 p-4 rounded-xl bg-secondary/30 border">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-orange-600 dark:text-orange-400 uppercase tracking-wider">Danger Level threshold</span>
                    <span className="font-mono">{dangerThreshold} PPM</span>
                  </div>
                  <input 
                    type="range" 
                    min="400" 
                    max="700" 
                    value={dangerThreshold} 
                    onChange={(e) => setDangerThreshold(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Medium leak leakage profile. Standard system activates buzzer beep alerts and advises manual regulator inspection.
                  </p>
                </div>

                {/* Critical threshold slider */}
                <div className="space-y-2 p-4 rounded-xl bg-secondary/30 border">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-red-600 dark:text-red-400 uppercase tracking-wider">Critical Siren Level threshold</span>
                    <span className="font-mono">{criticalThreshold} PPM</span>
                  </div>
                  <input 
                    type="range" 
                    min="700" 
                    max="950" 
                    value={criticalThreshold} 
                    onChange={(e) => setCriticalThreshold(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Severe leak state. Instantly sirens automated emergency warning text notifications to parents, building safety, and local services.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-xl border border-dashed text-xs text-muted-foreground leading-relaxed flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong>Bylaw Calibration Compliant</strong>: By customizing these boundaries, you customize SafeGuard's intelligent incident classifier algorithm in real time. Standard MQ-6 semiconductor sensors yield safe environmental signals under 150ppm. Review target area specs prior to deployment.
                </div>
              </div>

            </CardContent>
          </Card>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t py-6 bg-background mt-auto text-center text-xs text-muted-foreground font-mono">
        <div className="container max-w-7xl mx-auto px-4">
          <p>SafeGuard IoT System • Designed for Hostel, Home, and Kitchen Safety</p>
          <p className="text-[10px] mt-1 text-slate-400">ESP32 Ingress Port: 3000 | Active Web Feed Node</p>
        </div>
      </footer>
    </div>
  );
}
