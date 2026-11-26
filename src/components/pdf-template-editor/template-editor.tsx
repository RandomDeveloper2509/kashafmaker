"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DYNAMIC_FIELDS, TemplateField, TemplateFieldConfig, PassengerTableConfig } from "@/lib/pdf/types";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2, Eye, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface TemplateEditorProps {
  templateId: string;
  pdfUrl: string;
  initialConfig: TemplateFieldConfig;
  pageCount: number;
  onSave: (config: TemplateFieldConfig) => Promise<void>;
}

export function TemplateEditor({
  templateId,
  pdfUrl,
  initialConfig,
  pageCount,
  onSave,
}: TemplateEditorProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<TemplateFieldConfig>(initialConfig);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const pageFields = config.fields.filter((f) => f.page === currentPage);
  const selectedField = config.fields.find((f) => f.id === selectedFieldId);

  const addField = (fieldKey: string) => {
    const isImage = fieldKey === "company_logo";
    const newField: TemplateField = {
      id: uuidv4(),
      field: fieldKey,
      page: currentPage,
      x: 100,
      y: 100 + config.fields.filter((f) => f.page === currentPage).length * 30,
      width: isImage ? 80 : 200,
      height: isImage ? 80 : 25,
      fontSize: 12,
      fontFamily: fieldKey.includes("_ar") ? "NotoSansArabic" : "Helvetica",
      align: fieldKey.includes("_ar") ? "right" : "left",
      direction: fieldKey.includes("_ar") ? "rtl" : "ltr",
      bold: false,
      type: isImage ? "image" : "text",
    };
    setConfig((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  };

  const deleteField = (id: string) => {
    setConfig((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== id) }));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleMouseDown = (fieldId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(fieldId);
    setSelectedFieldId(fieldId);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      updateField(dragging, { x: Math.max(0, x - 10), y: Math.max(0, y - 10) });
    },
    [dragging, scale]
  );

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
      toast("Template configuration saved", "success");
    } catch {
      toast("Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldConfig: config }),
      });
      if (!res.ok) throw new Error("Preview failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast("Failed to generate preview", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const updatePassengerTable = (updates: Partial<PassengerTableConfig>) => {
    setConfig((prev) => ({
      ...prev,
      passengerTable: {
        page: currentPage,
        startX: 20,
        startY: 400,
        rowHeight: 25,
        maxRows: 10,
        fontSize: 11,
        fontFamily: "Helvetica",
        direction: "ltr",
        columns: { number: 20, name: 80, passport: 250, nationality: 400 },
        ...prev.passengerTable,
        ...updates,
      },
    }));
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">Page {currentPage} of {pageCount}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 overflow-auto">
            <div ref={containerRef} className="relative inline-block border border-border bg-card">
              {pdfError ? (
                <div className="max-w-md p-8 text-sm text-muted-foreground">
                  Preview could not render this PDF in the browser. The file is still saved. Generate Kashaf from a ride and the data will be written onto the uploaded form.
                  <p className="mt-2 text-xs text-red-600">{pdfError}</p>
                </div>
              ) : (
                <Document
                  file={pdfUrl}
                  loading={<div className="p-8">Loading PDF...</div>}
                  onLoadError={(err) => setPdfError(err.message)}
                >
                  <Page pageNumber={currentPage} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
                </Document>
              )}
              {pageFields.map((field) => (
                <div
                  key={field.id}
                  onMouseDown={(e) => handleMouseDown(field.id, e)}
                  className={`absolute cursor-move border-2 ${
                    selectedFieldId === field.id ? "border-indigo-500 bg-indigo-100/50" : "border-dashed border-indigo-300 bg-indigo-50/30"
                  }`}
                  style={{
                    left: field.x * scale,
                    top: field.y * scale,
                    width: field.width * scale,
                    height: field.height * scale,
                    fontSize: field.fontSize * scale,
                  }}
                >
                  <span className="absolute -top-5 left-0 text-[10px] font-medium text-indigo-600 whitespace-nowrap">
                    {field.field}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Add Field</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-h-60 overflow-y-auto">
            {Object.entries(DYNAMIC_FIELDS).map(([category, fields]) => (
              <div key={category}>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">{category}</p>
                <div className="flex flex-wrap gap-1">
                  {fields.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => addField(f.key)}
                      className="rounded px-2 py-1 text-xs bg-muted hover:bg-indigo-100 text-foreground"
                    >
                      <Plus className="inline h-3 w-3" /> {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {selectedField && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Field Properties</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => deleteField(selectedField.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input label="Field" value={selectedField.field} readOnly />
              <div className="grid grid-cols-2 gap-2">
                <Input label="X" type="number" value={selectedField.x} onChange={(e) => updateField(selectedField.id, { x: Number(e.target.value) })} />
                <Input label="Y" type="number" value={selectedField.y} onChange={(e) => updateField(selectedField.id, { y: Number(e.target.value) })} />
                <Input label="Width" type="number" value={selectedField.width} onChange={(e) => updateField(selectedField.id, { width: Number(e.target.value) })} />
                <Input label="Height" type="number" value={selectedField.height} onChange={(e) => updateField(selectedField.id, { height: Number(e.target.value) })} />
              </div>
              <Input label="Font Size" type="number" value={selectedField.fontSize} onChange={(e) => updateField(selectedField.id, { fontSize: Number(e.target.value) })} />
              <Select
                label="Font"
                value={selectedField.fontFamily}
                onChange={(e) => updateField(selectedField.id, { fontFamily: e.target.value })}
                options={[
                  { value: "Helvetica", label: "Helvetica" },
                  { value: "Times", label: "Times" },
                  { value: "Courier", label: "Courier" },
                  { value: "NotoSansArabic", label: "Noto Sans Arabic" },
                ]}
              />
              <Select
                label="Alignment"
                value={selectedField.align}
                onChange={(e) => updateField(selectedField.id, { align: e.target.value as "left" | "center" | "right" })}
                options={[
                  { value: "left", label: "Left" },
                  { value: "center", label: "Center" },
                  { value: "right", label: "Right" },
                ]}
              />
              <Select
                label="Direction"
                value={selectedField.direction}
                onChange={(e) => updateField(selectedField.id, { direction: e.target.value as "ltr" | "rtl" })}
                options={[
                  { value: "ltr", label: "LTR" },
                  { value: "rtl", label: "RTL" },
                ]}
              />
              <Input
                label="Letter Spacing"
                type="number"
                value={selectedField.letterSpacing || 0}
                onChange={(e) => updateField(selectedField.id, { letterSpacing: Number(e.target.value) })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedField.bold} onChange={(e) => updateField(selectedField.id, { bold: e.target.checked })} />
                Bold
              </label>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Passenger Table</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!config.passengerTable}
                onChange={(e) => {
                  if (e.target.checked) {
                    updatePassengerTable({ page: currentPage });
                  } else {
                    setConfig((prev) => ({ ...prev, passengerTable: undefined }));
                  }
                }}
              />
              Enable repeating passenger table
            </label>
            {config.passengerTable && (
              <>
                <Input label="Start Y" type="number" value={config.passengerTable.startY} onChange={(e) => updatePassengerTable({ startY: Number(e.target.value) })} />
                <Input label="Row Height" type="number" value={config.passengerTable.rowHeight} onChange={(e) => updatePassengerTable({ rowHeight: Number(e.target.value) })} />
                <Input label="Max Rows" type="number" value={config.passengerTable.maxRows} onChange={(e) => updatePassengerTable({ maxRows: Number(e.target.value) })} />
                <Input label="Name Column X" type="number" value={config.passengerTable.columns.name} onChange={(e) => updatePassengerTable({ columns: { ...config.passengerTable!.columns, name: Number(e.target.value) } })} />
                <Input label="Passport Column X" type="number" value={config.passengerTable.columns.passport} onChange={(e) => updatePassengerTable({ columns: { ...config.passengerTable!.columns, passport: Number(e.target.value) } })} />
                <Input label="Nationality Column X" type="number" value={config.passengerTable.columns.nationality} onChange={(e) => updatePassengerTable({ columns: { ...config.passengerTable!.columns, nationality: Number(e.target.value) } })} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
