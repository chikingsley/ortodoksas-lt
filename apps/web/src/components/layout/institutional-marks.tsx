import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  tone?: "default" | "reverse";
}

export default function InstitutionalMarks({
  className,
  tone = "default",
}: Props) {
  return (
    <span
      className={cn("inline-flex items-center gap-3.5 max-sm:gap-2", className)}
    >
      <img
        alt="Visuotinis Patriarchatas"
        className="size-[52px] shrink-0 object-contain max-sm:size-10"
        height="64"
        src="/assets/brand/source/ecumenical-patriarchate-emblem.svg"
        width="64"
      />
      <span
        aria-label="Visuotinio patriarchato egzarchatas Lietuvoje"
        className={cn(
          "grid w-[133px] grid-cols-[36.86%_59.62%] items-center gap-[3.52%] text-primary max-sm:w-[103px]",
          tone === "reverse" && "text-white"
        )}
        role="img"
      >
        <img
          alt=""
          className="h-auto w-full"
          height="408"
          src="/assets/brand/production/exarchate-crest-client.png"
          width="387"
        />
        <span
          aria-hidden="true"
          className="grid whitespace-nowrap font-bold font-sans text-[10.32px] leading-[1.19] tracking-normal [-webkit-text-stroke:0.012em_currentcolor] max-sm:text-[8px]"
        >
          <span>VISUOTINIO</span>
          <span>PATRIARCHATO</span>
          <span>EGZARCHATAS</span>
          <span>LIETUVOJE</span>
        </span>
      </span>
    </span>
  );
}
