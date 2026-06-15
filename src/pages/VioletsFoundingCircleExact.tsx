"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── real visible pill buttons ────────────────────────────────────────────────
// Solid bg on pillOff covers the image's drawn pills; only the live buttons show
const pillOn =
  "flex cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(90deg,#a345ff,#ea3ea4)] text-[clamp(9px,1.1vw,13px)] font-semibold text-white outline-none transition-all";
const pillOff =
  "flex cursor-pointer items-center justify-center rounded-full border border-[#6b5dd3]/60 bg-[#12144e] text-[clamp(9px,1.1vw,13px)] font-medium text-white outline-none transition-all hover:bg-[#1d1a5e]";

// ── real visible rect buttons (founding member) ───────────────────────────────
const rectOn =
  "flex cursor-pointer items-center justify-center rounded-[8px] bg-[linear-gradient(90deg,#a345ff,#ea3ea4)] text-[clamp(9px,1.1vw,13px)] font-semibold text-white outline-none transition-all";
const rectOff =
  "flex cursor-pointer items-center justify-center rounded-[8px] border border-[#6b5dd3]/60 bg-[#2e1e6f] text-[clamp(9px,1.1vw,13px)] font-medium text-white outline-none transition-all hover:bg-[#3a2880]";

function duplicateError(msg: string) {
  return /duplicate|unique/i.test(msg);
}

function fallbackCopy(text: string) {
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(el);
  return ok;
}

export default function VioletsFoundingCircleExact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [missing, setMissing] = useState("");
  const [heardFrom, setHeardFrom] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [foundingMember, setFoundingMember] = useState<"yes" | "no">("yes");
  const [feedback, setFeedback] = useState<{ kind: "error" | "success" | "info"; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleValue = (value: string) => {
    setFeedback(null);
    setSelectedValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const fieldCls = "rounded-[8px] border border-[#3e3b8e]/55 bg-[#1c1d62] px-4 py-2 text-[clamp(11px,1.2vw,17px)] text-white caret-white outline-none placeholder:text-[#6a68a8] shadow-[0_0_0_20px_#12144e,0_0_40px_26px_#12144e] transition-all focus:border-[#7c5adb]/80";

  // ── form submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const trimName = name.trim();
    const trimEmail = email.trim();
    const trimCity = city.trim();
    const trimMissing = missing.trim();

    if (!trimName || !trimEmail) {
      setFeedback({ kind: "error", msg: "Please enter your name and email." });
      return;
    }
    if (!EMAIL_PATTERN.test(trimEmail)) {
      setFeedback({ kind: "error", msg: "Please enter a valid email address." });
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("waitlist").insert({
        name: trimName,
        email: trimEmail,
        city: trimCity,
        looking_for: lookingFor ? [lookingFor] : [],
        community_values: selectedValues,
        what_is_missing: trimMissing,
        heard_from: heardFrom,
        founding_member: foundingMember === "yes",
      });

      if (insertError && !duplicateError(insertError.message)) throw insertError;

      void supabase.functions
        .invoke("waitlist-confirm", { body: { name: trimName, email: trimEmail } })
        .catch((err) => console.warn("Confirmation email failed:", err));

      setSubmitted(true);
      setFeedback({ kind: "success", msg: "You're on the list! Check your email." });
    } catch (err) {
      console.error(err);
      setFeedback({ kind: "error", msg: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── share ──────────────────────────────────────────────────────────────────
  const share = (network: "x" | "facebook") => {
    const url = encodeURIComponent("https://violetsandvibes.com/waitlist/");
    const text = encodeURIComponent(
      "Just joined the Founding Circle of Violets & Vibes — a safer, women-centered space for friendship, dating, and community."
    );
    window.open(
      network === "x"
        ? `https://x.com/intent/tweet?text=${text}&url=${url}`
        : `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const copyLink = async () => {
    const url = "https://violetsandvibes.com/waitlist/";
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else if (!fallbackCopy(url)) throw new Error("fallback failed");
      setFeedback({ kind: "info", msg: "Link copied!" });
    } catch {
      setFeedback({ kind: "error", msg: "Could not copy the link." });
    }
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#020726]">
      <div className="relative w-full max-w-[1100px] mx-auto py-12 px-6">
        {/* Decorative screenshot as background image */}
        <div className="relative rounded-2xl overflow-hidden bg-[url('/images/violets-founding-circle.png')] bg-cover bg-center shadow-lg">
          <div className="backdrop-brightness-75 p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  name="name"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => { setFeedback(null); setName(e.target.value); }}
                  placeholder="First name or nickname"
                  aria-label="Your name"
                  className={`${fieldCls} w-full`}
                />

                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setFeedback(null); setEmail(e.target.value); }}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  className={`${fieldCls} w-full`}
                />

                <input
                  name="city"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Where are you based?"
                  aria-label="City"
                  className={`${fieldCls} w-full`}
                />
              </div>

              {/* Looking for */}
              <div>
                <div className="mb-2 text-sm text-[#bfbff0]">What are you looking for?</div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setLookingFor("Friendship")}
                    className={`${lookingFor === "Friendship" ? pillOn : pillOff} px-4 py-2`}>Friendship</button>
                  <button type="button" onClick={() => setLookingFor("Dating")}
                    className={`${lookingFor === "Dating" ? pillOn : pillOff} px-4 py-2`}>Dating</button>
                  <button type="button" onClick={() => setLookingFor("Community")}
                    className={`${lookingFor === "Community" ? pillOn : pillOff} px-4 py-2`}>Community</button>
                  <button type="button" onClick={() => setLookingFor("All of the above")}
                    className={`${lookingFor === "All of the above" ? pillOn : pillOff} px-4 py-2`}>All of the above</button>
                </div>
              </div>

              {/* Community values */}
              <div>
                <div className="mb-2 text-sm text-[#bfbff0]">Community values</div>
                <div className="flex flex-wrap gap-3">
                  {[
                    'Safety first',
                    'Real connections',
                    'No judgment',
                    'LGBTQ+ inclusive',
                    'Local meetups',
                    'Emotional support',
                    'Women-only spaces',
                    'Dating without pressure',
                  ].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => toggleValue(val)}
                      className={`${selectedValues.includes(val) ? pillOn : pillOff} px-4 py-2`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* What's missing */}
              <div>
                <label className="sr-only" htmlFor="missing">What's missing</label>
                <textarea
                  id="missing"
                  name="missing"
                  value={missing}
                  onChange={(e) => setMissing(e.target.value)}
                  placeholder="Feel free to be honest — this helps us build something better for you."
                  aria-label="What's missing from the apps or spaces you've tried?"
                  className={`${fieldCls} w-full min-h-[120px] resize-vertical leading-6 placeholder-[#a8a6d0]`}
                />
              </div>

              {/* Heard from + founding member */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <select
                  name="heardFrom"
                  aria-label="How did you hear about us?"
                  value={heardFrom}
                  onChange={(e) => { setFeedback(null); setHeardFrom(e.target.value); }}
                  className={`${fieldCls} w-full appearance-none bg-[#1c1d62] bg-[url('/images/chev-down.svg')] bg-no-repeat bg-right-4`}
                >
                  <option value="" disabled className="text-[#6a68a8]">Select one...</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Friend">A friend</option>
                  <option value="Other">Other</option>
                </select>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setFoundingMember("yes")}
                    className={`${foundingMember === "yes" ? rectOn : rectOff} px-6 py-2`}>Yes, count me in</button>
                  <button type="button" onClick={() => setFoundingMember("no")}
                    className={`${foundingMember === "no" ? rectOn : rectOff} px-6 py-2`}>Not right now</button>
                </div>
              </div>

              {/* Feedback and submit */}
              {feedback && (
                <div role={feedback.kind === 'error' ? 'alert' : 'status'} aria-live="polite" className="text-center font-semibold text-white">
                  {feedback.msg}
                </div>
              )}

              <div>
                {submitted ? (
                  <div className="flex h-12 w-full items-center justify-center rounded-[8px] bg-[linear-gradient(95deg,#9d38ff_0%,#d137d0_52%,#ed3b96_100%)] text-[clamp(16px,2.4vw,30px)] font-black text-white shadow-[0_0_28px_rgba(220,54,185,0.35)]">
                    You&apos;re on the list 💜
                  </div>
                ) : (
                  <button
                    type="submit"
                    aria-label="Join the Founding Circle"
                    disabled={submitting}
                    className="h-12 w-full cursor-pointer rounded-[8px] bg-transparent outline-none transition-all hover:bg-[#ffffff]/5 disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="flex h-full w-full items-center justify-center rounded-[8px] bg-[linear-gradient(95deg,#9d38ff_0%,#d137d0_52%,#ed3b96_100%)] text-[clamp(16px,2.4vw,30px)] font-black text-white">
                      {submitting ? 'Joining…' : 'Join the Founding Circle'}
                    </span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
