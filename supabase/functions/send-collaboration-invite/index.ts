import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  invitedUserEmail: string;
  invitedByEmail: string;
  invitedByName: string;
  projectName: string;
  projectId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invitedUserEmail, invitedByEmail, invitedByName, projectName, projectId }: InviteRequest = await req.json();

    console.log("Sending collaboration invite email:", {
      to: invitedUserEmail,
      from: invitedByName,
      project: projectName,
    });

    // Validate inputs
    if (!invitedUserEmail || !projectName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the notification to usage_history for tracking
    // First get the user_id of the invited user
    const { data: invitedProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", invitedUserEmail.toLowerCase())
      .single();

    if (invitedProfile) {
      await supabase.from("usage_history").insert({
        user_id: invitedProfile.user_id,
        action_type: "collaboration_invite_received",
        prompt: `Invited to collaborate on project: ${projectName}`,
        result: `Invited by: ${invitedByName} (${invitedByEmail})`,
        points_used: 0,
      });
    }

    // In production, you would integrate with an email service like Resend, SendGrid, etc.
    // For now, we'll simulate the email sending and log the details
    
    const emailContent = {
      to: invitedUserEmail,
      subject: `You've been invited to collaborate on "${projectName}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Collaboration Invitation</h2>
          <p>Hi there!</p>
          <p><strong>${invitedByName}</strong> (${invitedByEmail}) has invited you to collaborate on the project <strong>"${projectName}"</strong> in Leo AI Code Generator.</p>
          <p>Log in to your account to view and work on this project together!</p>
          <a href="https://codegeneratoreliteazure-ai.lovable.app/projects" 
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            View Project
          </a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            - Leo AI Technologies Team
          </p>
        </div>
      `,
    };

    console.log("Email would be sent:", emailContent);

    // Return success - in production this would actually send the email
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation notification logged successfully",
        emailContent: {
          to: invitedUserEmail,
          subject: emailContent.subject,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send invitation";
    console.error("Error sending collaboration invite:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
