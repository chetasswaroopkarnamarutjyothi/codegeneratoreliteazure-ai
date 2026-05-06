import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Monitor, Apple, Download, CheckCircle2, Sparkles, Zap, Shield, Rocket, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PLATFORMS = [
  { id: "android", label: "Android APK", sub: ".apk · Phones & Tablets", icon: Smartphone, ext: "apk" },
  { id: "windows", label: "Windows Desktop", sub: ".exe installer", icon: Monitor, ext: "exe" },
  { id: "macos", label: "macOS App", sub: ".dmg universal", icon: Apple, ext: "dmg" },
  { id: "linux", label: "Linux", sub: ".AppImage", icon: Monitor, ext: "AppImage" },
];

const INSTALL_COST = 200;

export function AppDownloadSection() {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    const installedHandler = () => { setInstalled(true); setDeferredPrompt(null); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("app_install_events").select("id").eq("user_id", user.id).limit(1);
      if (data && data.length) setInstalled(true);
    })();
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const recordInstall = async (platform: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to install StackCodeNova AI.", variant: "destructive" });
      return false;
    }
    const { error } = await supabase.from("app_install_events").insert({
      user_id: user.id, platform, device_info: navigator.userAgent,
    });
    if (error) {
      toast({ title: "Install blocked", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleInstall = async () => {
    if (installed) return;
    setInstalling(true);
    try {
      const ok = await recordInstall(deferredPrompt ? "pwa" : "manual");
      if (!ok) return;
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          toast({ title: "🚀 Installing StackCodeNova AI…", description: `${INSTALL_COST} credits deducted.` });
        }
        setDeferredPrompt(null);
      } else {
        toast({
          title: `✅ Install unlocked — ${INSTALL_COST} credits deducted`,
          description: "iPhone: Share → Add to Home Screen. Android/Desktop: browser menu → Install app.",
        });
      }
      setInstalled(true);
    } finally {
      setInstalling(false);
    }
  };

  const handleDownload = async (platform: typeof PLATFORMS[number]) => {
    if (installed) {
      toast({ title: `${platform.label} build`, description: "Already unlocked — your install is active." });
      return;
    }
    const ok = await recordInstall(platform.id);
    if (!ok) return;
    setInstalled(true);
    toast({
      title: `🎉 ${platform.label} unlocked!`,
      description: `${INSTALL_COST} credits deducted. Build link will be emailed when ready.`,
    });
  };

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <Badge className="mb-3 bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 px-4 py-1">
          <Sparkles className="w-3 h-3 mr-1" /> More powerful than Copilot & ChatGPT
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Get StackCodeNova AI Everywhere
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          One-tap real-time install on any device. Faster than Copilot, smarter than ChatGPT — built for builders.
        </p>
      </div>

      <Card className="glass mb-8 border-primary/40 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
        <CardContent className="p-8 text-center space-y-4 relative">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/40">
            {installed ? <CheckCircle2 className="w-10 h-10" /> : <Rocket className="w-10 h-10" />}
          </div>
          <div>
            <h3 className="text-2xl font-bold">
              {installed ? "StackCodeNova AI is installed" : "Install StackCodeNova AI now"}
            </h3>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="border-primary/40">
                <Zap className="w-3 h-3 mr-1 text-primary" /> {INSTALL_COST} credits
              </Badge>
              <Badge variant="outline" className="border-accent/40">
                <Shield className="w-3 h-3 mr-1 text-accent" /> Offline-ready
              </Badge>
              <Badge variant="outline">
                <Star className="w-3 h-3 mr-1 text-yellow-500" /> Beats GPT/Copilot
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {installed
              ? "Launch from your home screen — feels native, works offline, syncs in real time."
              : `One-time ${INSTALL_COST} credits unlocks a native-like app on iOS, Android, Windows, macOS, Linux & ChromeOS.`}
          </p>
          {!installed && (
            <Button size="lg" onClick={handleInstall} disabled={installing}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-xl shadow-primary/30 text-lg px-8 py-6">
              <Download className="w-5 h-5 mr-2" />
              {installing ? "Installing…" : `Install for ${INSTALL_COST} credits`}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLATFORMS.map(p => {
          const Icon = p.icon;
          return (
            <Card key={p.id} className="glass hover:border-primary/40 transition-all group hover:scale-105">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.sub}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleDownload(p)}>
                  <Download className="w-3 h-3 mr-2" /> {installed ? "Re-download" : `Get .${p.ext}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
