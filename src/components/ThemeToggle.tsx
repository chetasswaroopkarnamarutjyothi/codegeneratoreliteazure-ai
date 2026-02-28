import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

const themes = [
  { id: "dark", label: "🌙 Midnight Dark", class: "dark" },
  { id: "light", label: "☀️ Clean Light", class: "light" },
  { id: "ocean", label: "🌊 Ocean Blue", class: "theme-ocean" },
  { id: "forest", label: "🌿 Forest Green", class: "theme-forest" },
  { id: "sunset", label: "🌅 Sunset Warm", class: "theme-sunset" },
] as const;

type ThemeId = (typeof themes)[number]["id"];

export function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("codenova-theme") as ThemeId | null;
    if (stored && themes.find((t) => t.id === stored)) {
      applyTheme(stored);
    }
  }, []);

  const applyTheme = (themeId: ThemeId) => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove("dark", "light", "theme-ocean", "theme-forest", "theme-sunset");
    const theme = themes.find((t) => t.id === themeId);
    if (theme) {
      root.classList.add(theme.class);
    }
    setCurrentTheme(themeId);
    localStorage.setItem("codenova-theme", themeId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" title="Change Theme">
          <Palette className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onClick={() => applyTheme(theme.id)}
            className={currentTheme === theme.id ? "bg-primary/20 font-semibold" : ""}
          >
            {theme.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
