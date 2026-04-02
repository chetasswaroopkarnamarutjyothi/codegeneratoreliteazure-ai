import { Palette, Monitor, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

type ThemeId = "dark" | "light" | "system";

export function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("codenova-theme") as ThemeId | null;
    if (stored === "system") {
      applySystemTheme();
    } else if (stored === "light" || stored === "dark") {
      applyTheme(stored);
    }
  }, []);

  const applySystemTheme = () => {
    const root = document.documentElement;
    root.classList.remove("dark", "light", "theme-hybrid");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(prefersDark ? "dark" : "light");
    setCurrentTheme("system");
    localStorage.setItem("codenova-theme", "system");
  };

  const applyTheme = (themeId: ThemeId) => {
    if (themeId === "system") { applySystemTheme(); return; }
    const root = document.documentElement;
    root.classList.remove("dark", "light", "theme-hybrid");
    root.classList.add(themeId);
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
        <DropdownMenuItem
          onClick={() => applyTheme("light")}
          className={currentTheme === "light" ? "bg-primary/20 font-semibold" : ""}
        >
          <Sun className="w-3 h-3 mr-2" />
          ☀️ Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => applyTheme("dark")}
          className={currentTheme === "dark" ? "bg-primary/20 font-semibold" : ""}
        >
          <Moon className="w-3 h-3 mr-2" />
          🌙 Dark
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
