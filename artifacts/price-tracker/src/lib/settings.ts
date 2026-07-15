import type { RingtoneId } from "@/lib/audio-alarm";

const RINGTONE_KEY = "forexalarm:ringtone";

export function getStoredRingtone(): RingtoneId {
  const stored = localStorage.getItem(RINGTONE_KEY);
  if (stored === "classic" || stored === "digital" || stored === "bell" || stored === "siren") {
    return stored;
  }
  return "classic";
}

export function setStoredRingtone(ringtone: RingtoneId) {
  localStorage.setItem(RINGTONE_KEY, ringtone);
}
