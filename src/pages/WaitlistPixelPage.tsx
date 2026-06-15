import { useState, type FormEvent, type ReactNode } from "react";
import {
  Award,
  Flower2,
  Heart,
  Link2,
  ShieldPlus,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LOOKING_FOR_OPTIONS = ["Friendship", "Dating", "Community", "All of the above"];

const COMMUNITY_VALUES = [
  "Safety first",
  "Real connections",
  "No judgment",
  "LGBTQ+ inclusive",
  "Local meetups",
  "Emotional support",
  "Women-only spaces",
  "Dating without pressure",
];

const HEARD_FROM_OPTIONS = [
  { value: "TikTok", label: "TikTok" },
  { value: "Instagram", label: "Instagram" },
  { value: "Facebook", label: "Facebook" },
  { value: "Friend", label: "A friend" },
  { value: "Other", label: "Other" },
];

const benefits = [
  {
    icon: ShieldPlus,
    title: "Women-centered",
    copy: "Built by women, for women.",
  },
  {
    icon: Heart,
    title: "Safe & Intentional",
    copy: "Respect, boundaries, and safety come first.",
  },
  {
    icon: UsersRound,
    title: "Real Connections",
    copy: "Meaningful friendships and supportive community.",
  },
  {
    icon: Flower2,
    title: "Inclusive",
    copy: "LGBTQ+ inclusive and women-only spaces.",
  },
];

type Feedback = { kind: "error" | "success" | "info"; message: string };

function duplicateError(msg: string) {
  return /duplicate|unique/i.test(msg);
}

function fallbackCopyToClipboard(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

function Chip({
  children,
  selected,
  onClick,
}: {
  children: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "min-h-[38px] rounded-full border border-[#ef7bff] bg-[#3b2a8a]/70 px-[21px] text-[15px] font-semibold leading-none text-white shadow-[0_0_14px_rgba(224,91,255,0.55),inset_0_0_13px_rgba(142,92,255,0.22)] transition"
          : "min-h-[38px] rounded-full border border-[#9f54f8]/80 bg-[#30247a]/55 px-[21px] text-[15px] font-semibold leading-none text-white shadow-[inset_0_0_13px_rgba(142,92,255,0.18)] transition hover:border-[#ef7bff] hover:bg-[#3b2a8a]/70"
      }
    >
      {children}
    </button>
  );
}

function BenefitItem({ icon: Icon, title, copy }: (typeof benefits)[number]) {
  return (
    <div className="grid grid-cols-[42px_1fr] items-start gap-[17px]">
      <Icon
        aria-hidden="true"
        className="mt-0.5 h-[39px] w-[39px] text-[#f16cff] drop-shadow-[0_0_9px_rgba(223,83,255,0.75)]"
        strokeWidth={1.85}
      />
      <div>
        <h3 className="text-[15px] font-extrabold leading-[1.2] text-white">{title}</h3>
        <p className="mt-[7px] text-[13px] font-medium leading-[1.45] text-[#d9d1f3]">{copy}</p>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="mb-[10px] block text-[14px] font-extrabold uppercase tracking-[0.09em] text-[#f0ebff]">
      {children}
    </label>
  );
}

function ShareButton({
  children,
  icon,
  onClick,
}: {
  children: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[50px] items-center justify-center gap-3 rounded-[8px] border border-[#8d85e3]/55 bg-[#111b61]/70 px-6 text-[18px] font-extrabold text-white shadow-[inset_0_0_12px_rgba(100,94,220,0.16)] transition hover:border-[#c07bff]/80 hover:bg-[#1a2578]/80"
    >
      {icon}
      {children}
    </button>
  );
}

export default function WaitlistPixelPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [missing, setMissing] = useState("");
  const [heardFrom, setHeardFrom] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [communityValues, setCommunityValues] = useState<string[]>([]);
  const [foundingMember, setFoundingMember] = useState<"yes" | "no">("yes");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleLookingFor = (value: string) => {
    setFeedback(null);
    setLookingFor((prev) => {
      if (value === "All of the above") {
        return prev.includes(value) ? [] : [...LOOKING_FOR_OPTIONS];
      }
      const withoutAll = prev.filter((v) => v !== "All of the above");
      const next = withoutAll.includes(value)
        ? withoutAll.filter((v) => v !== value)
        : [...withoutAll, value];
      return next.length === 3 ? [...LOOKING_FOR_OPTIONS] : next;
    });
  };

  const toggleCommunityValue = (value: string) => {
    setFeedback(null);
    setCommunityValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedCity = city.trim();
    const trimmedMissing = missing.trim();

    if (!trimmedName || !trimmedEmail) {
      setFeedback({ kind: "error", message: "Please enter your name and email." });
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFeedback({ kind: "error", message: "Please enter a valid email address." });
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("waitlist").insert({
        name: trimmedName,
        email: trimmedEmail,
        city: trimmedCity,
        looking_for: lookingFor,
        community_values: communityValues,
        what_is_missing: trimmedMissing,
        heard_from: heardFrom,
        founding_member: foundingMember === "yes",
      });

      if (insertError && !duplicateError(insertError.message)) throw insertError;

      void supabase.functions
        .invoke("waitlist-confirm", { body: { name: trimmedName, email: trimmedEmail } })
        .then(({ error }) => {
          if (error) console.warn("Waitlist confirmation failed:", error.message);
        })
        .catch((err) => console.warn("Waitlist confirmation failed:", err));

      setSubmitted(true);
      setFeedback({ kind: "success", message: "You're on the list! Check your email for confirmation." });
    } catch (err) {
      console.error(err);
      setFeedback({ kind: "error", message: "Something went wrong. Please try again in a moment." });
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  const openShare = (network: "x" | "facebook") => {
    const pageUrl = encodeURIComponent("https://violetsandvibes.com/waitlist/");
    const shareText = encodeURIComponent(
      "Just joined the Founding Circle of Violets & Vibes - a safer, women-centered space for friendship, dating, and community."
    );
    const url =
      network === "x"
        ? `https://x.com/intent/tweet?text=${shareText}&url=${pageUrl}`
        : `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    const url = "https://violetsandvibes.com/waitlist/";
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (!fallbackCopyToClipboard(url)) {
        throw new Error("Clipboard fallback failed");
      }
      setFeedback({ kind: "info", message: "Link copied!" });
    } catch (err) {
      console.error(err);
      setFeedback({ kind: "error", message: "Could not copy the link." });
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#02072f] font-sans text-white [background:radial-gradient(circle_at_14%_8%,rgba(152,62,255,0.42),transparent_22rem),radial-gradient(circle_at_86%_88%,rgba(217,62,207,0.28),transparent_24rem),linear-gradient(150deg,#02083b_0%,#031368_44%,#05083d_100%)]">
      <div className="pointer-events-none fixed inset-0 opacity-55 [background-image:radial-gradient(circle,rgba(255,156,237,0.9)_0_1px,transparent_2px),radial-gradient(circle,rgba(197,134,255,0.65)_0_1px,transparent_2px)] [background-position:22px_46px,172px_122px] [background-size:210px_170px,290px_230px] [mask-image:linear-gradient(to_bottom,#000_0%,transparent_94%)]" />

      <img
        src="/waitlist-art/woman-corner.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-[40px] top-[1px] z-[5] w-[min(320px,34vw)] max-w-none opacity-100 mix-blend-screen [filter:brightness(1.18)_contrast(1.24)_saturate(1.42)_drop-shadow(0_0_28px_rgba(210,88,255,0.54))] [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.62)_7%,#000_15%,#000_58%,rgba(0,0,0,0.7)_73%,transparent_92%),linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.54)_7%,#000_14%,#000_68%,rgba(0,0,0,0.58)_82%,transparent_96%)] max-[680px]:left-[24px] max-[680px]:top-[58px] max-[680px]:w-[240px] max-[680px]:opacity-95"
      />

      <img
        src="/waitlist-art/flower-corner.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[23px] right-[-18px] z-[3] w-[min(282px,28vw)] max-w-none opacity-95 mix-blend-screen drop-shadow-[0_0_22px_rgba(180,75,255,0.34)] [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.42)_22%,#000_42%,#000_100%),linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.18)_10%,#000_26%,#000_80%,rgba(0,0,0,0.55)_91%,transparent_100%)] max-[680px]:bottom-[110px] max-[680px]:right-0 max-[680px]:w-[190px]"
      />

      <Sparkles className="pointer-events-none absolute right-[8.5%] top-[58px] h-8 w-8 fill-[#f191ff] text-[#f191ff] drop-shadow-[0_0_18px_rgba(234,99,255,0.9)]" />
      <span className="pointer-events-none absolute left-[17%] top-[144px] text-[18px] text-[#f191ff] drop-shadow-[0_0_18px_rgba(234,99,255,0.9)]">
        ✧
      </span>

      <div className="relative mx-auto w-full max-w-[1280px] px-[22px] pb-[30px] pt-[38px] max-[680px]:px-3 max-[680px]:pt-6">
        <header className="relative z-[6] mb-[14px] text-center max-[680px]:mb-6">
          <h1 className="bg-[linear-gradient(100deg,#8f8cff_4%,#b076ff_30%,#ff76c6_72%,#ff8bd2_100%)] bg-clip-text text-[clamp(42px,6.4vw,72px)] font-black leading-[0.96] text-transparent drop-shadow-[0_0_28px_rgba(172,100,255,0.22)] max-[680px]:text-[34px]">
            Violets &amp; Vibes
          </h1>
          <p className="mt-[18px] text-[clamp(16px,2vw,20px)] font-semibold text-[#c7bbe8] max-[680px]:text-[14px]">
            Women-centered <span className="px-3">•</span> Safe <span className="px-3">•</span> Real
          </p>
        </header>

        <section className="relative z-[2] mx-auto grid w-full max-w-[1004px] grid-cols-[267px_1fr] gap-[30px] overflow-visible rounded-[19px] border border-[#da5dff]/90 bg-[#12144e]/75 px-12 pb-[34px] pt-12 shadow-[0_0_0_1px_rgba(188,140,255,0.15)_inset,0_0_28px_rgba(207,82,255,0.42),0_34px_88px_rgba(0,0,0,0.42)] [background:radial-gradient(circle_at_8%_8%,rgba(102,63,188,0.16),transparent_17rem),radial-gradient(circle_at_96%_86%,rgba(195,69,225,0.09),transparent_18rem),linear-gradient(145deg,rgba(23,18,88,0.9),rgba(8,15,68,0.95))] before:pointer-events-none before:absolute before:left-[-2px] before:top-[-2px] before:z-0 before:h-[140px] before:w-[126px] before:rounded-tl-[19px] before:[background:linear-gradient(rgba(19,17,82,0.98),rgba(19,17,82,0.98))_0_0/126px_4px_no-repeat,linear-gradient(rgba(14,17,78,0.98),rgba(14,17,78,0.98))_0_0/4px_140px_no-repeat] after:pointer-events-none after:absolute after:bottom-[18px] after:left-[-1px] after:top-[130px] after:z-[3] after:w-px after:bg-[linear-gradient(to_bottom,rgba(234,111,255,0.98),rgba(166,84,255,0.88)_68%,rgba(166,84,255,0.42))] after:shadow-[0_0_10px_rgba(218,92,255,0.78),0_0_20px_rgba(117,93,255,0.28)] max-[980px]:grid-cols-1 max-[980px]:gap-8 max-[980px]:px-6 max-[980px]:py-[30px] max-[680px]:rounded-[14px] max-[680px]:px-[18px] max-[680px]:py-6">
          <aside className="relative z-[1] flex flex-col items-center border-r border-[#7366ca]/35 pb-6 pr-[34px] pt-[78px] text-center max-[980px]:border-b max-[980px]:border-r-0 max-[980px]:pb-[30px] max-[980px]:pr-0 max-[980px]:pt-[184px]">
            <Heart
              aria-hidden="true"
              className="mb-8 h-[76px] w-[76px] text-[#a855f7] opacity-95 drop-shadow-[0_0_15px_rgba(185,91,255,0.78)]"
              strokeWidth={1.7}
            />
            <h2 className="whitespace-nowrap text-[35px] font-black leading-[1.18] text-white max-[680px]:text-[30px]">
              Join the
              <br />
              Founding Circle
            </h2>
            <p className="mt-[18px] max-w-[302px] text-[16px] font-medium leading-[1.45] text-[#d7d0f8]">
              A safer, women-centered space for friendship, dating, and community.
            </p>
            <p className="mt-3 max-w-[302px] text-[16px] font-medium leading-[1.4] text-[#e2dcff]">
              Be one of the first to help shape the community.
            </p>

            <div className="relative my-[27px] h-px w-full bg-[linear-gradient(90deg,transparent,rgba(170,75,255,0.5),transparent)]">
              <span className="absolute left-1/2 top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white shadow-[0_0_18px_4px_rgba(180,92,255,0.95)]" />
            </div>

            <div className="w-full rounded-[13px] border border-[#8d81db]/45 bg-[#25265f]/45 p-[25px_22px_27px] text-left shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_18px_45px_rgba(2,8,47,0.12)] max-[980px]:max-w-[520px]">
              <div className="space-y-6">
                {benefits.map((benefit) => (
                  <BenefitItem key={benefit.title} {...benefit} />
                ))}
              </div>
            </div>
          </aside>

          <form className="relative z-[1] min-w-0" onSubmit={handleSubmit}>
            <div className="mb-[22px] grid grid-cols-3 gap-5 max-[980px]:grid-cols-1">
              <div>
                <FieldLabel>Your Name</FieldLabel>
                <input
                  name="name"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First name or nickname"
                  required
                  className="min-h-[45px] w-full rounded-[9px] border border-[#a196f4]/50 bg-[#252675]/50 px-4 text-[15px] text-white outline-none placeholder:text-[#dad4ff]/50 focus:border-[#e056ff] focus:bg-[#322a8a]/65 focus:shadow-[0_0_0_3px_rgba(211,77,255,0.14)]"
                />
              </div>
              <div>
                <FieldLabel>Email Address</FieldLabel>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="min-h-[45px] w-full rounded-[9px] border border-[#a196f4]/50 bg-[#252675]/50 px-4 text-[15px] text-white outline-none placeholder:text-[#dad4ff]/50 focus:border-[#e056ff] focus:bg-[#322a8a]/65 focus:shadow-[0_0_0_3px_rgba(211,77,255,0.14)]"
                />
              </div>
              <div>
                <FieldLabel>City</FieldLabel>
                <input
                  name="city"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Where are you based?"
                  className="min-h-[45px] w-full rounded-[9px] border border-[#a196f4]/50 bg-[#252675]/50 px-4 text-[15px] text-white outline-none placeholder:text-[#dad4ff]/50 focus:border-[#e056ff] focus:bg-[#322a8a]/65 focus:shadow-[0_0_0_3px_rgba(211,77,255,0.14)]"
                />
              </div>
            </div>

            <div className="mb-[22px]">
              <div className="mb-[10px] text-[14px] font-extrabold uppercase tracking-[0.09em] text-[#f0ebff]">
                What are you looking for?
              </div>
              <div className="flex flex-wrap gap-[10px]">
                {LOOKING_FOR_OPTIONS.map((item) => (
                  <Chip
                    key={item}
                    selected={lookingFor.includes(item)}
                    onClick={() => toggleLookingFor(item)}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="my-[26px] flex items-center gap-4 text-center text-[15px] font-black uppercase tracking-[0.1em] text-[#ff75dc] before:h-px before:flex-1 before:bg-[linear-gradient(90deg,transparent,rgba(255,77,211,0.72))] after:h-px after:flex-1 after:bg-[linear-gradient(90deg,rgba(255,77,211,0.72),transparent)]">
              Tell us a little more
            </div>

            <div className="mb-[22px]">
              <div className="mb-[10px] text-[14px] font-extrabold uppercase tracking-[0.09em] text-[#f0ebff]">
                What matters most to you in a community space?
              </div>
              <div className="flex flex-wrap gap-[10px]">
                {COMMUNITY_VALUES.map((item) => (
                  <Chip
                    key={item}
                    selected={communityValues.includes(item)}
                    onClick={() => toggleCommunityValue(item)}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="mb-[22px]">
              <FieldLabel>What&apos;s missing from the apps or spaces you&apos;ve tried?</FieldLabel>
              <textarea
                name="missing"
                value={missing}
                onChange={(e) => setMissing(e.target.value)}
                placeholder="Be honest — this helps us build what you actually need."
                className="min-h-[86px] w-full resize-y rounded-[9px] border border-[#a196f4]/50 bg-[#252675]/50 p-4 text-[15px] leading-[1.45] text-white outline-none placeholder:text-[#dad4ff]/50 focus:border-[#e056ff] focus:bg-[#322a8a]/65 focus:shadow-[0_0_0_3px_rgba(211,77,255,0.14)]"
              />
            </div>

            <div className="mb-[22px]">
              <FieldLabel>How did you hear about us?</FieldLabel>
              <select
                name="heardFrom"
                aria-label="How did you hear about us?"
                value={heardFrom}
                onChange={(e) => { setFeedback(null); setHeardFrom(e.target.value); }}
                className="min-h-[45px] w-full appearance-none rounded-[9px] border border-[#a196f4]/50 bg-[#252675]/50 px-4 text-[15px] text-white outline-none focus:border-[#e056ff] focus:bg-[#322a8a]/65 focus:shadow-[0_0_0_3px_rgba(211,77,255,0.14)] [&>option]:bg-[#12144e] [&>option]:text-white"
              >
                <option value="" disabled className="text-[#dad4ff]/50">Select one...</option>
                {HEARD_FROM_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="relative mb-[26px] rounded-[9px] border border-[#d347ff]/75 bg-[#40288e]/55 py-5 pl-7 pr-28 shadow-[0_0_18px_rgba(188,74,255,0.11)] max-[680px]:pr-7">
              <div className="mb-3 whitespace-nowrap text-[13px] font-extrabold uppercase tracking-[0.07em] text-[#f0ebff] max-[680px]:whitespace-normal">
                Would you like to be considered as a founding member?
              </div>
              <p className="mb-4 text-[13px] font-medium leading-[1.45] text-[#dad3fb]">
                Founding members get early access, a special badge, 6 months of free premium, 3 invite passes for trusted friends, and a voice in shaping the community.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => setFoundingMember("yes")}
                  className={
                    foundingMember === "yes"
                      ? "min-h-[39px] min-w-[172px] rounded-[7px] bg-[linear-gradient(90deg,#a345ff,#ea3ea4)] px-6 text-[15px] font-bold text-white shadow-[0_0_16px_rgba(188,74,255,0.45)] transition"
                      : "min-h-[39px] min-w-[172px] rounded-[7px] border border-[#9f85ff]/80 bg-transparent px-6 text-[15px] font-bold text-white transition hover:bg-[#3b2a8a]/40"
                  }
                >
                  Yes, count me in
                </button>
                <button
                  type="button"
                  onClick={() => setFoundingMember("no")}
                  className={
                    foundingMember === "no"
                      ? "min-h-[39px] min-w-[172px] rounded-[7px] bg-[#252675]/70 border border-[#9f85ff]/80 px-6 text-[15px] font-bold text-white shadow-[0_0_10px_rgba(155,130,255,0.3)] transition"
                      : "min-h-[39px] min-w-[172px] rounded-[7px] border border-[#9f85ff]/80 bg-transparent px-6 text-[15px] font-bold text-white transition hover:bg-[#3b2a8a]/40"
                  }
                >
                  Not right now
                </button>
              </div>
              <Award className="absolute right-7 top-1/2 h-[94px] w-[94px] -translate-y-1/2 text-[#e05cff] opacity-90 drop-shadow-[0_0_10px_rgba(200,83,255,0.48)] max-[680px]:static max-[680px]:mt-4 max-[680px]:translate-y-0" strokeWidth={1.5} />
            </div>

            {feedback && !submitted && feedback.kind === "error" && (
              <div
                role="alert"
                className="mb-4 rounded-[9px] border border-[#ff74d9]/80 bg-[#3d123e]/95 px-4 py-3 text-center text-[15px] font-semibold text-white"
              >
                {feedback.message}
              </div>
            )}
            {feedback && !submitted && feedback.kind === "success" && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 rounded-[9px] border border-[#a981ff]/80 bg-[#211d68]/95 px-4 py-3 text-center text-[15px] font-semibold text-white"
              >
                {feedback.message}
              </div>
            )}

            {submitted ? (
              <div className="flex min-h-[68px] w-full items-center justify-center rounded-[8px] bg-[linear-gradient(95deg,#9d38ff_0%,#d137d0_52%,#ed3b96_100%)] text-[clamp(22px,2.8vw,30px)] font-black text-white shadow-[0_16px_34px_rgba(220,54,185,0.22)]">
                You&apos;re on the list 💜
              </div>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[68px] w-full rounded-[8px] bg-[linear-gradient(95deg,#9d38ff_0%,#d137d0_52%,#ed3b96_100%)] text-[clamp(22px,2.8vw,30px)] font-black text-white shadow-[0_16px_34px_rgba(220,54,185,0.22)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-75"
              >
                {submitting ? "Joining..." : "Join the Founding Circle 💜"}
              </button>
            )}
          </form>
        </section>

        <section className="relative z-[4] mx-auto mt-[34px] w-full max-w-[820px] text-center">
          <p className="mb-[18px] text-[16px] font-black uppercase tracking-[0.14em] text-[#b58df5]">
            Share with someone who belongs here
          </p>
          {feedback?.kind === "info" && (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 rounded-[9px] border border-[#8b8dff]/80 bg-[#17194f]/95 px-4 py-2 text-center text-[15px] font-semibold text-white"
            >
              {feedback.message}
            </div>
          )}
          <div className="grid grid-cols-3 gap-5 max-[680px]:grid-cols-1">
            <ShareButton icon={<X className="h-5 w-5" />} onClick={() => openShare("x")}>
              X/Twitter
            </ShareButton>
            <ShareButton
              icon={
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[16px] font-black leading-none text-[#111b61]">
                  f
                </span>
              }
              onClick={() => openShare("facebook")}
            >
              Facebook
            </ShareButton>
            <ShareButton icon={<Link2 className="h-5 w-5" />} onClick={() => void copyLink()}>
              Copy link
            </ShareButton>
          </div>
        </section>

        <footer className="relative z-[4] mx-auto mt-[34px] w-full max-w-[980px] border-t border-[#8277de]/20 pt-[26px] text-center text-[16px] leading-[1.55] text-[#9d96c9]">
          <p>No spam, ever. We&apos;ll only use your email for Violets &amp; Vibes updates, early access, and waitlist invitations.</p>
          <p className="mt-[14px]">
            <a href="/terms" className="text-[#b7a6f3] underline underline-offset-4">
              Terms
            </a>
            <span className="px-3">•</span>
            © 2026 Violets &amp; Vibes
          </p>
        </footer>
      </div>
    </main>
  );
}
