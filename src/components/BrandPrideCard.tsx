import React from "react";
import { Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandPrideCardProps = {
  title: string;
  subtitle: string;
  points?: string[];
  description?: string;
  cta?: React.ReactNode;
  className?: string;
};

const railColors = [
  "bg-rose-400",
  "bg-orange-400",
  "bg-amber-300",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-indigo-400",
  "bg-fuchsia-400",
];

const BrandPrideCard: React.FC<BrandPrideCardProps> = ({
  title,
  subtitle,
  points = [],
  description,
  cta,
  className,
}) => {
  return (
    <div
      className={cn(
        "rounded-[30px] border border-pink-200/30 bg-gradient-to-r from-fuchsia-500/20 via-indigo-500/15 to-pink-500/20 p-[1px] shadow-2xl",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-[28px] border border-white/20 bg-gradient-to-br from-[#17082f]/95 via-[#211047]/95 to-[#2d1048]/95 p-5 sm:p-7">
        <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 right-4 h-28 w-28 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            {railColors.map((color, idx) => (
              <span
                key={`${color}-${idx}`}
                className={cn("h-1.5 flex-1 rounded-full", color)}
              />
            ))}
          </div>

          <h2 className="text-3xl sm:text-5xl font-semibold text-white tracking-tight">
            {title}
          </h2>
          <p className="mt-2 text-xl sm:text-3xl font-semibold text-pink-200">
            {subtitle}
          </p>

          {points.length > 0 ? (
            <p className="mt-3 text-base sm:text-2xl text-white/90">
              {points.join("  •  ")}
            </p>
          ) : null}

          {description ? (
            <p className="mt-2 text-base sm:text-2xl text-white/85">{description}</p>
          ) : null}

          {cta ? <div className="mt-5">{cta}</div> : null}

          <div className="pointer-events-none absolute right-1 top-10 hidden sm:block">
            <Heart className="h-8 w-8 fill-pink-400 text-pink-400" />
            <Heart className="ml-8 mt-2 h-6 w-6 fill-violet-400 text-violet-400" />
            <Sparkles className="ml-2 mt-4 h-5 w-5 text-amber-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandPrideCard;

