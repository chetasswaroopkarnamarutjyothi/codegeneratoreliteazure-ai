import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Mail, 
  CheckCircle, 
  XCircle, 
  CreditCard,
  MessageSquare,
  Loader2,
  User
} from "lucide-react";

interface EmailNotification {
  id: string;
  recipient_email: string;
  recipient_user_id: string | null;
  notification_type: string;
  subject: string;
  body: string;
  metadata: any;
  sent_at: string;
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("email_notifications")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data as EmailNotification[]) || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes("credit")) {
      return <CreditCard className="w-4 h-4 text-green-500" />;
    }
    if (type.includes("ticket")) {
      return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
    return <Mail className="w-4 h-4 text-primary" />;
  };

  const getNotificationBadge = (type: string) => {
    if (type.includes("approved") || type.includes("resolved")) {
      return <Badge className="bg-green-500/20 text-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    }
    if (type.includes("denied") || type.includes("declined")) {
      return <Badge className="bg-red-500/20 text-red-500"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>;
    }
    if (type.includes("new")) {
      return <Badge className="bg-yellow-500/20 text-yellow-500"><Bell className="w-3 h-3 mr-1" />New</Badge>;
    }
    return <Badge variant="secondary">{type}</Badge>;
  };

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Email Notifications Log
        </CardTitle>
        <CardDescription>
          All email notifications that would be sent (upgrade to real emails with Resend API)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getNotificationIcon(notification.notification_type)}
                    <span className="font-medium">{notification.subject}</span>
                  </div>
                  {getNotificationBadge(notification.notification_type)}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <User className="w-3 h-3" />
                  <span>To: {notification.recipient_email}</span>
                </div>
                
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {notification.body.substring(0, 200)}
                  {notification.body.length > 200 && "..."}
                </p>
                
                <div className="mt-2 text-xs text-muted-foreground">
                  {new Date(notification.sent_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
