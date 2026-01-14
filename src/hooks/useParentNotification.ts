import { supabase } from "@/integrations/supabase/client";

export function useParentNotification() {
  const notifyParent = async (
    parentEmail: string,
    childName: string,
    actionType: string,
    details: string
  ) => {
    // This would call an edge function to send email
    // For now, we'll log it - in production, you'd integrate with Resend
    console.log("Parent notification:", {
      parentEmail,
      childName,
      actionType,
      details,
      timestamp: new Date().toISOString(),
    });

    // Store the notification in usage history as a record
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        await supabase.from("usage_history").insert({
          user_id: session.session.user.id,
          action_type: `parent_notified_${actionType}`,
          prompt: `Parent (${parentEmail}) notified about: ${details}`,
          result: "Notification sent",
          points_used: 0,
        });
      }
    } catch (error) {
      console.error("Failed to log parent notification:", error);
    }
  };

  return { notifyParent };
}
