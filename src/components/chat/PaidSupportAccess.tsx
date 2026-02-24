import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield, Clock, IndianRupee, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface PaidSupportAccessProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onAccessGranted: () => void;
}

export function PaidSupportAccess({ open, onClose, userId, onAccessGranted }: PaidSupportAccessProps) {
  const [processing, setProcessing] = useState(false);
  const [existingAccess, setExistingAccess] = useState<any>(null);

  const checkExistingAccess = async () => {
    const { data } = await supabase
      .from("support_chat_access")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setExistingAccess(data);
  };

  useState(() => { checkExistingAccess(); });

  const handlePurchaseAccess = async (accessType: "initial" | "extension") => {
    setProcessing(true);
    try {
      const amount = accessType === "initial" ? 4500 : 2250;
      
      // Record the payment
      const { error: payErr } = await supabase.from("payments").insert({
        user_id: userId,
        amount,
        plan_type: `support_${accessType}`,
        currency: "INR",
        status: "completed",
      });
      if (payErr) throw payErr;

      // Create support chat access
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: accessErr } = await supabase.from("support_chat_access").insert({
        user_id: userId,
        access_type: accessType,
        amount_paid: amount,
        expires_at: expiresAt.toISOString(),
        priority_level: 3,
      });
      if (accessErr) throw accessErr;

      // Create a support channel for this user
      const { data: channel, error: chErr } = await supabase.from("chat_channels").insert({
        name: `support-${Date.now().toString(36)}`,
        description: "Priority Support Channel",
        channel_type: "support",
        created_by: userId,
      }).select().single();

      if (!chErr && channel) {
        await supabase.from("chat_channel_members").insert({
          channel_id: channel.id,
          user_id: userId,
          role: "member",
        });
      }

      toast.success(`Support access granted for 7 days! (₹${amount.toLocaleString()})`);
      onAccessGranted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to process payment");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Priority Support Access
          </DialogTitle>
          <DialogDescription>
            Get direct chat access to our support team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {existingAccess ? (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-green-500">✓ You have active support access</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expires: {new Date(existingAccess.expires_at).toLocaleDateString()}
                </p>
                {!existingAccess.issue_resolved && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">Issue not resolved? Extend your access:</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePurchaseAccess("extension")}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <IndianRupee className="w-3 h-3 mr-1" />}
                      Extend — ₹2,250
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Priority 1 critical issues: Free extension
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-primary/30">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">7-Day Support Access</p>
                      <p className="text-sm text-muted-foreground">Chat directly with our support team</p>
                    </div>
                    <Badge className="text-lg px-3 py-1">₹4,500</Badge>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><Clock className="w-3 h-3" /> 7-day access window</li>
                    <li className="flex items-center gap-2"><Shield className="w-3 h-3" /> Direct employee chat support</li>
                    <li className="flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> Priority escalation available</li>
                  </ul>
                  <Button
                    className="w-full"
                    onClick={() => handlePurchaseAccess("initial")}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <IndianRupee className="w-4 h-4 mr-1" />}
                    Pay ₹4,500 & Get Access
                  </Button>
                </CardContent>
              </Card>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• If issue is not resolved in 7 days, extend for ₹2,250</p>
                <p>• If issue is marked Priority 1 (Critical) by our team, extension is free</p>
                <p>• Visit our branch to complete payment. Contact support for details.</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
