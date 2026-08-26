import { cn } from "@/components/ui/utils";

interface Props {
  className?: string;
}

export default function PublicationLogo({ className }: Props) {
  return (
    <img
      alt="ortodoksas.lt"
      className={cn("block h-auto w-[210px]", className)}
      height="193"
      src="/assets/brand/ortodoksas-logo-official.svg"
      width="1022"
    />
  );
}
