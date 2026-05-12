import jsPDF from "jspdf";
import QRCode from "qrcode";

export interface IdCardData {
  full_name: string;
  employee_id: string;
  designation?: string | null;
  photo_url?: string | null;
  qr_token: string;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  blood_group?: string | null;
  is_ceo?: boolean;
  logo_url?: string | null;
}

async function imgToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((r) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function generateIdCardPdf(d: IdCardData): Promise<Blob> {
  // Credit-card landscape: 85.6 x 54mm — we use A6 portrait (105x148) for a 2-page card front+back
  const doc = new jsPDF({ unit: "mm", format: [85.6, 54] });
  const accent = d.is_ceo ? "#D4AF37" : "#0EA5E9";

  // ===== FRONT =====
  doc.setFillColor("#0F172A");
  doc.rect(0, 0, 85.6, 54, "F");
  doc.setFillColor(accent);
  doc.rect(0, 0, 85.6, 8, "F");

  if (d.logo_url) {
    const logo = await imgToDataUrl(d.logo_url);
    if (logo) try { doc.addImage(logo, "PNG", 3, 1.5, 5, 5); } catch {}
  }
  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("STACKMIND TECHNOLOGIES LIMITED", 10, 5.5);

  // Photo
  if (d.photo_url) {
    const photo = await imgToDataUrl(d.photo_url);
    if (photo) try { doc.addImage(photo, "JPEG", 4, 12, 22, 26); } catch {}
  } else {
    doc.setFillColor("#1E293B"); doc.rect(4, 12, 22, 26, "F");
    doc.setTextColor("#64748B"); doc.setFontSize(6); doc.text("PHOTO", 11, 26);
  }

  // Name + designation
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(d.full_name.slice(0, 22), 28, 16);
  doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(accent);
  doc.text(d.is_ceo ? "Chief Executive Officer" : (d.designation || "Employee"), 28, 20);

  doc.setTextColor("#94A3B8"); doc.setFontSize(6);
  doc.text("EMPLOYEE ID", 28, 26);
  doc.setTextColor("#FFFFFF"); doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text(d.employee_id, 28, 30);

  // QR
  const qrData = await QRCode.toDataURL(d.qr_token, { width: 200, margin: 0 });
  doc.addImage(qrData, "PNG", 60, 30, 22, 22);
  doc.setTextColor("#94A3B8"); doc.setFontSize(5); doc.setFont("helvetica", "normal");
  doc.text("OFFICE SWIPE", 64, 53);

  // ===== BACK =====
  doc.addPage([85.6, 54], "landscape");
  doc.setFillColor("#0F172A"); doc.rect(0, 0, 85.6, 54, "F");
  doc.setFillColor(accent); doc.rect(0, 0, 85.6, 6, "F");
  doc.setTextColor("#FFFFFF"); doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("EMERGENCY CONTACT", 4, 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  doc.text(`Name: ${d.emergency_contact_name || "—"}`, 4, 16);
  doc.text(`Phone: ${d.emergency_contact_phone || "—"}`, 4, 20);
  doc.text(`Relation: ${d.emergency_contact_relation || "—"}`, 4, 24);
  doc.text(`Blood Group: ${d.blood_group || "—"}`, 4, 28);
  doc.setTextColor("#64748B"); doc.setFontSize(5);
  doc.text("If found, return to:", 4, 38);
  doc.text("StackMind Technologies Limited, India", 4, 41);
  doc.text("This card is the property of StackMind Technologies Limited.", 4, 47);
  doc.text("Misuse will result in legal action.", 4, 50);

  return doc.output("blob");
}
