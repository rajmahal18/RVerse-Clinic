import Image from "next/image";
import { cn } from "@/lib/utils";

export function OcmLogo({ className, imageClassName }: { className?: string; imageClassName?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", className)}>
      <Image
        src="/icons/ocmlogo.png"
        alt="Office of the Chief Minister logo"
        fill
        sizes="64px"
        className={cn("object-contain", imageClassName)}
        priority
      />
    </span>
  );
}
