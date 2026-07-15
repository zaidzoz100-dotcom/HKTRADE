import { useMemo, useState } from 'react';
import { useCompleteProfile, getGetAccountQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { COUNTRIES, findCountry, isValidPhoneForCountry } from '@workspace/api-zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrandLogo } from '@/components/brand-logo';
import { LogoutButton } from '@/App';
import { ShieldCheck } from 'lucide-react';

// ISO 3166-1 alpha-2 -> flag emoji (regional indicator symbols).
function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/**
 * Mandatory one-time step shown after Clerk sign-up/sign-in, before the
 * dashboard is reachable, when the account hasn't recorded a country + phone
 * number yet. Required to reduce fake/throwaway signups gaming the referral
 * program — a referrer's reward is only paid out once this step (plus Clerk
 * email verification) is complete.
 */
export default function CompleteProfile() {
  const queryClient = useQueryClient();
  const completeProfile = useCompleteProfile();
  const [countryCode, setCountryCode] = useState('');
  const [localNumber, setLocalNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const country = useMemo(() => (countryCode ? findCountry(countryCode) : undefined), [countryCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!country) {
      setError('Please select your country');
      return;
    }

    const digits = localNumber.replace(/\D/g, '');
    const phoneNumber = `${country.dialCode}${digits}`;
    if (!isValidPhoneForCountry(country.code, phoneNumber)) {
      setError('Enter a valid phone number for the selected country');
      return;
    }

    try {
      await completeProfile.mutateAsync({ data: { country: country.code, phoneNumber } });
      queryClient.invalidateQueries({ queryKey: getGetAccountQueryKey() });
    } catch {
      setError('Something went wrong saving your profile. Please try again.');
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-[440px] max-w-full rounded-2xl border border-[hsl(240,6%,16%)] bg-[hsl(240,10%,6%)] p-8">
        <div className="flex flex-col items-center gap-3 text-center mb-6">
          <BrandLogo size={40} />
          <div>
            <h1 className="font-mono uppercase tracking-widest text-white text-lg">
              Complete your profile
            </h1>
            <p className="text-white/60 text-sm mt-1">
              One last step before your dashboard — this helps us keep the referral program fair.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="country" className="text-white/80 font-mono text-xs uppercase tracking-wide">
              Country
            </Label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger id="country" className="bg-[hsl(240,6%,10%)] border-[hsl(240,6%,20%)] text-white">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {flagEmoji(c.code)} {c.name} ({c.dialCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-white/80 font-mono text-xs uppercase tracking-wide">
              Phone number
            </Label>
            <div className="flex gap-2">
              <div className="flex h-9 min-w-14 items-center justify-center rounded-md border border-[hsl(240,6%,20%)] bg-[hsl(240,6%,10%)] px-2 text-sm text-white/70 font-mono">
                {country?.dialCode ?? '+--'}
              </div>
              <Input
                id="phone"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="5551234567"
                value={localNumber}
                onChange={(e) => setLocalNumber(e.target.value.replace(/[^\d]/g, ''))}
                className="bg-[hsl(240,6%,10%)] border-[hsl(240,6%,20%)] text-white"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={completeProfile.isPending}
            className="w-full bg-[hsl(43,96%,58%)] hover:bg-[hsl(43,96%,52%)] text-black font-mono uppercase tracking-wide"
          >
            {completeProfile.isPending ? 'Saving…' : 'Continue'}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-white/40">
          <ShieldCheck className="h-3.5 w-3.5" />
          Used only for account verification — never shared.
        </div>

        <div className="mt-4 text-center">
          <LogoutButton className="text-xs font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground" />
        </div>
      </div>
    </div>
  );
}
