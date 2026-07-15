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
import { Play, Bell, BellOff, BellRing, Settings2, Smartphone, Loader2, Gift, Copy, Check } from "lucide-react";
import { audioAlarm, RINGTONES, type RingtoneId } from "@/lib/audio-alarm";
import { getStoredRingtone, setStoredRingtone } from "@/lib/settings";
import { notificationService } from "@/lib/notifications";
import {
  isPushSupported,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-notifications";
import { buildReferralLink } from "@/lib/referral";
import {
  useGetPushVapidPublicKey,
  useSubscribePush,
  useUnsubscribePush,
  useGetAccount,
  getGetAccountQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [ringtone, setRingtone] = useState<RingtoneId>(() => getStoredRingtone());
  const [permission, setPermission] = useState(() => notificationService.permission());
  const { toast } = useToast();

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const { data: vapid } = useGetPushVapidPublicKey();
  const subscribePush = useSubscribePush();
  const unsubscribePush = useUnsubscribePush();

  const { data: account } = useGetAccount({
    query: { queryKey: getGetAccountQueryKey() },
  });
  const [copied, setCopied] = useState(false);

  async function handleCopyReferralLink() {
    if (!account?.referralCode) return;
    const link = buildReferralLink(account.referralCode);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy link", description: link, variant: "destructive" });
    }
  }

  useEffect(() => {
    if (open) {
      setPermission(notificationService.permission());
      getExistingSubscription().then((sub) => setPushSubscribed(!!sub));
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

  async function handleEnablePush() {
    if (!vapid?.publicKey) return;
    setPushBusy(true);
    try {
      const sub = await subscribeToPush(vapid.publicKey);
      setPermission(notificationService.permission());
      if (!sub) {
        setPushBusy(false);
        return;
      }
      await subscribePush.mutateAsync({ data: sub });
      setPushSubscribed(true);
    } finally {
      setPushBusy(false);
    }
  }

  async function handleDisablePush() {
    setPushBusy(true);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) {
        await unsubscribePush.mutateAsync({ data: { endpoint } });
      }
      setPushSubscribed(false);
    } finally {
      setPushBusy(false);
    }
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
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Invite &amp; Earn
            </h3>
            <p className="text-xs text-muted-foreground">
              Share your link. When a friend signs up with it, you get 4 extra free trial days — no limit on how many times.
            </p>
            {account?.referralCode ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={buildReferralLink(account.referralCode)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 rounded-sm border border-border bg-card/40 px-3 py-2 text-xs font-mono text-foreground/90 truncate"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleCopyReferralLink}
                    aria-label="Copy referral link"
                    className="h-9 w-9 shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {account.referralBonusDays > 0 && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400 font-mono">
                    <Gift className="h-4 w-4" />
                    You've earned {account.referralBonusDays} bonus trial day{account.referralBonusDays === 1 ? "" : "s"}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Loading your referral link…</p>
            )}
          </div>

          <div className="space-y-3 border-t border-border pt-5">
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
            <h3 className="text-sm font-semibold text-foreground">In-App Alerts</h3>
            <p className="text-xs text-muted-foreground">
              Get a notification on your device the instant an alarm triggers, as long as Forex Alarm is still open (even in another tab or minimized).
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
                Enable Notifications
              </Button>
            )}
            {permission === "unsupported" && (
              <p className="text-xs text-muted-foreground">
                Notifications aren't supported in this browser.
              </p>
            )}
          </div>

          <div className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">Background Push</h3>
            <p className="text-xs text-muted-foreground">
              Keep getting alerts even after you fully close Forex Alarm or your browser. On iPhone, add Forex Alarm to your Home Screen first (Share → Add to Home Screen) — Safari only delivers push to installed apps.
            </p>
            {!isPushSupported() ? (
              <p className="text-xs text-muted-foreground">
                Background push isn't supported in this browser.
              </p>
            ) : !vapid?.publicKey ? (
              <p className="text-xs text-muted-foreground">
                Background push isn't configured on this server yet.
              </p>
            ) : pushSubscribed ? (
              <>
                <div className="flex items-center gap-2 text-sm text-emerald-400 font-mono">
                  <Smartphone className="h-4 w-4" />
                  Background push enabled on this device
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDisablePush}
                  disabled={pushBusy}
                  className="w-full font-mono uppercase tracking-wide gap-2"
                >
                  {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                  Disable Background Push
                </Button>
              </>
            ) : permission === "denied" ? (
              <div className="flex items-center gap-2 text-sm text-red-400 font-mono">
                <BellOff className="h-4 w-4" />
                Blocked — enable notifications for this site in your browser settings
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleEnablePush}
                disabled={pushBusy}
                className="w-full font-mono uppercase tracking-wide gap-2"
              >
                {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                Enable Background Push
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
