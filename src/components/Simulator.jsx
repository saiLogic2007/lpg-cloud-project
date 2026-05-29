import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { getSeverity, getRiskPercentage } from '@/src/lib/sensor';

/**
 * Signal simulation card allowing manual triggering of LPG drift cases
 */
export const Simulator = () => {
  const [value, setValue] = React.useState(150);
  const [isActive, setIsActive] = React.useState(true); // Active by default for rich live view
  
  // Simulated GPS Coordinates for NEO-6M verification
  const [latitude, setLatitude] = React.useState(16.482372983354427);
  const [longitude, setLongitude] = React.useState(80.6913302784681);

  // Jitter and simulation interval to recreate realistic air drift
  React.useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        const jitter = Math.random() * 16 - 8;
        setValue(prev => {
          const newValue = Math.max(0, Math.min(1023, Math.round(prev + jitter)));
          // Defer network state side-effects out of React pure update cycles to prevent 19.x dispatch failures/aborts
          setTimeout(() => {
            sendData(newValue, latitude, longitude);
          }, 0);
          return newValue;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isActive, latitude, longitude]);

  const sendData = async (v, lat = latitude, lng = longitude) => {
    const percentage = getRiskPercentage(v);
    const severity = getSeverity(v);
    
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      await fetch(`${baseUrl}/api/sensor-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: v,
          percentage,
          severity,
          latitude: Number(lat),
          longitude: Number(lng),
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error("Failed to transmit simulator data", e);
    }
  };

  const handleManualSlide = (v) => {
    setValue(v);
    sendData(v, latitude, longitude);
  };

  const handleLatLngChange = (latVal, lngVal) => {
    setLatitude(latVal);
    setLongitude(lngVal);
    sendData(value, latVal, lngVal);
  };

  const simulateAlert = (targetVal) => {
    setValue(targetVal);
    sendData(targetVal, latitude, longitude);
  };

  return (
    <Card className="bg-muted/30 border-dashed border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            Sensor Signal Generator
            <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
          </CardTitle>
          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground font-mono">
            MQ-6 Channel
          </span>
        </div>
        <CardDescription className="text-[11px]">
          Simulate LPG leak scenarios and GPS coordinates to test voice readouts, alert sirens, and community warnings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Gas Concentration</span>
            <span className="font-mono font-bold text-primary">{value} PPM</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1023" 
            value={value} 
            onChange={(e) => handleManualSlide(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
            <span>0 PPM (Clean Air)</span>
            <span>200 (Warn)</span>
            <span>500 (Danger)</span>
            <span>1023 (Max Leak)</span>
          </div>
        </div>

        {/* GPS Coordinates Simulation Controls */}
        <div className="p-3 bg-background/50 border border-border rounded-xl space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
            <MapPin className="w-3.5 h-3.5 text-red-500 font-semibold" /> NEO-6M GPS Emulator
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[9px] uppercase font-bold text-muted-foreground">Latitude</Label>
              <Input 
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => handleLatLngChange(Number(e.target.value), longitude)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase font-bold text-muted-foreground">Longitude</Label>
              <Input 
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => handleLatLngChange(latitude, Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Preset scenario triggers */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Preset Scenarios</span>
          <div className="grid grid-cols-4 gap-1.5 text-[10px]">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 px-1 text-[10px]"
              onClick={() => simulateAlert(45)}
            >
              Baseline (45)
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 px-1 text-[10px] text-yellow-650 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
              onClick={() => simulateAlert(320)}
            >
              Warning (320)
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 px-1 text-[10px] text-orange-655 hover:bg-orange-50 dark:hover:bg-orange-950/20"
              onClick={() => simulateAlert(650)}
            >
              Danger (650)
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 px-1 text-[10px] text-red-655 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => simulateAlert(920)}
            >
              Siren (920)
            </Button>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-dashed border-border/85">
          {!isActive ? (
            <Button size="sm" className="w-full h-8 text-[11px]" onClick={() => setIsActive(true)}>
              Enable Autonomous Jitter
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="w-full h-8 text-[11px]" onClick={() => setIsActive(false)}>
              Freeze Signal Jitter
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
