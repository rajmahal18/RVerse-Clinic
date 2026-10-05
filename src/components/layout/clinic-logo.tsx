import Image from "next/image";
import { cn } from "@/lib/utils";

export function ClinicLogo({ className, variant = "standard" }: { className?: string; variant?: "standard" | "large" | "compact" }) {
  const compact = variant === "compact";
  const large = variant === "large";
  return (
    <div className={cn("flex min-w-0 max-w-full items-center gap-2.5 text-slate-950", large && "flex-col gap-3 sm:flex-row", compact && "gap-2", className)}>
      <Image
        src="/icons/ocmlogo.png"
        alt="Bangsamoro seal"
        width={225}
        height={225}
        sizes={large ? "64px" : compact ? "32px" : "48px"}
        className={cn("h-12 w-12 shrink-0 object-contain", large && "h-16 w-16", compact && "h-8 w-8")}
        priority
      />
      <div className="min-w-0 flex-1">
        <p className={cn("whitespace-nowrap text-xs font-bold leading-4", large && "text-sm leading-[18px]", compact && "text-[10px] leading-3")}>
          {compact ? "OCM · BARMM" : "OFFICE OF THE CHIEF MINISTER"}
        </p>
        {!compact && <p data-clinic-region className={cn("mt-0.5 whitespace-nowrap text-[11px] font-medium leading-[14px]", large && "text-[11px] leading-4 sm:text-xs")}>
          Bangsamoro Autonomous Region in Muslim Mindanao
        </p>}
        <p className={cn("mt-1 whitespace-nowrap border-t border-slate-300 pt-1 font-serif text-lg font-bold leading-5 tracking-[0.12em]", large && "text-2xl leading-7", compact && "mt-0 border-0 pt-0 text-base leading-5 tracking-[0.04em]")}>
          THE CLINIC
        </p>
      </div>
    </div>
  );
}
