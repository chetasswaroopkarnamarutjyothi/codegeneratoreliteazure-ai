import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Apple, Download, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLATFORMS = [
  { id: "android", label: "Android APK", sub: ".apk · Phones & Tablets", icon: Smartphone, ext: "apk" },
  { id: "windows", label: "Windows Desktop", sub: ".exe installer", icon: Monitor, ext: "exe" },
  { id: "macos", label: "macOS App", sub: ".dmg universal", icon: Apple, ext: "dmg" },
  { id: "linux", label: "Linux", sub: ".AppImage", icon: Monitor, ext: "AppImage" },
];

export function AppDownloadSection() {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const installedHandler = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      toast({ title: "✅ StackStackCodeNova AI installed", description: "Launch it from your home screen or app drawer." });
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [toast]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast({ title: "Installing StackStackCodeNova AI…" });
      }
      setDeferredPrompt(null);
    } else {
      toast({
        title: "Install via your browser menu",
        description: "iPhone: Share → Add to Home Screen. Android/Desktop: browser menu → Install app.",
      });
    }
  };

  const handleDownload = (platform: typeof PLATFORMS[number]) => {
    toast({
      title: `${platform.label} build coming soon`,
      description: "Use the Real-Time Install button to add StackStackCodeNova AI to any device right now.",
    });
  };

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Get StackStackCodeNova AI Everywhere
        </h2>
        <p className="text-muted-foreground">Real-time install on any device — mobile, desktop, or tablet. No app store needed.</p>
      </div>

      <Card className="glass mb-6 border-primary/40">
        <CardContent className="p-6 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            {installed ? <CheckCircle2 className="w-7 h-7" /> : <Download className="w-7 h-7" />}
          </div>
          <h3 className="text-xl font-semibold">{installed ? "StackStackCodeNova AI is installed" : "Install StackStackCodeNova AI now"}</h3>
          <p className="text-sm text-muted-foreground">
            {installed
              ? "Launch from your home screen — works offline and feels native."
              : "One-tap real-time install on any device. iOS, Android, Windows, macOS, Linux & ChromeOS."}
          </p>
          {!installed && (
            <Button size="lg" onClick={handleInstall} className="bg-gradient-to-r from-primary to-accent">
              <Download className="w-4 h-4 mr-2" />
              {deferredPrompt ? "Install StackStackCodeNova AI" : "Show install instructions"}
            </Button>
          )}
        </CardContent>
      </Card>

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
    </section>
  );
}
