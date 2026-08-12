import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export default function PublicationLogo({ className }: Props) {
  return (
    <img
      alt="ortodoksas.lt"
      className={cn("block h-auto w-[210px]", className)}
      height="193"
      src="/assets/brand/production/ortodoksas-logo-official.svg"
      width="1022"
    />
  );
}
