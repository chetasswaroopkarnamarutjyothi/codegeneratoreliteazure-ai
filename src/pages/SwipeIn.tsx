import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Loader2, ScanLine, LogOut } from "lucide-react";

export default function SwipeIn() {
  const [mode, setMode] = useState<"choice" | "camera" | "upload">("choice");
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => () => {
    cameraRef.current?.stop().catch(() => {});
  }, []);

  const submitSwipe = async (token: string, method: "camera" | "upload") => {
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    // Validate token belongs to this user
    const { data: card } = await supabase.from("employee_id_cards")
      .select("qr_token, employee_user_id, full_name")
      .eq("qr_token", token).maybeSingle();

    if (!card || card.employee_user_id !== session.user.id) {
      toast({ title: "Invalid ID Card", description: "This QR doesn't match your profile.", variant: "destructive" });
      setSubmitting(false); setMode("choice"); return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("office_swipes").insert({
      user_id: session.user.id, swipe_date: today, method, qr_token: token,
      device_info: navigator.userAgent.slice(0, 200),
    });
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Swipe failed", description: error.message, variant: "destructive" });
      setSubmitting(false); return;
    }
    toast({ title: "✅ Office Swipe Recorded", description: `Welcome, ${card.full_name}` });
    navigate("/");
  };

  const startCamera = async () => {
    setMode("camera"); setScanning(true);
    try {
      const html5 = new Html5Qrcode("qr-reader");
      cameraRef.current = html5;
      await html5.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 },
        (decoded) => { html5.stop(); submitSwipe(decoded, "camera"); },
        () => {});
    } catch (e: any) {
      toast({ title: "Camera unavailable", description: e.message, variant: "destructive" });
      setMode("choice"); setScanning(false);
    }
  };

  const handleUpload = async (file: File) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(r => img.onload = r);
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height);
    const code = jsQR(data.data, data.width, data.height);
    if (!code) { toast({ title: "No QR detected in image", variant: "destructive" }); return; }
    submitSwipe(code.data, "upload");
  };

  const logout = async () => {
    sessionStorage.removeItem("2fa_completed");
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="glass max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 grid place-items-center mb-2">
            <ScanLine className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Office Swipe Required</CardTitle>
          <CardDescription>Scan your StackMind ID Card QR to begin today's session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mode === "choice" && (
            <>
              <Button onClick={startCamera} className="w-full" size="lg">
                <Camera className="w-4 h-4 mr-2" /> Scan with Camera
              </Button>
              <label className="block">
                <input type="file" accept="image/*" capture="environment" hidden
                  onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <Button asChild variant="outline" className="w-full" size="lg">
                  <span><Upload className="w-4 h-4 mr-2" /> Upload Photo of ID Card</span>
                </Button>
              </label>
              <Button variant="ghost" onClick={logout} className="w-full text-muted-foreground">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </Button>
            </>
          )}
          {mode === "camera" && (
            <>
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
              {submitting && <div className="flex items-center justify-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</div>}
              <Button variant="outline" className="w-full" onClick={() => { cameraRef.current?.stop(); setMode("choice"); setScanning(false); }}>Cancel</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
