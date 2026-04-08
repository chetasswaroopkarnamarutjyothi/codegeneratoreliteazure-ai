import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileText, Sheet, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportColumn {
  key: string;
  label: string;
}

interface AdminExportButtonProps {
  data: any[];
  columns: ExportColumn[];
  fileName: string;
  tabName: string;
  adminName?: string;
  adminEmail?: string;
}

export function AdminExportButton({ data, columns, fileName, tabName, adminName, adminEmail }: AdminExportButtonProps) {
  const { toast } = useToast();

  const generateHeader = () => {
    const reportId = `RPT-${Date.now().toString(36).toUpperCase()}`;
    return {
      logo: "CodeNova AI",
      reportName: `${tabName} Report`,
      reportId,
      adminName: adminName || "Admin",
      adminEmail: adminEmail || "admin@stackmind.com",
      generatedAt: new Date().toLocaleString(),
      footer: "© CodeNova AI - All Rights Reserved | StackMind Technologies Limited",
    };
  };

  const exportCSV = () => {
    const header = generateHeader();
    const headerLines = [
      header.logo,
      `Report: ${header.reportName}`,
      `Report ID: ${header.reportId}`,
      `Admin: ${header.adminName}`,
      `Email: ${header.adminEmail}`,
      `Generated: ${header.generatedAt}`,
      "",
    ];

    const csvHeader = columns.map(c => c.label).join(",");
    const csvRows = data.map(row =>
      columns.map(c => {
        const val = row[c.key];
        const str = val === null || val === undefined ? "" : String(val);
        return str.includes(",") ? `"${str}"` : str;
      }).join(",")
    );

    const csv = [...headerLines, csvHeader, ...csvRows, "", header.footer].join("\n");
    downloadFile(csv, `${fileName}.csv`, "text/csv");
    toast({ title: "Exported to CSV!" });
  };

  const exportJSON = () => {
    const header = generateHeader();
    const exportData = {
      ...header,
      data: data.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach(c => { obj[c.label] = row[c.key]; });
        return obj;
      }),
    };
    downloadFile(JSON.stringify(exportData, null, 2), `${fileName}.json`, "application/json");
    toast({ title: "Exported to JSON!" });
  };

  const exportTXT = () => {
    const header = generateHeader();
    const lines = [
      `${"=".repeat(60)}`,
      `  ${header.logo}`,
      `  ${header.reportName}`,
      `${"=".repeat(60)}`,
      `  Report ID: ${header.reportId}`,
      `  Admin: ${header.adminName}`,
      `  Email: ${header.adminEmail}`,
      `  Generated: ${header.generatedAt}`,
      `${"=".repeat(60)}`,
      "",
    ];

    data.forEach((row, idx) => {
      lines.push(`--- Record ${idx + 1} ---`);
      columns.forEach(c => {
        lines.push(`  ${c.label}: ${row[c.key] ?? "N/A"}`);
      });
      lines.push("");
    });

    lines.push(`${"=".repeat(60)}`);
    lines.push(`  ${header.footer}`);
    lines.push(`${"=".repeat(60)}`);

    downloadFile(lines.join("\n"), `${fileName}.txt`, "text/plain");
    toast({ title: "Exported to TXT!" });
  };

  const downloadFile = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (data.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportCSV}>
          <Sheet className="w-4 h-4 mr-2" />
          Export CSV (Excel compatible)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportJSON}>
          <FileText className="w-4 h-4 mr-2" />
          Export JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportTXT}>
          <File className="w-4 h-4 mr-2" />
          Export TXT Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
