import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { IdCard, Loader2, Copy, Check } from "lucide-react";

export function EmployeeIdGenerator() {
  const [count, setCount] = useState("10");
  const [generating, setGenerating] = useState(false);
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [allIds, setAllIds] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const MAX_DAILY = 200;

  useEffect(() => {
    fetchTodayCount();
    fetchAllIds();
  }, []);

  const fetchTodayCount = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("employee_ids")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00Z`);
    setTodayCount(count || 0);
  };

  const fetchAllIds = async () => {
    const { data } = await supabase
      .from("employee_ids")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setAllIds(data || []);
  };

  const generateIds = async () => {
    const num = parseInt(count);
    if (isNaN(num) || num < 1 || num > 200) {
      toast({ title: "Invalid count", description: "Enter a number between 1 and 200", variant: "destructive" });
      return;
    }

    if (todayCount + num > MAX_DAILY) {
      toast({
        title: "Daily limit reached",
        description: `You can only generate ${MAX_DAILY - todayCount} more IDs today (limit: ${MAX_DAILY}/day)`,
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get the latest employee ID number
      const { data: lastId } = await supabase
        .from("employee_ids")
        .select("employee_id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let startNum = 1;
      if (lastId?.employee_id) {
        const match = lastId.employee_id.match(/SM-EMP-(\d+)/);
        if (match) startNum = parseInt(match[1]) + 1;
      }

      const newIds: string[] = [];
      const rows = [];
      for (let i = 0; i < num; i++) {
        const empId = `SM-EMP-${String(startNum + i).padStart(4, "0")}`;
        newIds.push(empId);
        rows.push({
          employee_id: empId,
          generated_by: session.user.id,
        });
      }

      const { error } = await supabase.from("employee_ids").insert(rows);
      if (error) throw error;

      setGeneratedIds(newIds);
      toast({ title: "Success!", description: `Generated ${num} employee IDs` });
      fetchTodayCount();
      fetchAllIds();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="w-5 h-5 text-primary" />
            Generate Employee IDs
          </CardTitle>
          <CardDescription>
            Generate up to 200 employee IDs per day. These IDs are required for LDAP authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Badge variant="outline">Today: {todayCount}/{MAX_DAILY}</Badge>
            <span className="text-sm text-muted-foreground">
              {MAX_DAILY - todayCount} remaining
            </span>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label>Number of IDs to generate</Label>
              <Input
                type="number"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                min={1}
                max={MAX_DAILY - todayCount}
                placeholder="10"
              />
            </div>
            <Button onClick={generateIds} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <IdCard className="w-4 h-4 mr-2" />}
              Generate
            </Button>
          </div>

          {generatedIds.length > 0 && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm font-medium text-green-500 mb-2">Newly Generated IDs:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {generatedIds.map((id) => (
                  <div key={id} className="flex items-center gap-1 font-mono text-xs bg-background/50 rounded px-2 py-1">
                    <span>{id}</span>
                    <button onClick={() => copyId(id)} className="ml-auto">
                      {copiedId === id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>All Employee IDs ({allIds.length})</CardTitle>
          <CardDescription>Recently generated employee IDs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allIds.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                <span className="font-mono font-medium">{item.employee_id}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={item.is_used ? "secondary" : "outline"} className="text-xs">
                    {item.is_used ? "Used" : "Available"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {allIds.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No employee IDs generated yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
