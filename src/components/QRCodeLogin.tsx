import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, QrCode, RefreshCw, Smartphone, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface QRCodeLoginProps {
  onAuthenticated: () => void;
}

export default function QRCodeLogin({ onAuthenticated }: QRCodeLoginProps) {
  const [token, setToken] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"pending" | "scanned" | "authenticated" | "expired">("pending");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);

  const generateToken = async () => {
    setLoading(true);
    setStatus("pending");
    
    try {
      // Generate a unique token
      const newToken = `SM-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      const { data, error } = await supabase
        .from("qr_login_tokens")
        .insert({
          token: newToken,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setToken(newToken);
      setTokenId(data.id);
      setExpiresAt(new Date(data.expires_at));
      setTimeLeft(300);
    } catch (error: any) {
      toast.error("Failed to generate QR code");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateToken();
  }, []);

  // Subscribe to token status changes
  useEffect(() => {
    if (!tokenId) return;

    const channel = supabase
      .channel(`qr-token-${tokenId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "qr_login_tokens",
          filter: `id=eq.${tokenId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as typeof status;
          setStatus(newStatus);
          
          if (newStatus === "authenticated") {
            toast.success("Login successful!");
            onAuthenticated();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokenId, onAuthenticated]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt || status === "authenticated") return;

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setStatus("expired");
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const qrUrl = token ? `${window.location.origin}/auth/qr?token=${token}` : "";

  return (
    <Card className="glass w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto p-3 rounded-full bg-primary/20 w-fit mb-4">
          <QrCode className="w-8 h-8 text-primary" />
        </div>
        <CardTitle>QR Code Login</CardTitle>
        <CardDescription>
          Scan the QR code with your phone to log in instantly
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {loading ? (
          <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : status === "expired" ? (
          <div className="w-48 h-48 flex flex-col items-center justify-center bg-muted/50 rounded-lg">
            <p className="text-muted-foreground mb-4">QR Code expired</p>
            <Button onClick={generateToken} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate New
            </Button>
          </div>
        ) : status === "authenticated" ? (
          <div className="w-48 h-48 flex flex-col items-center justify-center bg-green-500/10 rounded-lg">
            <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
            <p className="text-green-500 font-medium">Authenticated!</p>
          </div>
        ) : (
          <div className="relative">
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG
                value={qrUrl}
                size={180}
                level="H"
                includeMargin
                imageSettings={{
                  src: "/favicon.ico",
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>
            {status === "scanned" && (
              <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center">
                <div className="bg-background px-4 py-2 rounded-full flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Confirming...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {status === "pending" && !loading && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Expires in <span className="font-mono font-bold text-primary">{formatTime(timeLeft)}</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Smartphone className="w-4 h-4" />
              <span>Open camera app and scan</span>
            </div>
          </div>
        )}

        <Button
          onClick={generateToken}
          variant="ghost"
          size="sm"
          className="mt-4"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh QR Code
        </Button>
      </CardContent>
    </Card>
  );
}
