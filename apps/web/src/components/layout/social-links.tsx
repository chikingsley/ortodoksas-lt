import { MailIcon, RssIcon } from "lucide-react";
import { siFacebook, siInstagram, siYoutube } from "simple-icons";
import { cn } from "@/components/ui/utils";
import type { SiteLocale } from "@/i18n/config";
import { ui } from "@/i18n/ui";

interface Props {
  className?: string;
  contactHref?: string;
  locale?: SiteLocale;
}

const socialLinks = [
  {
    href: "https://www.facebook.com/ortodoksas",
    icon: siFacebook,
    label: "Facebook",
  },
  {
    href: "https://www.instagram.com/ortodoksas.lt",
    icon: siInstagram,
    label: "Instagram",
  },
  {
    href: "https://www.youtube.com/@OrtodoksasLt",
    icon: siYoutube,
    label: "YouTube",
  },
] as const;

export default function SocialLinks({
  className,
  contactHref = "/p/kontaktai_30.html",
  locale = "lt",
}: Props) {
  const copy = ui[locale];
  return (
    <nav
      aria-label={copy.contacts}
      className={cn("flex items-center", className)}
    >
      {socialLinks.map(({ href, icon, label }) => (
        <a
          aria-label={label}
          className="grid size-11 place-items-center text-foreground transition-colors hover:text-primary focus-visible:text-primary [&_svg]:size-3.5"
          href={href}
          key={label}
          rel="noreferrer"
          target="_blank"
        >
          <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
            <path d={icon.path} />
          </svg>
          <span className="sr-only">{label}</span>
        </a>
      ))}
      <a
        aria-label={copy.contact}
        className="grid size-11 place-items-center text-foreground transition-colors hover:text-primary focus-visible:text-primary [&_svg]:size-4"
        href={contactHref}
      >
        <MailIcon aria-hidden="true" />
        <span className="sr-only">{copy.contact}</span>
      </a>
      <a
        aria-label="RSS"
        className="grid size-11 place-items-center text-foreground transition-colors hover:text-primary focus-visible:text-primary [&_svg]:size-4"
        href="/rss.xml"
      >
        <RssIcon aria-hidden="true" />
        <span className="sr-only">RSS</span>
      </a>
    </nav>
  );
}
