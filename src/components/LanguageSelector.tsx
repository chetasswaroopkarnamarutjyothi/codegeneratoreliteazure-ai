import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LANGUAGES = [
  { value: "typescript", label: "TypeScript", icon: "TS" },
  { value: "javascript", label: "JavaScript", icon: "JS" },
  { value: "python", label: "Python", icon: "PY" },
  { value: "rust", label: "Rust", icon: "RS" },
  { value: "go", label: "Go", icon: "GO" },
  { value: "java", label: "Java", icon: "JV" },
  { value: "csharp", label: "C#", icon: "C#" },
  { value: "cpp", label: "C++", icon: "C+" },
  { value: "php", label: "PHP", icon: "PH" },
  { value: "ruby", label: "Ruby", icon: "RB" },
  { value: "swift", label: "Swift", icon: "SW" },
  { value: "kotlin", label: "Kotlin", icon: "KT" },
  { value: "sql", label: "SQL", icon: "SQ" },
  { value: "html", label: "HTML", icon: "HT" },
  { value: "css", label: "CSS", icon: "CS" },
];

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const selectedLang = LANGUAGES.find((l) => l.value === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px] bg-muted/50 border-border">
        <SelectValue>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-xs font-mono font-bold">
              {selectedLang?.icon}
            </span>
            <span>{selectedLang?.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        {LANGUAGES.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-xs font-mono font-bold">
                {lang.icon}
              </span>
              <span>{lang.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
