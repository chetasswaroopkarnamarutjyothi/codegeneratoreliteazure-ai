import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Loader2, ScanLine, LogOut, KeyRound } from "lucide-react";

const EMP_ID_RE = /^SM\d{6}$/;

export default function SwipeIn() {
  const [submitting, setSubmitting] = useState(false);
  const [empId, setEmpId] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => () => { cameraRef.current?.stop().catch(() => {}); }, []);

  const recordSwipe = async (
    userId: string,
    fullName: string,
    method: "camera" | "upload" | "manual",
    qrToken?: string,
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("office_swipes").insert({
      user_id: userId, swipe_date: today, method, qr_token: qrToken ?? null,
      device_info: navigator.userAgent.slice(0, 200),
    });
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Swipe failed", description: error.message, variant: "destructive" });
      setSubmitting(false); return;
    }
    toast({ title: "✅ Office Swipe Recorded", description: `Welcome, ${fullName}` });
    navigate("/");
  };

  const submitByQr = async (token: string, method: "camera" | "upload") => {
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    const { data: card } = await supabase.from("employee_id_cards")
      .select("qr_token, employee_user_id, full_name").eq("qr_token", token).maybeSingle();
    if (!card || card.employee_user_id !== session.user.id) {
      toast({ title: "Invalid ID Card", description: "This QR doesn't match your profile.", variant: "destructive" });
      setSubmitting(false); return;
    }
    await recordSwipe(session.user.id, card.full_name || "Employee", method, token);
  };

  const submitByEmpId = async () => {
    const id = empId.trim().toUpperCase();
    if (!EMP_ID_RE.test(id)) {
      toast({ title: "Invalid format", description: "Use SM followed by 6 digits (e.g. SM472183)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    const { data: card } = await supabase.from("employee_id_cards")
      .select("employee_user_id, full_name, employee_id").eq("employee_id", id).maybeSingle();
    if (!card || card.employee_user_id !== session.user.id) {
      toast({ title: "Employee ID mismatch", description: "This ID isn't assigned to your account.", variant: "destructive" });
      setSubmitting(false); return;
    }
    await recordSwipe(session.user.id, card.full_name || "Employee", "manual");
  };

  const startCamera = async () => {
    setCameraOpen(true);
    try {
      const html5 = new Html5Qrcode("qr-reader");
      cameraRef.current = html5;
      await html5.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 },
        (decoded) => { html5.stop(); submitByQr(decoded, "camera"); }, () => {});
    } catch (e: any) {
      toast({ title: "Camera unavailable", description: e.message, variant: "destructive" });
      setCameraOpen(false);
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
    submitByQr(code.data, "upload");
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
          <CardDescription>
            Daily attendance check-in for your office visit. Scan your ID card QR, upload a photo, or enter your Employee ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="empid">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="empid"><KeyRound className="w-4 h-4 mr-1" />ID</TabsTrigger>
              <TabsTrigger value="camera"><Camera className="w-4 h-4 mr-1" />Scan</TabsTrigger>
              <TabsTrigger value="upload"><Upload className="w-4 h-4 mr-1" />Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="empid" className="space-y-3 mt-4">
              <Label className="text-xs">Employee ID (format: SM + 6 digits)</Label>
              <Input
                value={empId} onChange={e => setEmpId(e.target.value.toUpperCase())}
                placeholder="SM472183" maxLength={8} className="font-mono tracking-wider text-center text-lg"
              />
              <Button onClick={submitByEmpId} disabled={submitting} className="w-full" size="lg">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Swipe In
              </Button>
            </TabsContent>

            <TabsContent value="camera" className="space-y-3 mt-4">
              {!cameraOpen ? (
                <Button onClick={startCamera} className="w-full" size="lg">
                  <Camera className="w-4 h-4 mr-2" /> Start Camera
                </Button>
              ) : (
                <>
                  <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
                  {submitting && <div className="flex items-center justify-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</div>}
                  <Button variant="outline" className="w-full" onClick={() => { cameraRef.current?.stop(); setCameraOpen(false); }}>Cancel</Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <label className="block">
                <input type="file" accept="image/*" capture="environment" hidden
                  onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <Button asChild variant="outline" className="w-full" size="lg">
                  <span><Upload className="w-4 h-4 mr-2" /> Upload Photo of ID Card</span>
                </Button>
              </label>
            </TabsContent>
          </Tabs>

          <Button variant="ghost" onClick={logout} className="w-full text-muted-foreground mt-4">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
