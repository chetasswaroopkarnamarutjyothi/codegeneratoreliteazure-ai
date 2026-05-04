import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Apple, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLATFORMS = [
  { id: "android", label: "Android APK", sub: ".apk · Phones & Tablets", icon: Smartphone, ext: "apk" },
  { id: "windows", label: "Windows Desktop", sub: ".exe installer", icon: Monitor, ext: "exe" },
  { id: "macos", label: "macOS App", sub: ".dmg universal", icon: Apple, ext: "dmg" },
  { id: "linux", label: "Linux", sub: ".AppImage", icon: Monitor, ext: "AppImage" },
];

export function AppDownloadSection() {
  const { toast } = useToast();

  const handleDownload = (platform: typeof PLATFORMS[number]) => {
    // Placeholder: replace href with real release URLs when builds are published.
    toast({
      title: `${platform.label} build coming soon`,
      description: "Native builds are being prepared. You can install the web app to your home screen now.",
    });
  };

  const installPWA = () => {
    if ("serviceWorker" in navigator) {
      toast({ title: "Install via your browser menu", description: "On phone: Share → Add to Home Screen. On desktop: address bar → Install." });
    }
  };

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Get CodeNova AI Everywhere
        </h2>
        <p className="text-muted-foreground">Download for any device — mobile, desktop, or install as a web app.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLATFORMS.map(p => {
          const Icon = p.icon;
          return (
            <Card key={p.id} className="glass hover:border-primary/40 transition-all group">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.sub}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleDownload(p)}>
                  <Download className="w-3 h-3 mr-2" /> Download .{p.ext}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="text-center mt-6">
        <Button variant="ghost" size="sm" onClick={installPWA}>
          Or install as a Web App (PWA) — works on any device
        </Button>
      </div>
    </section>
  );
}
