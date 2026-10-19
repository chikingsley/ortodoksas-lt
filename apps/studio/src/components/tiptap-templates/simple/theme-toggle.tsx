import { useEffect, useState } from "react";

import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon";
import { SunIcon } from "@/components/tiptap-icons/sun-icon";
import { Button } from "@/components/tiptap-ui-primitive/button/button";
import { useMediaQuery } from "@/hooks/use-media-query";

export function ThemeToggle() {
  const systemDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [preference, setPreference] = useState<boolean | null>(null);
  const isDarkMode = preference ?? systemDarkMode;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setPreference(!isDarkMode);
  };

  return (
    <Button
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      onClick={toggleDarkMode}
      variant="ghost"
    >
      {isDarkMode ? (
        <MoonStarIcon className="tiptap-button-icon" />
      ) : (
        <SunIcon className="tiptap-button-icon" />
      )}
    </Button>
  );
}
