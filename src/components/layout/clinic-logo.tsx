import Image from "next/image";
import { cn } from "@/lib/utils";

export function ClinicLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/Seal_Header_Clinic_2026.png"
      alt="Office of the Chief Minister — The Clinic"
      width={1600}
      height={400}
      sizes="(max-width: 767px) 180px, 240px"
      className={cn("h-auto min-w-0 max-w-full object-contain", className)}
      priority
    />
  );
}
