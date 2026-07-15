import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BrandLogo } from '@/components/brand-logo';
import { Lock, ShieldAlert, Loader2 } from 'lucide-react';

interface AdminUser {
  clerkUserId: string;
  email: string | null;
  createdAt: string;
  plan: 'trial' | 'monthly' | 'yearly';
  planStatus: 'active' | 'expired';
  isPremium: boolean;
  daysRemaining: number;
  premiumExpiresAt: string | null;
}

type PlanAction =
  | 'trial_active'
  | 'trial_expired'
  | 'monthly_active'
  | 'monthly_expired'
  | 'yearly_active'
  | 'yearly_expired';

const STATUS_OPTIONS: { value: PlanAction; label: string }[] = [
  { value: 'trial_active', label: 'Free Trial — Active' },
  { value: 'trial_expired', label: 'Free Trial — Expired' },
  { value: 'monthly_active', label: 'Premium Monthly — Active' },
  { value: 'monthly_expired', label: 'Premium Monthly — Expired' },
  { value: 'yearly_active', label: 'Premium Yearly — Active' },
  { value: 'yearly_expired', label: 'Premium Yearly — Expired' },
];

function statusToAction(user: AdminUser): PlanAction {
  return `${user.plan}_${user.planStatus}` as PlanAction;
}

function planLabel(user: AdminUser): string {
  const planName = user.plan === 'trial' ? 'Free Trial' : user.plan === 'monthly' ? 'Premium Monthly' : 'Premium Yearly';
  return planName;
}

async function apiFetch<T>(path: string, password: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-admin-password': password,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

function PasswordGate({ onUnlock }: { onUnlock: (password: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      await apiFetch<AdminUser[]>('/admin/users', password);
      onUnlock(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-card/80 backdrop-blur p-6"
      >
        <div className="flex items-center gap-2.5">
          <BrandLogo size={28} />
          <div className="flex flex-col justify-center">
            <h1 className="font-sans font-extrabold text-sm leading-none tracking-tight">
              <span className="text-white">FOREX</span>
              <span className="text-primary">ALARM</span>
            </h1>
            <span className="text-[10px] font-sans text-muted-foreground tracking-[0.15em] mt-0.5">
              Admin
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            Admin password
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="font-mono"
          />
        </div>
        {error && (
          <p className="text-sm text-red-400 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            {error}
          </p>
        )}
        <Button type="submit" className="w-full font-mono uppercase tracking-wide" disabled={checking}>
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
        </Button>
      </form>
    </div>
  );
}

function AdminUsersTable({ password }: { password: string }) {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () =>
      apiFetch<AdminUser[]>(
        `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`,
        password,
      ),
  });

  const updatePlan = useMutation({
    mutationFn: ({ clerkUserId, action }: { clerkUserId: string; action: PlanAction }) =>
      apiFetch<AdminUser>(`/admin/users/${clerkUserId}`, password, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div className="min-h-[100dvh] px-4 py-8">
      <div className="container mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={28} />
            <div className="flex flex-col justify-center">
              <h1 className="font-sans font-extrabold text-sm leading-none tracking-tight">
                <span className="text-white">FOREX</span>
                <span className="text-primary">ALARM</span>
              </h1>
              <span className="text-[10px] font-sans text-muted-foreground tracking-[0.15em] mt-0.5">
                Admin — User Management
              </span>
            </div>
          </div>
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs font-mono"
          />
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires / Days Left</TableHead>
                <TableHead className="text-right">Set Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Loading users...
                  </TableCell>
                </TableRow>
              )}
              {usersQuery.isError && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-red-400 py-8">
                    {(usersQuery.error as Error).message}
                  </TableCell>
                </TableRow>
              )}
              {usersQuery.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
              {usersQuery.data?.map((u) => (
                <TableRow key={u.clerkUserId}>
                  <TableCell className="font-mono text-sm">{u.email ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">{planLabel(u)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={u.planStatus === 'active' ? 'default' : 'destructive'}
                      className={u.planStatus === 'active' ? 'bg-emerald-600 hover:bg-emerald-600' : ''}
                    >
                      {u.planStatus === 'active' ? 'Active' : 'Expired'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {u.plan === 'trial'
                      ? `${u.daysRemaining} day${u.daysRemaining === 1 ? '' : 's'} left`
                      : u.premiumExpiresAt
                        ? new Date(u.premiumExpiresAt).toLocaleDateString()
                        : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={statusToAction(u)}
                      onValueChange={(value) =>
                        updatePlan.mutate({ clerkUserId: u.clerkUserId, action: value as PlanAction })
                      }
                      disabled={updatePlan.isPending}
                    >
                      <SelectTrigger className="w-[220px] ml-auto font-mono text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);

  if (!password) {
    return <PasswordGate onUnlock={setPassword} />;
  }

  return <AdminUsersTable password={password} />;
}
