import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { IdCard, Loader2, Download, Image as ImageIcon, RefreshCw } from "lucide-react";
import { IdCardPreview } from "@/components/IdCardPreview";
import { generateIdCardPdf } from "@/lib/idCardPdf";

export function IdCardGeneratorPanel() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [form, setForm] = useState({ designation: "", emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: "", blood_group: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from("employee_id_cards").select("*").order("issued_at", { ascending: false }),
      supabase.from("id_card_assets").select("logo_url").limit(1).maybeSingle(),
    ]);
    setCards(c || []);
    setLogoUrl(a?.logo_url || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const select = (card: any) => {
    setSelected(card);
    setForm({
      designation: card.designation || "",
      emergency_contact_name: card.emergency_contact_name || "",
      emergency_contact_phone: card.emergency_contact_phone || "",
      emergency_contact_relation: card.emergency_contact_relation || "",
      blood_group: card.blood_group || "",
    });
  };

  const uploadFile = async (file: File, path: string) => {
    const { error } = await supabase.storage.from("id-cards").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("id-cards").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveLogo = async () => {
    if (!logoFile) return;
    const url = await uploadFile(logoFile, `_company/logo-${Date.now()}.png`);
    const { data: existing } = await supabase.from("id_card_assets").select("id").limit(1).maybeSingle();
    if (existing) {
      await supabase.from("id_card_assets").update({ logo_url: url, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("id_card_assets").insert({ logo_url: url });
    }
    setLogoUrl(url); setLogoFile(null);
    toast({ title: "✅ Company logo updated" });
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      let photo_url = selected.photo_url;
      if (photoFile) {
        photo_url = await uploadFile(photoFile, `${selected.employee_user_id}/photo-${Date.now()}.jpg`);
      }
      await supabase.from("employee_id_cards").update({ ...form, photo_url, updated_at: new Date().toISOString() }).eq("id", selected.id);
      toast({ title: "✅ ID card updated" });
      setPhotoFile(null);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const regenerateQr = async () => {
    if (!selected) return;
    await supabase.from("employee_id_cards").update({ qr_token: crypto.randomUUID() }).eq("id", selected.id);
    toast({ title: "QR rotated" });
    load();
  };

  const downloadPdf = async (card: any) => {
    const blob = await generateIdCardPdf({ ...card, logo_url: logoUrl });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${card.employee_id}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Company Logo</CardTitle>
          <CardDescription>Used on every ID card. Upload once.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {logoUrl ? <img src={logoUrl} alt="logo" className="w-16 h-16 object-contain border rounded" /> : <div className="w-16 h-16 grid place-items-center bg-muted rounded text-xs">No logo</div>}
          <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="flex-1" />
          <Button onClick={saveLogo} disabled={!logoFile}>Upload</Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><IdCard className="w-5 h-5 text-primary" /> Employee ID Cards ({cards.length})</CardTitle>
          <CardDescription>Generated automatically when an employee role is granted. Edit details and download PDF.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {cards.map(c => (
                  <button key={c.id} onClick={() => select(c)} className={`w-full text-left p-3 rounded-lg border transition ${selected?.id === c.id ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/50"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{c.employee_id}</p>
                      </div>
                      {c.is_ceo && <Badge className="bg-yellow-500/20 text-yellow-500 text-xs">CEO</Badge>}
                    </div>
                  </button>
                ))}
                {cards.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No employee cards yet — promote a user to employee role.</p>}
              </div>

              {selected && (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <IdCardPreview {...selected} logo_url={logoUrl} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Designation</Label><Input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} /></div>
                    <div><Label className="text-xs">Blood Group</Label>
                      <Select value={form.blood_group} onValueChange={v => setForm({ ...form, blood_group: v })}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Emergency Name</Label><Input value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} /></div>
                    <div><Label className="text-xs">Emergency Phone</Label><Input value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} /></div>
                    <div className="col-span-2"><Label className="text-xs">Relation</Label><Input value={form.emergency_contact_relation} onChange={e => setForm({ ...form, emergency_contact_relation: e.target.value })} placeholder="Spouse / Parent" /></div>
                    <div className="col-span-2"><Label className="text-xs">Photo</Label><Input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} /></div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save</Button>
                    <Button variant="outline" onClick={() => downloadPdf(selected)}><Download className="w-4 h-4 mr-2" />PDF</Button>
                    <Button variant="outline" onClick={regenerateQr}><RefreshCw className="w-4 h-4 mr-2" />Rotate QR</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
