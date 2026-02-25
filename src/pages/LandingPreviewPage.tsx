import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { ShieldCheck, Users, MessageCircle, Sparkles } from "lucide-react";

const LandingPreviewPage: React.FC = () => {
  return (
    <div className="page-calm min-h-screen relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-8 left-8 h-40 w-40 rounded-full bg-pink-400/20 blur-3xl floating-orb" />
        <div
          className="absolute top-24 right-10 h-32 w-32 rounded-full bg-purple-400/20 blur-2xl floating-orb"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute bottom-10 left-1/4 h-44 w-44 rounded-full bg-indigo-500/20 blur-3xl floating-orb"
          style={{ animationDelay: "3s" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <header className="glass-pride-strong rounded-3xl p-6 sm:p-10 mb-8 sm:mb-12">
          <AnimatedLogo size="lg" className="mb-5" />
          <p className="text-3xl sm:text-4xl font-semibold text-white leading-tight max-w-3xl">
            A Safer Space for Women to Connect.
          </p>
          <p className="mt-4 text-white/85 max-w-3xl text-base sm:text-lg leading-relaxed">
            Violets &amp; Vibes is a protected, women-centered community where
            meaningful friendships, relationships, and real connection can grow
            without pressure, intrusion, or chaos.
          </p>
          <p className="mt-3 text-white/80 max-w-3xl">
            Inclusive of transgender women and non-binary individuals who align
            with a woman-centered space.
          </p>
          <p className="mt-5 text-pink-200 font-medium">
            Women-centered. Inclusive. Safety-first.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="btn-pride-celebrate">
              <Link to="/signin">Join the Community</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <Link to="/signin">Sign In</Link>
            </Button>
          </div>
        </header>

        <main className="space-y-6 sm:space-y-8">
          <section className="glass-pride rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white">
              Because Women Deserve Better Online Spaces.
            </h2>
            <p className="mt-4 text-white/85 leading-relaxed">
              Too many platforms prioritize attention over authenticity.
            </p>
            <p className="mt-3 text-white/85 leading-relaxed">
              Violets &amp; Vibes was created intentionally, a space built for
              women who value respect, accountability, and genuine connection.
            </p>
            <p className="mt-4 text-white/80">
              Dating is welcome. Friendship is valued. Community is the
              foundation.
            </p>

            <div className="mt-6">
              <Button asChild className="btn-pride">
                <Link to="/signin">Create Your Profile</Link>
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-pink-300/35 bg-black/70 p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white">
              Protected. Intentional. Clear.
            </h2>
            <p className="mt-4 text-white/85 leading-relaxed">
              Violets &amp; Vibes is created exclusively for women, inclusive of
              transgender women and non-binary individuals who align with a
              woman-centered community.
            </p>
            <p className="mt-4 text-white/90 font-medium">
              This platform is not open to men or couples.
            </p>
            <p className="mt-3 text-white/80 leading-relaxed">
              It exists to provide women a space free from unwanted pressure,
              fetishization, and intrusion, where connection can happen safely
              and intentionally.
            </p>
            <p className="mt-4 text-pink-200 font-medium">Because women deserve that.</p>
          </section>

          <section className="glass-pride rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white">
              What You&apos;ll Find Here
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-pink-200 font-semibold">
                  <Sparkles className="w-4 h-4" />
                  Intentional Connection
                </div>
                <p className="mt-2 text-white/80 text-sm">
                  Meet women who value communication, alignment, and shared
                  energy.
                </p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-purple-200 font-semibold">
                  <Users className="w-4 h-4" />
                  Inclusive Community
                </div>
                <p className="mt-2 text-white/80 text-sm">
                  All identities. All orientations. All welcome, within a
                  women-centered space.
                </p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-blue-200 font-semibold">
                  <MessageCircle className="w-4 h-4" />
                  Private Conversations
                </div>
                <p className="mt-2 text-white/80 text-sm">
                  Build trust at your own pace.
                </p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-green-200 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  Safety First
                </div>
                <p className="mt-2 text-white/80 text-sm">
                  Respect is expected. Boundaries are honored. Accountability
                  matters.
                </p>
              </div>
            </div>
          </section>

          <section className="glass-pride-dark rounded-2xl p-6 sm:p-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white">
              Connection Should Feel Safe.
            </h2>
            <p className="mt-4 text-white/85 max-w-3xl mx-auto leading-relaxed">
              Whether you&apos;re here for friendship, romance, conversation, or
              community, you deserve a space that feels aligned with your values.
            </p>
            <p className="mt-4 text-white/80">
              No chaos. No performance. No outside agendas.
            </p>
            <p className="mt-2 text-pink-200 font-medium">
              Just connection with intention.
            </p>
          </section>

          <section className="rounded-3xl border border-pink-300/30 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 p-6 sm:p-10 text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold text-white">
              Find Your People. Feel the Vibe.
            </h2>
            <p className="mt-4 text-white/85 max-w-3xl mx-auto">
              Join Violets &amp; Vibes and start building connections that feel
              real, respectful, and aligned.
            </p>
            <div className="mt-6">
              <Button asChild className="btn-pride-celebrate">
                <Link to="/signin">Join Violets &amp; Vibes</Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default LandingPreviewPage;
