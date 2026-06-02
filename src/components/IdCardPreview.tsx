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
  blood_group?: string | null;
}

/** Premium ID card — glassmorphic with diagonal gradient and embossed accent strip. */
export function IdCardPreview(p: Props) {
  const [qr, setQr] = useState("");
  useEffect(() => { QRCode.toDataURL(p.qr_token, { width: 240, margin: 0, color: { dark: "#0F172A", light: "#FFFFFF" } }).then(setQr); }, [p.qr_token]);

  const ceo = !!p.is_ceo;
  const gradient = ceo
    ? "from-amber-500 via-yellow-400 to-amber-600"
    : "from-cyan-500 via-blue-600 to-indigo-700";
  const accent = ceo ? "text-amber-300" : "text-cyan-300";
  const ring = ceo ? "ring-amber-400/60" : "ring-cyan-400/60";

  return (
    <Card className={`relative w-[360px] h-[228px] overflow-hidden bg-slate-950 text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] ring-2 ${ring}`}>
      {/* Diagonal gradient banner */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`} />
      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${gradient} blur-2xl opacity-50`} />

      {/* Top header strip */}
      <div className={`absolute top-0 left-0 right-0 h-9 bg-gradient-to-r ${gradient} flex items-center px-3 shadow-lg`}>
        {p.logo_url && <img src={p.logo_url} alt="" className="w-6 h-6 rounded bg-white/90 p-0.5 mr-2 object-contain" />}
        <div className="flex-1">
          <p className="text-[10px] font-black tracking-[0.2em] leading-none">STACKMIND</p>
          <p className="text-[7px] font-medium tracking-widest opacity-90 leading-tight mt-0.5">TECHNOLOGIES LIMITED</p>
        </div>
        {ceo && <span className="text-[8px] font-bold bg-black/30 px-1.5 py-0.5 rounded">★ EXECUTIVE</span>}
      </div>

      {/* Photo with gradient ring */}
      <div className={`absolute top-12 left-3 w-[88px] h-[110px] rounded-md overflow-hidden p-[2px] bg-gradient-to-b ${gradient} shadow-xl`}>
        <div className="w-full h-full bg-slate-900 rounded-sm overflow-hidden">
          {p.photo_url ? (
            <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-[9px] text-slate-500 font-semibold">PHOTO</div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="absolute top-12 left-[110px] right-3">
        <p className="text-[15px] font-extrabold leading-tight tracking-tight truncate">{p.full_name}</p>
        <p className={`text-[10px] font-semibold mt-0.5 ${accent} uppercase tracking-wider`}>
          {ceo ? "Chief Executive Officer" : (p.designation || "Employee")}
        </p>
        <div className="mt-3 space-y-1">
          <div>
            <p className="text-[7px] text-slate-400 uppercase tracking-widest">Employee ID</p>
            <p className="text-[13px] font-black font-mono tracking-wider">{p.employee_id}</p>
          </div>
          {p.blood_group && (
            <div>
              <p className="text-[7px] text-slate-400 uppercase tracking-widest">Blood</p>
              <p className="text-[10px] font-bold">{p.blood_group}</p>
            </div>
          )}
        </div>
      </div>

      {/* QR code panel */}
      <div className="absolute bottom-2 right-2 bg-white/95 rounded p-1 shadow-lg">
        {qr && <img src={qr} alt="QR" className="w-[68px] h-[68px]" />}
      </div>
      <p className="absolute bottom-1 left-3 text-[7px] text-slate-400 tracking-widest">OFFICE VISIT • SWIPE-IN</p>
    </Card>
  );
}
