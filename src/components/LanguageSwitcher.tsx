import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "hi", name: "हिन्दी", label: "Hindi" },
  { code: "es", name: "Español", label: "Spanish" },
  { code: "fr", name: "Français", label: "French" },
  { code: "de", name: "Deutsch", label: "German" },
  { code: "zh", name: "中文", label: "Chinese" },
  { code: "ja", name: "日本語", label: "Japanese" },
  { code: "ko", name: "한국어", label: "Korean" },
  { code: "pt", name: "Português", label: "Portuguese" },
  { code: "ar", name: "العربية", label: "Arabic" },
  { code: "ru", name: "Русский", label: "Russian" },
];

interface LanguageSwitcherProps {
  userId?: string;
}

export function LanguageSwitcher({ userId }: LanguageSwitcherProps) {
  const [currentLang, setCurrentLang] = useState<string | null>(null);
  const [hasSet, setHasSet] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const checkLang = async () => {
      const { data } = await supabase
        .from("user_language_preference")
        .select("language_code")
        .eq("user_id", userId)
        .maybeSingle();

      if (data && data.language_code !== "en") {
        setCurrentLang(data.language_code);
        setHasSet(true);
      }
    };
    checkLang();
  }, [userId]);

  const selectLanguage = async (code: string) => {
    if (!userId) return;
    if (hasSet) {
      toast.error("Language can only be changed once.");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_language_preference")
        .upsert({ user_id: userId, language_code: code });

      if (error) throw error;

      setCurrentLang(code);
      setHasSet(true);
      toast.success("Language set! Redirecting...");
      
      // Redirect to language-specific URL
      setTimeout(() => {
        window.location.href = `https://codegeneratorelitestackmindlimited-ai.lovable.app/${code}`;
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Failed to set language");
    }
  };

  const currentLabel = LANGUAGES.find(l => l.code === currentLang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Globe className="w-4 h-4 mr-1" />
          {currentLabel ? currentLabel.label : "Language"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => selectLanguage(lang.code)}
            disabled={hasSet}
            className="flex justify-between"
          >
            <span>{lang.name}</span>
            <span className="text-xs text-muted-foreground">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
