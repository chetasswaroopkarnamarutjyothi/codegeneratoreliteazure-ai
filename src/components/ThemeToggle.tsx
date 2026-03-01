import { Palette, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

const themes = [
  { id: "dark", label: "🌙 Midnight Dark", class: "dark", group: "dark" },
  { id: "light", label: "☀️ Clean Light", class: "light", group: "light" },
  { id: "hybrid", label: "🌓 Hybrid Mix", class: "theme-hybrid", group: "mix" },
] as const;

type ThemeId = (typeof themes)[number]["id"] | "system";

const ALL_THEME_CLASSES = themes.map(t => t.class);

export function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("codenova-theme") as ThemeId | null;
    if (stored === "system") {
      applySystemTheme();
      setCurrentTheme("system");
    } else if (stored && themes.find((t) => t.id === stored)) {
      applyTheme(stored);
    }
  }, []);

  const applySystemTheme = () => {
    const root = document.documentElement;
    ALL_THEME_CLASSES.forEach(c => root.classList.remove(c));
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(prefersDark ? "dark" : "light");
    setCurrentTheme("system");
    localStorage.setItem("codenova-theme", "system");
  };

  const applyTheme = (themeId: ThemeId) => {
    if (themeId === "system") { applySystemTheme(); return; }
    const root = document.documentElement;
    ALL_THEME_CLASSES.forEach(c => root.classList.remove(c));
    const theme = themes.find((t) => t.id === themeId);
    if (theme) root.classList.add(theme.class);
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
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => applyTheme("system")}
          className={currentTheme === "system" ? "bg-primary/20 font-semibold" : ""}
        >
          <Monitor className="w-3 h-3 mr-2" />
          System Default
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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
