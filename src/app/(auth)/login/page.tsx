import { RoadScene } from "@/components/road-scene";
import { COMPANY_NAME } from "@/lib/config";
import { LoginForm } from "./login-form";

/**
 * Login (GUI phase, 2026-08-06). Server component so the company name comes
 * from System Settings — rebranding updates this screen too, with no code edit.
 * The animated scene is a sibling element rather than a background image, so it
 * stays pure SVG and inherits the brand colour.
 */
export default async function LoginPage() {
  let companyName = COMPANY_NAME;
  try {
    const { getSettings } = await import("@/modules/settings/service");
    const s = await getSettings();
    companyName = s.companyName || COMPANY_NAME;
  } catch {
    // DB unreachable on first boot — fall back to the config constants.
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="flex min-h-screen">
      {/* Left: the road, and nothing else (Sir, 2026-08-06 — no copy over the
          artwork). Hidden on phones: a small screen needs keyboard room more
          than it needs scenery. */}
      <section className="relative hidden lg:block lg:w-[55%]">
        <RoadScene />
        {/* Wordmark lives here now (Sir, 2026-08-06) — large, top-left, over
            the artwork. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 p-12">
          {/* uppercase via CSS, not a hardcoded string — the name still comes
              from System Settings and follows a rebrand. */}
          <h1 className="animate-rise text-5xl font-bold uppercase leading-[1.05] tracking-tight text-white xl:text-6xl">
            {companyName}
          </h1>
          {/*
            Optically aligned, not mathematically. Both lines start at the same
            x, but the big bold H has a tighter side bearing than the smaller E,
            so the E *looks* like it hangs left. A few pixels of indent lines the
            two stems up to the eye, which is what actually matters.
          */}
          <p className="animate-fade ml-[5px] mt-2 text-lg font-medium tracking-[0.18em] text-white/60 xl:ml-[7px] xl:text-xl">
            ENTERPRISE RESOURCE PLAN
          </p>
        </div>
      </section>

      {/* Right: the form. Column layout so the copyright pins to the bottom. */}
      <section className="flex flex-1 flex-col bg-canvas p-6">
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-rise w-full max-w-sm">
            {/*
              Logo removed (Sir, 2026-08-06): the file has a baked-in white
              background, so it sat as a white rectangle on the grey canvas.
              Rather than fake it with a container colour — which breaks the
              moment the canvas or brand changes — the branding now lives
              entirely on the artwork panel, and this side leads with type.
            */}
            {/* "Welcome back" assumed a returning user — wrong for anyone
                signing in for the first time (Sir, 2026-08-06). */}
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">{greeting}</h1>
            <p className="mb-8 mt-2 text-base text-ink-soft">Sign in with your invited account.</p>

            <LoginForm />
          </div>
        </div>

        <footer className="pt-6 text-center text-xs text-ink-faint">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
