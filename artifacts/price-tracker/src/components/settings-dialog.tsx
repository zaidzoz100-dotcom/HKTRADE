import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Play, Bell, BellOff, BellRing, Settings2 } from "lucide-react";
import { audioAlarm, RINGTONES, type RingtoneId } from "@/lib/audio-alarm";
import { getStoredRingtone, setStoredRingtone } from "@/lib/settings";
import { notificationService } from "@/lib/notifications";

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [ringtone, setRingtone] = useState<RingtoneId>(() => getStoredRingtone());
  const [permission, setPermission] = useState(() => notificationService.permission());

  useEffect(() => {
    if (open) {
      setPermission(notificationService.permission());
    }
  }, [open]);

  function handleSelect(value: string) {
    const id = value as RingtoneId;
    setRingtone(id);
    setStoredRingtone(id);
  }

  async function handleEnableNotifications() {
    audioAlarm.init();
    const result = await notificationService.requestPermission();
    setPermission(result);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] border-primary/20">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider text-primary flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Alert Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Alarm Ringtone</h3>
            <p className="text-xs text-muted-foreground">
              Choose the sound Forex Alarm plays when a target price is hit.
            </p>
            <Select value={ringtone} onValueChange={handleSelect}>
              <SelectTrigger className="w-full font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RINGTONES.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id} className="font-mono">
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-2">
              {RINGTONES.map((rt) => (
                <div
                  key={rt.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    rt.id === ringtone ? "border-primary/60 bg-primary/5" : "border-border bg-card/40"
                  }`}
                >
                  <span className="text-sm font-mono">{rt.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs font-mono uppercase tracking-wide"
                    onClick={() => {
                      audioAlarm.init();
                      audioAlarm.preview(rt.id);
                    }}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Play
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">Push Notifications</h3>
            <p className="text-xs text-muted-foreground">
              Get a notification on your device the instant an alarm triggers, even if Forex Alarm is running in the background.
            </p>
            {permission === "granted" && (
              <div className="flex items-center gap-2 text-sm text-emerald-400 font-mono">
                <BellRing className="h-4 w-4" />
                Notifications enabled
              </div>
            )}
            {permission === "denied" && (
              <div className="flex items-center gap-2 text-sm text-red-400 font-mono">
                <BellOff className="h-4 w-4" />
                Blocked — enable notifications for this site in your browser settings
              </div>
            )}
            {permission !== "granted" && permission !== "denied" && permission !== "unsupported" && (
              <Button
                type="button"
                onClick={handleEnableNotifications}
                className="w-full font-mono uppercase tracking-wide gap-2"
              >
                <Bell className="h-4 w-4" />
                Enable Push Notifications
              </Button>
            )}
            {permission === "unsupported" && (
              <p className="text-xs text-muted-foreground">
                Push notifications aren't supported in this browser.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
