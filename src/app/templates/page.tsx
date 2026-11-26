"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardContent, Badge, EmptyState, LoadingSpinner, Modal } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  description: string | null;
  version: number;
  pageCount: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

export default function TemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "NBIS Kashaf", description: "", isDefault: true });

  const fetchData = () => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast("Please select a PDF file", "error");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append(
        "data",
        JSON.stringify({
          name: form.name,
          description: form.description,
          isActive: true,
          isDefault: form.isDefault,
        })
      );
      const res = await fetch("/api/templates", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const template = await res.json();
      toast("Template uploaded", "success");
      setModalOpen(false);
      window.location.href = "/templates";
    } catch (error) {
      toast(error instanceof Error ? error.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Kashaf Templates"
        description="Upload your official Kashaf PDF. Ride data is written onto that form."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Upload Template
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              title="No templates"
              description="Upload a Kashaf PDF to start mapping fields"
              action={<Button onClick={() => setModalOpen(true)}>Upload Template</Button>}
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Version</th>
                  <th className="px-4 py-3 text-left">Pages</th>
                  <th className="px-4 py-3 text-left">Uploaded</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {t.name}
                      {t.isDefault && (
                        <Badge variant="info" className="ml-2">
                          Default
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">v{t.version}</td>
                    <td className="px-4 py-3">{t.pageCount}</td>
                    <td className="px-4 py-3">{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.isActive ? "success" : "default"}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/templates/${t.id}`} className="text-indigo-600 hover:underline font-medium">
                        Edit mapping
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload Kashaf Template">
        <form onSubmit={handleUpload} className="space-y-4">
          <Input
            label="Template Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">PDF File</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Set as default template
          </label>
          <p className="text-xs text-muted-foreground">
            Upload your official 2-page NBIS Kashaf PDF. Fields are filled automatically from company, driver, vehicle, ride, and passengers.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
