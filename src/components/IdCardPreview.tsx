import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/card";

interface Props {
  full_name: string;
  employee_id: string;
  designation?: string | null;
  photo_url?: string | null;
  qr_token: string;
  is_ceo?: boolean;
  logo_url?: string | null;
}

export function IdCardPreview(p: Props) {
  const [qr, setQr] = useState("");
  useEffect(() => { QRCode.toDataURL(p.qr_token, { width: 240, margin: 0 }).then(setQr); }, [p.qr_token]);

  const accent = p.is_ceo ? "from-yellow-500 to-amber-400" : "from-primary to-accent";

  return (
    <Card className="relative w-[340px] h-[214px] overflow-hidden bg-slate-900 text-white shadow-2xl">
      <div className={`absolute top-0 left-0 right-0 h-7 bg-gradient-to-r ${accent} flex items-center px-3`}>
        {p.logo_url && <img src={p.logo_url} alt="" className="w-5 h-5 rounded-sm mr-2 object-contain" />}
        <span className="text-[10px] font-bold tracking-wider">STACKMIND TECHNOLOGIES LIMITED</span>
      </div>
      <div className="absolute top-10 left-3 w-20 h-24 bg-slate-800 rounded overflow-hidden border border-slate-700">
        {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[10px] text-slate-500">PHOTO</div>}
      </div>
      <div className="absolute top-11 left-28 right-3">
        <p className="text-sm font-bold leading-tight truncate">{p.full_name}</p>
        <p className={`text-[10px] mt-0.5 ${p.is_ceo ? "text-yellow-400" : "text-cyan-400"}`}>{p.is_ceo ? "Chief Executive Officer" : (p.designation || "Employee")}</p>
        <p className="text-[9px] text-slate-400 mt-2">EMPLOYEE ID</p>
        <p className="text-xs font-bold tracking-wider">{p.employee_id}</p>
      </div>
      <div className="absolute bottom-2 right-3">
        {qr && <img src={qr} alt="QR" className="w-16 h-16 bg-white p-0.5 rounded" />}
        <p className="text-[7px] text-slate-400 text-center mt-0.5">OFFICE SWIPE</p>
      </div>
    </Card>
  );
}
