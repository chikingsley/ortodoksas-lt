import { cn } from "@/lib/utils";
import "./institutional-marks.css";

interface Props {
  className?: string;
}

export default function InstitutionalMarks({ className }: Props) {
  return (
    <span className={cn("institutional-marks", className)}>
      <img
        alt="Visuotinis Patriarchatas"
        className="institutional-marks__patriarchate"
        height="64"
        src="/assets/brand/source/ecumenical-patriarchate-emblem.svg"
        width="64"
      />
      <img
        alt="Visuotinio patriarchato egzarchatas Lietuvoje"
        className="institutional-marks__exarchate"
        height="301"
        src="/assets/brand/production/exarchate-lockup-client.png"
        width="807"
      />
    </span>
  );
}
