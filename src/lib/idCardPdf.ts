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

/** Beautiful 2-sided credit-card-format ID PDF (front + back). */
export async function generateIdCardPdf(d: IdCardData): Promise<Blob> {
  const W = 85.6, H = 54; // credit card landscape
  const doc = new jsPDF({ unit: "mm", format: [W, H], orientation: "landscape" });

  const ceo = !!d.is_ceo;
  const accent: [number, number, number] = ceo ? [212, 175, 55] : [14, 165, 233];
  const accentDark: [number, number, number] = ceo ? [161, 124, 27] : [29, 78, 216];

  // ===== FRONT =====
  // Background base
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, H, "F");
  // Diagonal accent block
  doc.setFillColor(...accent);
  doc.triangle(W, 0, W, H * 0.55, W - 30, 0, "F");
  doc.setFillColor(...accentDark);
  doc.triangle(0, H, 32, H, 0, H - 14, "F");
  // Top header
  doc.setFillColor(...accent); doc.rect(0, 0, W, 9, "F");

  if (d.logo_url) {
    const logo = await imgToDataUrl(d.logo_url);
    if (logo) try { doc.addImage(logo, "PNG", 2.5, 1.5, 6, 6); } catch {}
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("STACKMIND", 10, 5);
  doc.setFontSize(5); doc.setFont("helvetica", "normal");
  doc.text("TECHNOLOGIES LIMITED", 10, 7.5);
  if (ceo) {
    doc.setFontSize(6); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text("★ EXECUTIVE", W - 22, 5.5);
  }

  // Photo with accent border
  doc.setFillColor(...accent); doc.roundedRect(3.5, 12, 24, 30, 1, 1, "F");
  doc.setFillColor(30, 41, 59); doc.roundedRect(4.2, 12.7, 22.6, 28.6, 0.8, 0.8, "F");
  if (d.photo_url) {
    const photo = await imgToDataUrl(d.photo_url);
    if (photo) try { doc.addImage(photo, "JPEG", 4.5, 13, 22, 28); } catch {}
  } else {
    doc.setTextColor(100, 116, 139); doc.setFontSize(6); doc.setFont("helvetica", "bold");
    doc.text("PHOTO", 12, 27);
  }

  // Name + designation
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(d.full_name.slice(0, 24), 30, 16);
  doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.setTextColor(...accent);
  doc.text((ceo ? "CHIEF EXECUTIVE OFFICER" : (d.designation || "EMPLOYEE")).toUpperCase(), 30, 20);

  // ID block
  doc.setTextColor(148, 163, 184); doc.setFontSize(5); doc.setFont("helvetica", "normal");
  doc.text("EMPLOYEE ID", 30, 26);
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont("courier", "bold");
  doc.text(d.employee_id, 30, 31);

  if (d.blood_group) {
    doc.setTextColor(148, 163, 184); doc.setFontSize(5); doc.setFont("helvetica", "normal");
    doc.text("BLOOD", 30, 36);
    doc.setTextColor(239, 68, 68); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text(d.blood_group, 30, 40);
  }

  // QR with white panel
  const qrData = await QRCode.toDataURL(d.qr_token, { width: 240, margin: 0, color: { dark: "#0F172A", light: "#FFFFFF" } });
  doc.setFillColor(255, 255, 255); doc.roundedRect(60, 26, 22, 22, 1, 1, "F");
  doc.addImage(qrData, "PNG", 60.6, 26.6, 20.8, 20.8);
  doc.setTextColor(148, 163, 184); doc.setFontSize(4); doc.setFont("helvetica", "normal");
  doc.text("OFFICE VISIT", 65, 51);
  doc.text("SWIPE-IN", 67, 53);

  // ===== BACK =====
  doc.addPage([W, H], "landscape");
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...accent); doc.rect(0, 0, W, 7, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("EMERGENCY CONTACT", 4, 5);

  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("NAME", 4, 13); doc.text("PHONE", 4, 20); doc.text("RELATION", 4, 27); doc.text("BLOOD GROUP", 4, 34);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
  doc.text(d.emergency_contact_name || "—", 30, 13);
  doc.text(d.emergency_contact_phone || "—", 30, 20);
  doc.text(d.emergency_contact_relation || "—", 30, 27);
  doc.text(d.blood_group || "—", 30, 34);

  // Property notice
  doc.setFillColor(...accentDark);
  doc.rect(0, 42, W, 12, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(5); doc.setFont("helvetica", "bold");
  doc.text("PROPERTY OF STACKMIND TECHNOLOGIES LIMITED", 4, 46);
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.5);
  doc.text("If found, return to: StackMind Technologies Limited, India", 4, 49);
  doc.text("Misuse will result in legal action under applicable laws.", 4, 51.5);

  return doc.output("blob");
}
