import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminExportButton } from "./AdminExportButton";

/** Loads enterprise_credit_allocations and renders the standard export dropdown. */
export function EnterpriseAllocationsExport() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("enterprise_credit_allocations")
        .select("enterprise_name, mode, amount, allocated_by, allocated_at, notes")
        .order("allocated_at", { ascending: false })
        .limit(1000);
      setRows(data || []);
    })();
  }, []);

  return (
    <AdminExportButton
      data={rows}
      columns={[
        { key: "enterprise_name", label: "Enterprise" },
        { key: "mode", label: "Mode" },
        { key: "amount", label: "Amount" },
        { key: "allocated_by", label: "Allocated By" },
        { key: "allocated_at", label: "Allocated At" },
        { key: "notes", label: "Notes" },
      ]}
      fileName="enterprise_allocations"
      tabName="Enterprise Allocations"
    />
  );
}
