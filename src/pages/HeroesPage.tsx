import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Handshake, Heart, Share2, Users } from "lucide-react";

type ReviewType = "Review" | "Complaint";

type LocalReview = {
  type: ReviewType;
  text: string;
  name: string;
  contact: string;
  date: string;
};

type Note = {
  text: string;
  tone: "ok" | "err";
} | null;

const STORAGE_KEY = "vv_reviews";
const joinPath = "/signin?redirect=%2Fsocial";

const seedReview: LocalReview = {
  type: "Review",
  text: "good",
  name: "",
  contact: "",
  date: "2/27/2026, 2:43:50 AM",
};

const featureRows = [
  {
    icon: Users,
    text: "Too many platforms prioritize attention over authenticity.",
  },
  {
    icon: Heart,
    text: "Violets & Vibes was created intentionally, a space built for women who value respect, accountability, and genuine connection.",
  },
  {
    icon: Handshake,
    text: "Dating is welcome. Friendship is valued. Community is the foundation.",
  },
];

const findCards = [
  {
    image: "/heroes/find-intentional.png",
    title: "Intentional Connection",
    text: "Meet women who value communication, alignment, and shared energy.",
  },
  {
    image: "/heroes/find-inclusive.png",
    title: "Inclusive Community",
    text: "All identities. All orientations. All welcome, within a women-centered space.",
  },
  {
    image: "/heroes/find-private.png",
    title: "Private Conversations",
    text: "Build trust at your own pace.",
  },
  {
    image: "/heroes/find-safety.png",
    title: "Safety First",
    text: "Respect is expected. Boundaries are honored. Accountability matters.",
  },
];

const loadReviews = (): LocalReview[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is LocalReview => {
      return (
        item &&
        (item.type === "Review" || item.type === "Complaint") &&
        typeof item.text === "string" &&
        typeof item.date === "string"
      );
    });
  } catch {
    return [];
  }
};

const persistReviews = (reviews: LocalReview[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // Keep the session state even if browser storage is unavailable.
  }
};

const HeroesPage: React.FC = () => {
  const contactEmail =
    import.meta.env.VITE_CONTACT_EMAIL || "chava@violetsandvibes.com";
  const [activeType, setActiveType] = useState<ReviewType>("Review");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [reviews, setReviews] = useState<LocalReview[]>([]);
  const [note, setNote] = useState<Note>(null);

  useEffect(() => {
    setReviews(loadReviews());
  }, []);

  const saveReview = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setNote({ text: "Please write a message first.", tone: "err" });
      return null;
    }

    const entry: LocalReview = {
      type: activeType,
      text: trimmedMessage,
      name: name.trim(),
      contact: contact.trim(),
      date: new Date().toLocaleString(),
    };
    const nextReviews = [entry, ...reviews];

    setReviews(nextReviews);
    persistReviews(nextReviews);
    setMessage("");
    setNote({ text: `${activeType} posted. Thank you!`, tone: "ok" });

    return entry;
  };

  const openEmail = (entry?: LocalReview) => {
    const feedback = entry ?? {
      type: activeType,
      text: message.trim(),
      name: name.trim(),
      contact: contact.trim(),
      date: "",
    };
    const subject = encodeURIComponent(
      `[${feedback.type}] Violets & Vibes feedback`
    );
    const body = encodeURIComponent(
      [
        feedback.text,
        "",
        `- ${feedback.name || "Anonymous"}`,
        feedback.contact,
      ]
        .filter(Boolean)
        .join("\n")
    );

    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  };

  const handleSendFeedback = () => {
    const saved = saveReview();
    if (saved) openEmail(saved);
  };

  const handleShare = async () => {
    const shareData = {
      title: "Violets & Vibes",
      text: "A safer space for women to connect.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setNote({ text: "Link copied.", tone: "ok" });
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        setNote({ text: "Could not share automatically.", tone: "err" });
      }
    }
  };

  const allReviews = [...reviews, seedReview];

  return (
    <main className="vv-heroes-page">
      <div className="vv-wrap">
        <section className="vv-panel vv-hero">
          <img
            className="vv-hero-art"
            alt="Illustration of a woman in profile with flowing hair and flowers"
            src="/heroes/hero-art.png"
          />
          <div className="vv-logo">Violets &amp; Vibes</div>
          <h1>A Safer Space for Women to Connect.</h1>
          <p>
            Violets &amp; Vibes is a protected, women-centered community where
            meaningful friendships, relationships, and real connection can grow
            without pressure, intrusion, or chaos.
          </p>
          <p>
            Inclusive of transgender women and non-binary individuals who align
            with a woman-centered space.
          </p>
          <div className="vv-tagline">
            Women-centered. Inclusive. Safety-first.
          </div>
          <div className="vv-btn-row">
            <Link className="vv-btn vv-btn-pink" to={joinPath}>
              Join the Community
            </Link>
            <Link className="vv-btn vv-btn-ghost" to={joinPath}>
              Sign In
            </Link>
            <button
              className="vv-btn vv-btn-ghost"
              type="button"
              onClick={() => void handleShare()}
            >
              <Share2 aria-hidden="true" size={15} />
              Share Violets &amp; Vibes
            </button>
          </div>
        </section>

        <section className="vv-two-col">
          <div className="vv-panel vv-feat vv-feat-blue">
            <h2>
              Because Women Deserve
              <br />
              Better Online Spaces.
            </h2>
            {featureRows.map(({ icon: Icon, text }) => (
              <div className="vv-frow" key={text}>
                <div className="vv-ficon">
                  <Icon aria-hidden="true" size={18} strokeWidth={2} />
                </div>
                <span>{text}</span>
              </div>
            ))}
            <Link className="vv-btn vv-btn-pink" to={joinPath}>
              Create Your Profile
            </Link>
          </div>

          <div className="vv-panel vv-feat vv-feat-purple">
            <h2>Protected. Intentional. Clear.</h2>
            <p>
              Violets &amp; Vibes is created exclusively for women, inclusive
              of transgender women and non-binary individuals who align with a
              woman-centered community.
            </p>
            <p>This platform is not open to men or couples.</p>
            <p>
              It exists to provide women a space free from unwanted pressure,
              fetishization, and intrusion, where connection can happen safely
              and intentionally.
            </p>
            <p className="vv-accent">Because women deserve that.</p>
          </div>
        </section>

        <section className="vv-panel vv-founder">
          <div>
            <div className="vv-label">FOUNDER NOTE</div>
            <p>
              Violets &amp; Vibes was created intentionally to provide women a
              protected digital space. Thank you for helping shape a culture
              built on safety, respect, and meaningful connection.
            </p>
          </div>
          <img
            className="vv-fn-icon"
            width="80"
            height="58"
            alt="Flower and heart icon"
            src="/heroes/founder-icon.png"
          />
        </section>

        <section className="vv-panel vv-find">
          <h2>What You'll Find Here</h2>
          <div className="vv-find-grid">
            {findCards.map((card) => (
              <div className="vv-find-card" key={card.title}>
                <div className="vv-ic">
                  <img alt="" src={card.image} />
                </div>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="vv-panel vv-safe">
          <h2>Connection Should Feel Safe.</h2>
          <p>
            Whether you're here for friendship, romance, conversation, or
            community, you deserve a space that feels aligned with your values.
          </p>
          <p>
            No chaos. No performance. No outside agendas. Just connection with
            intention.
          </p>
          <img className="vv-heart" alt="Heart icon" src="/heroes/safe-heart.png" />
        </section>

        <section className="vv-contact-wrap" id="contact">
          <div className="vv-contact-left">
            <h2>Comments, Suggestions, or Direct Contact</h2>
            <div className="vv-sub">
              Have ideas, feedback, or a support request? Send a note directly.
            </div>
            <div className="vv-field-row">
              <input
                className="vv-inp"
                placeholder="Your name (optional)"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <input
                className="vv-inp vv-contact-input"
                placeholder="Your contact (optional)"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
              />
            </div>
            <textarea
              className="vv-inp"
              placeholder="Share your comments or suggestions..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <div className="vv-pills" aria-label="Feedback type">
              {(["Review", "Complaint"] as const).map((type) => (
                <button
                  className={`vv-pill ${
                    activeType === type ? "vv-pill-on" : "vv-pill-off"
                  }`}
                  key={type}
                  type="button"
                  onClick={() => setActiveType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="vv-send-row">
              <button className="vv-btn-sm" type="button" onClick={saveReview}>
                Leave a Review
              </button>
              <button
                className="vv-btn-sm"
                type="button"
                onClick={() => openEmail()}
              >
                Email Directly
              </button>
              <button
                className="vv-btn-sm vv-btn-send"
                type="button"
                onClick={handleSendFeedback}
              >
                Send Feedback
              </button>
            </div>
            <div
              className={`vv-form-note ${note ? `vv-${note.tone}` : ""}`}
              role="status"
              aria-live="polite"
            >
              {note?.text}
            </div>
          </div>

          <div className="vv-contact-right">
            <h2>Community Reviews &amp; Complaints</h2>
            <div>
              {allReviews.map((review, index) => (
                <div className="vv-review" key={`${review.date}-${index}`}>
                  <div>
                    <div className="vv-rtext">{review.text}</div>
                    <div className="vv-rdate">{review.date}</div>
                  </div>
                  <span
                    className={`vv-review-tag ${
                      review.type === "Complaint" ? "vv-complaint" : ""
                    }`}
                  >
                    {review.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="vv-panel vv-final">
          <div className="vv-final-text">
            <h2>Find Your People. Feel the Vibe.</h2>
            <p>
              Join Violets &amp; Vibes and start building connections that feel
              real, respectful, and aligned.
            </p>
          </div>
          <Link className="vv-btn-final" to={joinPath}>
            Join Violets &amp; Vibes
          </Link>
        </section>

        <footer className="vv-footer">
          <Link className="vv-ul" to="/privacy">
            Privacy Policy
          </Link>
          <Link className="vv-ul" to="/terms">
            Terms of Service
          </Link>
          <Link to="/data-deletion">Data Deletion</Link>
          <a href={`mailto:${contactEmail}`}>Contact</a>
        </footer>
      </div>

      <style>{`
        .vv-heroes-page {
          --vv-text-main: #eef0ff;
          --vv-text-soft: #c8cdf0;
          --vv-pink-2: #f06ec0;
          --vv-pink-btn: linear-gradient(90deg, #ee49a8, #d94fc0);
          --vv-border-soft: rgba(150, 140, 230, 0.22);
          min-height: 100vh;
          box-sizing: border-box;
          background: #0a0e2e;
          color: var(--vv-text-main);
          font-family: Inter, sans-serif;
          padding: 14px;
          -webkit-font-smoothing: antialiased;
        }

        .vv-heroes-page *,
        .vv-heroes-page *::before,
        .vv-heroes-page *::after {
          box-sizing: border-box;
        }

        .vv-wrap {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .vv-panel {
          border-radius: 8px;
          border: 1px solid var(--vv-border-soft);
          overflow: hidden;
        }

        .vv-hero {
          border-color: rgba(120, 110, 220, 0.4);
          background: linear-gradient(120deg, #0d1036, #121546 60%, #171a52);
          padding: 38px 40px 34px;
          position: relative;
          overflow: hidden;
        }

        .vv-logo {
          font-family: "Dancing Script", cursive;
          font-size: 38px;
          font-weight: 700;
          background: linear-gradient(90deg, #ff7a3c, #ffd23c, #5ad17a, #42c0f5, #a855f7);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
          margin-bottom: 16px;
          position: relative;
          z-index: 2;
        }

        .vv-hero h1 {
          font-size: 42px;
          font-weight: 800;
          letter-spacing: 0;
          line-height: 1.1;
          max-width: 640px;
          margin: 0 0 18px;
          position: relative;
          z-index: 2;
        }

        .vv-hero p {
          color: var(--vv-text-soft);
          font-size: 15px;
          line-height: 1.55;
          max-width: 600px;
          margin: 0 0 10px;
          position: relative;
          z-index: 2;
        }

        .vv-tagline {
          color: var(--vv-pink-2);
          font-weight: 700;
          font-size: 15px;
          margin: 18px 0 22px;
          position: relative;
          z-index: 2;
        }

        .vv-btn-row,
        .vv-send-row {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          position: relative;
          z-index: 2;
        }

        .vv-hero-art {
          position: absolute;
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          height: 104%;
          width: auto;
          pointer-events: none;
          z-index: 1;
        }

        .vv-btn,
        .vv-btn-final {
          border-radius: 8px;
          padding: 13px 22px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
          text-decoration: none;
          color: var(--vv-text-main);
          line-height: 1;
          font-family: inherit;
        }

        .vv-btn:hover,
        .vv-btn-final:hover,
        .vv-btn-sm:hover {
          transform: translateY(-2px);
        }

        .vv-btn-pink,
        .vv-btn-final {
          background: var(--vv-pink-btn);
          color: #fff;
          box-shadow: 0 6px 18px rgba(230, 80, 170, 0.35);
        }

        .vv-btn-ghost {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(170, 160, 230, 0.4);
        }

        .vv-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .vv-feat {
          padding: 32px 32px 30px;
        }

        .vv-feat-blue {
          background: linear-gradient(150deg, #1b4193, #16306f);
        }

        .vv-feat-purple {
          background: linear-gradient(150deg, #3a2c82, #241a56);
        }

        .vv-feat h2,
        .vv-find h2,
        .vv-safe h2,
        .vv-contact-left h2,
        .vv-final h2 {
          color: var(--vv-text-main);
          margin: 0;
        }

        .vv-feat h2 {
          font-size: 26px;
          font-weight: 800;
          line-height: 1.22;
          margin-bottom: 24px;
        }

        .vv-feat-purple h2 {
          margin-bottom: 18px;
        }

        .vv-frow {
          display: flex;
          gap: 15px;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .vv-ficon {
          flex: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(190, 180, 255, 0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c8b8ff;
        }

        .vv-frow span {
          color: var(--vv-text-soft);
          font-size: 14px;
          line-height: 1.5;
          padding-top: 9px;
        }

        .vv-feat-purple p {
          color: var(--vv-text-soft);
          font-size: 14px;
          line-height: 1.55;
          margin: 0 0 16px;
        }

        .vv-feat-purple .vv-accent {
          color: var(--vv-pink-2);
          font-weight: 700;
          margin-top: 2px;
        }

        .vv-feat .vv-btn-pink {
          margin-top: 8px;
        }

        .vv-founder {
          background: linear-gradient(120deg, #1b2868, #212a72 60%, #241f66);
          padding: 24px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .vv-label {
          color: var(--vv-pink-2);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.6px;
          margin-bottom: 8px;
        }

        .vv-founder p {
          color: var(--vv-text-soft);
          font-size: 14px;
          line-height: 1.55;
          max-width: 880px;
          margin: 0;
        }

        .vv-fn-icon {
          flex: none;
        }

        .vv-find {
          background: linear-gradient(160deg, #15214f, #101a44);
          padding: 32px 32px 36px;
        }

        .vv-find h2 {
          text-align: center;
          font-size: 27px;
          font-weight: 800;
          margin-bottom: 28px;
        }

        .vv-find-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .vv-find-card {
          background: rgba(20, 26, 68, 0.6);
          border: 1px solid var(--vv-border-soft);
          border-radius: 8px;
          padding: 22px 20px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .vv-ic {
          flex: none;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }

        .vv-ic img {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }

        .vv-find-card h3 {
          color: var(--vv-text-main);
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 9px;
        }

        .vv-find-card p {
          color: var(--vv-text-soft);
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }

        .vv-safe {
          background: linear-gradient(120deg, #2d2070, #3a2a7e 50%, #2e2272);
          padding: 30px 36px;
          text-align: center;
          position: relative;
        }

        .vv-safe h2 {
          font-size: 25px;
          font-weight: 800;
          margin-bottom: 16px;
        }

        .vv-safe p {
          color: var(--vv-text-soft);
          font-size: 14px;
          line-height: 1.55;
          max-width: 880px;
          margin: 0 auto 8px;
        }

        .vv-heart {
          position: absolute;
          right: 40px;
          top: 50%;
          transform: translateY(-50%);
          width: 54px;
          height: auto;
        }

        .vv-contact-wrap {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          background: linear-gradient(150deg, #141f4c, #101a44);
          padding: 28px 32px;
          border-radius: 8px;
          border: 1px solid var(--vv-border-soft);
        }

        .vv-contact-left {
          padding-right: 32px;
          border-right: 1px solid var(--vv-border-soft);
        }

        .vv-contact-left h2 {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .vv-sub {
          color: var(--vv-text-soft);
          font-size: 13px;
          margin-bottom: 18px;
        }

        .vv-field-row {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .vv-inp {
          width: 100%;
          background: rgba(20, 28, 62, 0.7);
          border: 1px solid var(--vv-border-soft);
          border-radius: 8px;
          padding: 12px 14px;
          color: var(--vv-text-main);
          font-size: 13px;
          font-family: inherit;
        }

        .vv-inp::placeholder {
          color: #9aa0d0;
        }

        .vv-contact-input {
          border-color: rgba(150, 110, 220, 0.5);
        }

        textarea.vv-inp {
          resize: vertical;
          min-height: 92px;
          margin-bottom: 14px;
          display: block;
        }

        .vv-pills {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }

        .vv-pill {
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
          font-family: inherit;
        }

        .vv-pill-on {
          background: linear-gradient(90deg, #b14fd0, #d24fa8);
          border: 1px solid transparent;
          color: #fff;
        }

        .vv-pill-off {
          background: transparent;
          border: 1px solid var(--vv-border-soft);
          color: var(--vv-text-soft);
        }

        .vv-send-row {
          gap: 12px;
        }

        .vv-btn-sm {
          flex: 1;
          min-width: 150px;
          border-radius: 8px;
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid var(--vv-border-soft);
          background: rgba(255, 255, 255, 0.02);
          color: var(--vv-text-main);
          transition: transform 0.15s ease;
          text-align: center;
          font-family: inherit;
        }

        .vv-btn-send {
          background: linear-gradient(90deg, #2563eb, #1c60e9);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }

        .vv-form-note {
          margin-top: 12px;
          font-size: 13px;
          min-height: 18px;
        }

        .vv-ok {
          color: #7ee0a6;
        }

        .vv-err {
          color: #ff8ba0;
        }

        .vv-contact-right {
          padding-left: 32px;
        }

        .vv-contact-right h2 {
          color: var(--vv-text-main);
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 16px;
        }

        .vv-review {
          background: rgba(18, 24, 58, 0.5);
          border: 1px solid var(--vv-border-soft);
          border-radius: 8px;
          padding: 16px 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .vv-review + .vv-review {
          margin-top: 12px;
        }

        .vv-rtext {
          color: var(--vv-text-main);
          font-size: 14px;
          font-weight: 600;
          line-height: 1.4;
          margin-bottom: 7px;
          overflow-wrap: anywhere;
        }

        .vv-rdate {
          color: #9aa0d0;
          font-size: 12px;
        }

        .vv-review-tag {
          border: 1px solid var(--vv-pink-2);
          color: var(--vv-pink-2);
          border-radius: 999px;
          padding: 3px 12px;
          font-size: 11px;
          font-weight: 600;
          flex: none;
        }

        .vv-review-tag.vv-complaint {
          border-color: #f0a04f;
          color: #f0b46e;
        }

        .vv-final {
          background: linear-gradient(100deg, #5e4196, #4a4aa0 50%, #374ca6);
          padding: 30px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .vv-final-text {
          flex: 1;
          text-align: center;
        }

        .vv-final h2 {
          font-size: 25px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .vv-final p {
          color: rgba(255, 255, 255, 0.82);
          font-size: 14px;
          margin: 0 auto;
          max-width: 680px;
          line-height: 1.5;
        }

        .vv-btn-final {
          border-radius: 999px;
          padding: 14px 26px;
          font-weight: 700;
          flex: none;
        }

        .vv-footer {
          text-align: center;
          padding: 16px 14px 10px;
        }

        .vv-footer a {
          color: var(--vv-text-soft);
          font-size: 13px;
          margin: 0 14px;
          text-decoration: none;
        }

        .vv-footer a:hover {
          color: #fff;
        }

        .vv-footer a.vv-ul {
          text-decoration: underline;
        }

        @media (max-width: 860px) {
          .vv-two-col {
            grid-template-columns: 1fr;
          }

          .vv-hero-art {
            opacity: 0.25;
            height: 80%;
          }

          .vv-hero h1 {
            font-size: 30px;
          }

          .vv-feat h2 {
            font-size: 22px;
          }

          .vv-find-grid {
            grid-template-columns: 1fr 1fr;
          }

          .vv-contact-wrap {
            grid-template-columns: 1fr;
          }

          .vv-contact-left {
            border-right: none;
            padding-right: 0;
            border-bottom: 1px solid var(--vv-border-soft);
            padding-bottom: 24px;
            margin-bottom: 24px;
          }

          .vv-contact-right {
            padding-left: 0;
          }

          .vv-final {
            flex-direction: column;
            align-items: flex-start;
          }

          .vv-final-text {
            text-align: left;
          }
        }

        @media (max-width: 640px) {
          .vv-heroes-page {
            padding: 10px;
          }

          .vv-hero,
          .vv-feat,
          .vv-find,
          .vv-safe,
          .vv-contact-wrap,
          .vv-final,
          .vv-founder {
            padding-left: 20px;
            padding-right: 20px;
          }

          .vv-field-row {
            flex-direction: column;
          }

          .vv-find-grid {
            grid-template-columns: 1fr;
          }

          .vv-heart {
            opacity: 0.28;
            right: 18px;
          }

          .vv-footer {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px 14px;
          }

          .vv-footer a {
            margin: 0;
          }
        }
      `}</style>
    </main>
  );
};

export default HeroesPage;
