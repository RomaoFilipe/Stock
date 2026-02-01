"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";
import { useAuth } from "@/app/authContext";
import axiosInstance from "@/utils/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/app/components/PageHeader";
import SectionCard from "@/app/components/SectionCard";

type UserRole = "USER" | "ADMIN";

type UserRow = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export default function UsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isLoggedIn, user } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [creating, setCreating] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const canCreate = useMemo(() => {
    return Boolean(name.trim()) && Boolean(email.trim()) && password.length >= 6;
  }, [name, email, password]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/users");
      setUsers(res.data || []);
    } catch (error: any) {
      const msg = error?.response?.data?.error || "Não foi possível carregar utilizadores.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
      return;
    }

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isAdmin]);

  const createUser = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const payload = { name: name.trim(), email: email.trim(), password, role };
      const res = await axiosInstance.post("/users", payload);
      setUsers((prev) => [res.data, ...prev]);
      setName("");
      setEmail("");
      setPassword("");
      setRole("USER");
      toast({ title: "Utilizador criado", description: "Conta criada com sucesso." });
    } catch (error: any) {
      const msg = error?.response?.data?.error || "Não foi possível criar o utilizador.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const updateRole = async (id: string, newRole: UserRole) => {
    try {
      const res = await axiosInstance.patch(`/users/${id}`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === id ? res.data : u)));
      toast({ title: "Role atualizada" });
    } catch (error: any) {
      const msg = error?.response?.data?.error || "Não foi possível atualizar.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await axiosInstance.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast({ title: "Utilizador removido" });
    } catch (error: any) {
      const msg = error?.response?.data?.error || "Não foi possível remover.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Pessoas"
          description="Gestão de utilizadores e permissões (apenas ADMIN)."
          actions={
            <Button variant="outline" onClick={() => loadUsers()} disabled={loading}>
              {loading ? "A carregar..." : "Atualizar"}
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard
            title="Criar utilizador"
            description="Cria contas internas (o registo público está desativado)."
          >
              <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input
                placeholder="Password (min 6)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex justify-end">
                <Button onClick={createUser} disabled={!canCreate || creating}>
                  {creating ? "A criar..." : "Criar"}
                </Button>
              </div>
          </SectionCard>

          <SectionCard title="Utilizadores" description="Lista de contas no sistema.">
              {loading ? (
                <p className="text-sm text-muted-foreground">A carregar...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem utilizadores.</p>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={u.role} onValueChange={(v) => updateRole(u.id, v as UserRole)}>
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">USER</SelectItem>
                              <SelectItem value="ADMIN">ADMIN</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="destructive"
                            onClick={() => deleteUser(u.id)}
                            disabled={u.id === user?.id}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </SectionCard>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
