import React, { useEffect, useState } from "react";
import { useListTriggeredAlerts, useAcknowledgeAlert, getListTriggeredAlertsQueryKey, getListAlertsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertOctagon, VolumeX } from "lucide-react";
import { audioAlarm } from "@/lib/audio-alarm";

export function AlarmOverlay() {
  const queryClient = useQueryClient();
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // High frequency polling for triggered alerts
  const { data: triggeredAlerts } = useListTriggeredAlerts({
    query: {
      queryKey: getListTriggeredAlertsQueryKey(),
      refetchInterval: 3000,
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: true, // Keep polling even when hidden
    }
  });

  const acknowledgeAlert = useAcknowledgeAlert();

  const activeTriggers = triggeredAlerts?.filter(a => a.status === 'triggered') || [];
  const isAlarming = activeTriggers.length > 0;

  // Global interaction listener to arm audio
  useEffect(() => {
    const onInteract = () => {
      setHasInteracted(true);
      audioAlarm.init();
      window.removeEventListener('click', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
    
    window.addEventListener('click', onInteract);
    window.addEventListener('keydown', onInteract);
    
    return () => {
      window.removeEventListener('click', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
  }, []);

  // Sync audio with alarm state
  useEffect(() => {
    if (isAlarming && hasInteracted) {
      audioAlarm.play();
    } else {
      audioAlarm.stop();
    }
    
    return () => {
      audioAlarm.stop();
    };
  }, [isAlarming, hasInteracted]);

  const handleAcknowledge = (id: number) => {
    acknowledgeAlert.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTriggeredAlertsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        }
      }
    );
  };

  const handleAcknowledgeAll = () => {
    activeTriggers.forEach(alert => {
      handleAcknowledge(alert.id);
    });
  };

  if (!isAlarming) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      {/* Flashing screen effect */}
      <div className="absolute inset-0 bg-destructive/10 animate-siren pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-2xl bg-card border-2 border-destructive shadow-[0_0_100px_rgba(239,68,68,0.4)] rounded-xl overflow-hidden flex flex-col">
        <div className="bg-destructive text-destructive-foreground p-6 flex flex-col items-center justify-center gap-4 text-center">
          <AlertOctagon className="h-16 w-16 animate-pulse" />
          <h2 className="text-3xl font-black tracking-widest font-mono uppercase">Target Hit</h2>
          {!hasInteracted && (
            <p className="text-sm font-sans flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full">
              <VolumeX className="h-4 w-4" /> Click anywhere to enable alarm sound
            </p>
          )}
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {activeTriggers.map(alert => (
            <div key={alert.id} className="bg-background border border-border p-4 rounded-lg flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-bold text-xl text-primary font-mono">{alert.assetSymbol}</span>
                  <span className="text-muted-foreground font-mono">
                    {alert.direction === 'above' ? '↗ Rose Above' : '↘ Dropped Below'}
                  </span>
                  <span className="font-bold text-xl font-mono">{alert.targetPrice}</span>
                </div>
                {alert.note && (
                  <p className="text-sm text-muted-foreground border-l-2 border-primary/50 pl-2 mt-2">{alert.note}</p>
                )}
                <div className="text-xs text-muted-foreground font-mono mt-2">
                  Triggered: {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleTimeString() : 'Just now'}
                </div>
              </div>
              
              <Button 
                size="lg"
                variant="destructive"
                className="w-full sm:w-auto font-bold tracking-wider"
                onClick={() => handleAcknowledge(alert.id)}
                disabled={acknowledgeAlert.isPending}
              >
                ACKNOWLEDGE
              </Button>
            </div>
          ))}
        </div>
        
        {activeTriggers.length > 1 && (
          <div className="bg-muted p-4 flex justify-center border-t border-border">
            <Button 
              variant="outline" 
              className="w-full font-bold tracking-wider hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={handleAcknowledgeAll}
            >
              ACKNOWLEDGE ALL ({activeTriggers.length})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
