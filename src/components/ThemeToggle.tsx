import { Palette, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

const themes = [
  // Dark themes
  { id: "dark", label: "🌙 Midnight Dark", class: "dark", group: "dark" },
  { id: "ocean", label: "🌊 Ocean Blue", class: "theme-ocean", group: "dark" },
  { id: "forest", label: "🌿 Forest Green", class: "theme-forest", group: "dark" },
  { id: "sunset", label: "🌅 Sunset Warm", class: "theme-sunset", group: "dark" },
  { id: "purple", label: "💜 Purple Haze", class: "theme-purple", group: "dark" },
  // Light themes
  { id: "light", label: "☀️ Clean Light", class: "light", group: "light" },
  { id: "rose-light", label: "🌸 Rose Light", class: "theme-rose-light", group: "light" },
  { id: "sky-light", label: "🩵 Sky Light", class: "theme-sky-light", group: "light" },
  { id: "mint-light", label: "🍃 Mint Light", class: "theme-mint-light", group: "light" },
  { id: "sand-light", label: "🏖️ Sand Light", class: "theme-sand-light", group: "light" },
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

  const darkThemes = themes.filter(t => t.group === "dark");
  const lightThemes = themes.filter(t => t.group === "light");

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
        <DropdownMenuLabel className="text-[10px] text-muted-foreground">DARK THEMES</DropdownMenuLabel>
        {darkThemes.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onClick={() => applyTheme(theme.id)}
            className={currentTheme === theme.id ? "bg-primary/20 font-semibold" : ""}
          >
            {theme.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] text-muted-foreground">LIGHT THEMES</DropdownMenuLabel>
        {lightThemes.map((theme) => (
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
