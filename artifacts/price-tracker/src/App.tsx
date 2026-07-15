import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import Home from '@/pages/home';
import AdminPage from '@/pages/admin';
import { AnimatedBackground } from '@/components/animated-background';
import { Route, Switch, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { dark } from '@clerk/themes';
import { capturePendingReferralCode } from '@/lib/referral';

const queryClient = new QueryClient();

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname so the
// same build serves multiple Clerk custom domains. Do not inline the env var, leave
// publishableKey undefined, or replace publishableKeyFromHost with anything else.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev (Clerk hits dev FAPI directly), auto-set
// in prod. Do NOT gate on import.meta.env.PROD / NODE_ENV — the empty dev value
// is intentional, and any branching breaks the prod proxy.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(43 96% 58%)',
    colorForeground: 'hsl(0 0% 98%)',
    colorMutedForeground: 'hsl(0 0% 63%)',
    colorDanger: 'hsl(0 84% 60%)',
    colorBackground: 'hsl(240 10% 4%)',
    colorInput: 'hsl(240 6% 10%)',
    colorInputForeground: 'hsl(0 0% 98%)',
    colorNeutral: 'hsl(240 6% 20%)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '0.375rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[hsl(240,10%,6%)] border border-[hsl(240,6%,16%)] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-mono uppercase tracking-widest text-white',
    headerSubtitle: 'text-white/60',
    socialButtonsBlockButtonText: 'text-white',
    formFieldLabel: 'text-white/80 font-mono text-xs uppercase tracking-wide',
    footerActionLink: 'text-[hsl(43,96%,58%)] font-semibold',
    footerActionText: 'text-white/60',
    dividerText: 'text-white/40',
    identityPreviewEditButton: 'text-[hsl(43,96%,58%)]',
    formFieldSuccessText: 'text-emerald-400',
    alertText: 'text-white',
    logoBox: 'flex justify-center',
    logoImage: 'h-10 w-10',
    socialButtonsBlockButton: 'border border-[hsl(240,6%,20%)]',
    formButtonPrimary: 'bg-[hsl(43,96%,58%)] hover:bg-[hsl(43,96%,52%)] text-black font-mono uppercase tracking-wide',
    formFieldInput: 'bg-[hsl(240,6%,10%)] border border-[hsl(240,6%,20%)] text-white',
    footerAction: 'text-white/60',
    dividerLine: 'bg-[hsl(240,6%,20%)]',
    alert: 'bg-red-950 border border-red-800',
    otpCodeFieldInput: 'bg-[hsl(240,6%,10%)] border border-[hsl(240,6%,20%)] text-white',
    formFieldRow: '',
    main: '',
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      onClick={() => signOut({ redirectUrl: basePath || '/' })}
      className={className}
    >
      Log out
    </button>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/tracker" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function TrackerPage() {
  return (
    <>
      <Show when="signed-in">
        <Dashboard />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Welcome back',
            subtitle: 'Sign in to keep watching your markets',
          },
        },
        signUp: {
          start: {
            title: 'Create your account',
            subtitle: 'Start your 4-day free trial',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/tracker" component={TrackerPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  useEffect(() => {
    capturePendingReferralCode();

    // Register the service worker unconditionally (not just when the user opts
    // into push) so Chrome/Android recognize this as an installable PWA and
    // fire `beforeinstallprompt`. Registration is a no-op if already registered.
    if ('serviceWorker' in navigator) {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      navigator.serviceWorker
        .register(swUrl, { scope: import.meta.env.BASE_URL })
        .catch(() => {
          // Non-fatal — push/install simply won't be available.
        });
    }
  }, []);

  return (
    <TooltipProvider>
      <AnimatedBackground />
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
