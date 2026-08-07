import { cn } from "@/lib/utils";
import "./institutional-marks.css";

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
      className={cn(
        "institutional-marks",
        `institutional-marks--${tone}`,
        className
      )}
    >
      <img
        alt="Visuotinis Patriarchatas"
        className="institutional-marks__patriarchate"
        height="64"
        src="/assets/brand/source/ecumenical-patriarchate-emblem.svg"
        width="64"
      />
      <span
        aria-label="Visuotinio patriarchato egzarchatas Lietuvoje"
        className="institutional-marks__exarchate"
        role="img"
      >
        <img
          alt=""
          className="institutional-marks__exarchate-crest"
          height="408"
          src="/assets/brand/production/exarchate-crest-client.png"
          width="387"
        />
        <span
          aria-hidden="true"
          className="institutional-marks__exarchate-wordmark"
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
