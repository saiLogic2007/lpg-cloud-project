import React from 'react';
import { AlertTriangle, Info, Phone, Users, Wind, Ban, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEVERITY_LEVELS } from '@/src/lib/sensor';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Renders safety advice actions depending on current LPG severity levels
 */
export const SafetyProtocols = ({ 
  severity 
}) => {
  const isDanger = severity === "Danger" || severity === "Critical";
  const isWarning = severity === "Warning";
  const isElevated = isWarning || isDanger;

  const protocols = [
    { 
      id: "windows",
      icon: <Wind className="w-4 h-4" />, 
      text: "Open all dry doors and spacious windows immediately.", 
      active: isElevated 
    },
    { 
      id: "appliances",
      icon: <Ban className="w-4 h-4" />, 
      text: "Strictly do not turn ON or OFF any electrical switches or power sockets.", 
      active: isElevated 
    },
    { 
      id: "evacuate",
      icon: <Users className="w-4 h-4" />, 
      text: "Evacuate the kitchen, hostile premise, or building area immediately.", 
      active: isDanger 
    },
    { 
      id: "agency",
      icon: <Phone className="w-4 h-4" />, 
      text: "Urgent: Promptly dial the local Fire Brigade or LPG distributor emergency line.", 
      active: isDanger 
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-primary" /> Incident Response Actions
        </h3>
        <Badge variant={isDanger ? "destructive" : isWarning ? "warning" : "secondary"} className="uppercase font-mono text-[10px]">
          {SEVERITY_LEVELS[severity]?.label || "Ready"}
        </Badge>
      </div>

      {/* Core Safety Guidelines (Always visible for prompt visual reading) */}
      <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/15 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> Core Gas Safety Precautions
        </h4>
        <div className="space-y-2.5 text-xs">
          <div className="flex items-start gap-2.5 text-foreground/90">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold shrink-0">1</span>
            <p className="leading-normal pt-0.5"><strong>Open all surrounding windows and doors</strong> immediately to disperse gas.</p>
          </div>
          <div className="flex items-start gap-2.5 text-foreground/90">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold shrink-0">2</span>
            <p className="leading-normal pt-0.5"><strong>Do not turn on or turn off any electrical appliances</strong> (avoids generating electrical sparks).</p>
          </div>
          <div className="flex items-start gap-2.5 text-foreground/95">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-mono text-[10px] font-bold shrink-0">3</span>
            <p className="leading-normal pt-0.5"><strong>Move away from the place of gas leakage</strong> and stay in a ventilated area.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <AnimatePresence mode="popLayout">
          {protocols.filter(p => p.active).map((protocol, idx) => {
            const borderStyle = isDanger 
              ? "bg-destructive/10 border-destructive/20 text-destructive" 
              : (isWarning ? "bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-300" : "bg-secondary/50 border-border");

            return (
              <motion.div
                key={protocol.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className={`flex flex-col gap-3 p-3 rounded-xl border transition-all ${borderStyle}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg mt-0.5 ${
                    isDanger ? 'bg-destructive/20' : 'bg-muted'
                  }`}>
                    {protocol.icon}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-[12.5px] font-medium leading-tight">{protocol.text}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {severity === "Critical" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-red-600 text-white space-y-2.5 shadow-lg shadow-red-500/20"
        >
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
            <AlertTriangle className="w-4 h-4 text-white animate-bounce" /> Broadcast Trigger Active
          </div>
          <p className="text-[11.5px] leading-relaxed opacity-95">
            <strong>Community alert dispatched!</strong> The SMS engine automatically broadcast emergency notifications to all nearby households and building guard.
          </p>
        </motion.div>
      )}
    </div>
  );
};
