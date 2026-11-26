"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Pencil, Trash2, X, UserPlus, Shield, Check, AlertTriangle, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "OPERATOR";
  isActive: boolean;
  createdAt?: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const currentUserEmail = session?.user?.email;

  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [settings, setSettings] = useState({
    defaultTemplateId: "",
    defaultFont: "Helvetica",
    arabicFont: "NotoSansArabic",
  });

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "OPERATOR",
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "OPERATOR" as "ADMIN" | "MANAGER" | "OPERATOR",
    isActive: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal State
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) {
          setTemplates(list.filter((t: { isActive: boolean }) => t.isActive));
        }
      });

    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s) {
          setSettings({
            defaultTemplateId: s.defaultTemplateId || "",
            defaultFont: s.defaultFont || "Helvetica",
            arabicFont: s.arabicFont || "NotoSansArabic",
          });
        }
      });

    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setLoadingUsers(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .finally(() => setLoadingUsers(false));
  };

  const saveSettings = async () => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) toast("Settings saved successfully", "success");
    else toast("Failed to save settings", "error");
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      if (res.ok) {
        toast("User created successfully", "success");
        const u = await res.json();
        setUsers((prev) => [...prev, u]);
        setUserForm({ name: "", email: "", password: "", role: "OPERATOR" });
      } else {
        const err = await res.json();
        toast(err.error || "Failed to create user", "error");
      }
    } catch {
      toast("An error occurred while creating user", "error");
    } finally {
      setCreatingUser(false);
    }
  };

  const openEditModal = (u: UserRow) => {
    setEditingUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      isActive: u.isActive,
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);

    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        isActive: editForm.isActive,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        toast("User updated successfully", "success");
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
        setEditingUser(null);
      } else {
        const err = await res.json();
        toast(err.error || "Failed to update user", "error");
      }
    } catch {
      toast("Error updating user", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast("User deleted successfully", "success");
        setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
        setDeletingUser(null);
      } else {
        const err = await res.json();
        toast(err.error || "Failed to delete user", "error");
      }
    } catch {
      toast("Error deleting user", "error");
    } finally {
      setDeleting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "MANAGER":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "OPERATOR":
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Settings" description="Company, Kashaf, PDF templates, and user administration" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kashaf Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Kashaf Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Default Template"
              value={settings.defaultTemplateId}
              onChange={(e) => setSettings({ ...settings, defaultTemplateId: e.target.value })}
              options={[
                { value: "", label: "None" },
                ...templates.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Company profile is edited under Companies. That data is injected into Kashaf PDFs automatically.
            </p>
            <Button onClick={saveSettings}>Save Kashaf Settings</Button>
          </CardContent>
        </Card>

        {/* PDF Settings */}
        <Card>
          <CardHeader>
            <CardTitle>PDF Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Default Font"
              value={settings.defaultFont}
              onChange={(e) => setSettings({ ...settings, defaultFont: e.target.value })}
              options={[
                { value: "Helvetica", label: "Helvetica" },
                { value: "Times", label: "Times" },
                { value: "Courier", label: "Courier" },
              ]}
            />
            <Input
              label="Arabic Font"
              value={settings.arabicFont}
              onChange={(e) => setSettings({ ...settings, arabicFont: e.target.value })}
            />
            <Button onClick={saveSettings}>Save PDF Settings</Button>
          </CardContent>
        </Card>

        {/* User Management Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Manage panel access, assign administrative roles, update profiles, or reset passwords.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Shield className="h-4 w-4 text-indigo-600" />
              <span>{users.length} Users Registered</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Create User Form */}
            <div className="rounded-xl border border-border bg-muted/50/70 p-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-indigo-600" />
                <span>Create New User</span>
              </h3>
              <form onSubmit={createUser} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <Input
                  label="Full Name"
                  placeholder="e.g. Ali Noor"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@company.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required
                />
                <Select
                  label="Role"
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  options={[
                    { value: "ADMIN", label: "Admin (Full Access)" },
                    { value: "MANAGER", label: "Manager (Rides & Fleet)" },
                    { value: "OPERATOR", label: "Operator (Rides & Kashaf)" },
                  ]}
                />
                <div className="sm:col-span-4 flex justify-end">
                  <Button type="submit" disabled={creatingUser} className="bg-indigo-600 hover:bg-indigo-700 text-xs">
                    {creatingUser ? "Creating..." : "Add User"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50/80 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Loading user directory...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No users registered yet.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isCurrent = u.id === currentUserId || u.email === currentUserEmail;
                      return (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shadow-xs">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">{u.name}</span>
                                {isCurrent && (
                                  <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">{u.email}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border",
                                getRoleBadge(u.role)
                              )}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                u.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  u.isActive ? "bg-emerald-500" : "bg-slate-400"
                                )}
                              />
                              {u.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditModal(u)}
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-indigo-600 transition-colors font-medium border border-border cursor-pointer"
                                title="Edit user"
                              >
                                <Pencil className="h-3 w-3" />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => setDeletingUser(u)}
                                type="button"
                                disabled={isCurrent}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors border cursor-pointer",
                                  isCurrent
                                    ? "opacity-30 cursor-not-allowed text-muted-foreground border-border"
                                    : "text-muted-foreground hover:text-red-600 hover:bg-red-50 border-border"
                                )}
                                title={isCurrent ? "You cannot delete your own account" : "Delete user"}
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base leading-tight">Edit User</h3>
                  <p className="text-xs text-muted-foreground">{editingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-4">
              <Input
                label="Full Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />

              <Select
                label="Role"
                value={editForm.role}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    role: e.target.value as "ADMIN" | "MANAGER" | "OPERATOR",
                  })
                }
                options={[
                  { value: "ADMIN", label: "Admin (Full System Access)" },
                  { value: "MANAGER", label: "Manager (Rides, Fleet & Reports)" },
                  { value: "OPERATOR", label: "Operator (Rides & Kashaf)" },
                ]}
              />

              <div>
                <Input
                  label="New Password (Optional)"
                  type="password"
                  placeholder="Leave empty to keep unchanged"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Only enter a new password if you wish to reset it for this user.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50/70 p-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Account Status</label>
                  <p className="text-[10px] text-muted-foreground">Enable or disable login access</p>
                </div>
                <Select
                  value={editForm.isActive ? "true" : "false"}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "true" })}
                  options={[
                    { value: "true", label: "Active" },
                    { value: "false", label: "Inactive" },
                  ]}
                  className="w-28"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  className="cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer text-xs"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base leading-tight">Delete User</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Permanent account removal</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground">{deletingUser.name}</strong> (
              {deletingUser.email})? This user will immediately lose access to the system.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingUser(null)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteUser}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer text-xs"
              >
                {deleting ? "Deleting..." : "Delete User"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
