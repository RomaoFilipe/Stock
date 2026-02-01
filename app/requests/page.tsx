"use client";

import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/authContext";
import { useProductStore } from "@/app/useProductStore";
import axiosInstance from "@/utils/axiosInstance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QRCodeComponent } from "@/components/ui/qr-code";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import AttachmentsDialog from "@/app/components/AttachmentsDialog";
import { Plus, RefreshCcw } from "lucide-react";

type RequestItemDto = {
  id: string;
  productId: string;
  quantity: number;
  notes?: string | null;
  product?: { id: string; name: string; sku: string };
  createdAt: string;
  updatedAt: string;
};

type RequestDto = {
  id: string;
  userId: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "FULFILLED";
  title?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: RequestItemDto[];
  invoices?: Array<{ id: string; invoiceNumber: string; issuedAt: string; productId: string }>;
  user?: { id: string; name: string; email: string };
  createdBy?: { id: string; name: string; email: string };
};

type UserDto = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};

const formatStatus = (status: RequestDto["status"]) => {
  switch (status) {
    case "DRAFT":
      return { label: "Rascunho", className: "bg-muted/50 text-muted-foreground border-border/60" };
    case "SUBMITTED":
      return { label: "Submetida", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" };
    case "APPROVED":
      return { label: "Aprovada", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" };
    case "REJECTED":
      return { label: "Rejeitada", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20" };
    case "FULFILLED":
      return { label: "Cumprida", className: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20" };
    default:
      return { label: status, className: "bg-muted/50 text-muted-foreground border-border/60" };
  }
};

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { isLoggedIn, user } = useAuth();
  const { allProducts, loadProducts } = useProductStore();

  const [origin, setOrigin] = useState("");
  const focusId = searchParams?.get("focus");

  const isAdmin = user?.role === "ADMIN";
  const [users, setUsers] = useState<UserDto[]>([]);
  const [asUserId, setAsUserId] = useState<string>("");

  const [requests, setRequests] = useState<RequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  const canCreate = useMemo(() => {
    return Boolean(productId) && Number.isFinite(quantity) && quantity > 0;
  }, [productId, quantity]);

  const loadAll = async () => {
    if (!isLoggedIn) return;

    setLoading(true);
    try {
      const effectiveAsUserId = isAdmin && asUserId ? asUserId : undefined;
      await loadProducts(effectiveAsUserId);
      const res = await axiosInstance.get("/requests", {
        params: effectiveAsUserId ? { asUserId: effectiveAsUserId } : undefined,
      });
      setRequests(res.data || []);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as requisições.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    setOrigin(window.location.origin);

    const bootstrapAdmin = async () => {
      if (!isAdmin) return;
      try {
        const res = await axiosInstance.get("/users");
        setUsers(res.data || []);
        if (!asUserId && user?.id) {
          setAsUserId(user.id);
        }
      } catch {
        // ignore: admin features won't show without users list
      }
    };

    bootstrapAdmin();

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isAdmin]);

  useEffect(() => {
    if (isAdmin && asUserId) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asUserId]);

  const createRequest = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const effectiveAsUserId = isAdmin && asUserId ? asUserId : undefined;
      const payload = {
        asUserId: effectiveAsUserId,
        title: title.trim() ? title.trim() : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
        items: [{ productId, quantity }],
      };
      const res = await axiosInstance.post("/requests", payload);
      setRequests((prev) => [res.data, ...prev]);
      setTitle("");
      setNotes("");
      setProductId("");
      setQuantity(1);

      toast({
        title: "Requisição criada",
        description: "A requisição foi submetida com sucesso.",
      });
    } catch (error: any) {
      const msg = error?.response?.data?.error || "Não foi possível criar a requisição.";
      toast({
        title: "Erro",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Requisições</h1>
            <p className="text-sm text-muted-foreground">
              Crie requisições de reposição/compra ligadas aos produtos.
            </p>
          </div>
          <Button variant="outline" onClick={() => loadAll()} disabled={loading}>
            {loading ? "A carregar..." : "Atualizar"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Nova requisição</CardTitle>
              <CardDescription>
                Versão inicial: criar uma requisição com 1 item (produto + quantidade).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAdmin ? (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Pessoa</div>
                  <Select value={asUserId} onValueChange={setAsUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha a pessoa" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    A requisição será criada em nome da pessoa selecionada.
                  </div>
                </div>
              ) : null}

              <Input
                placeholder="Título (opcional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                placeholder="Notas (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProducts
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="Quantidade"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={createRequest} disabled={!canCreate || creating}>
                  {creating ? "A criar..." : "Criar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requisições recentes</CardTitle>
              <CardDescription>
                Lista por utilizador (escopo por sessão).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">A carregar...</p>
              ) : requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem requisições ainda.</p>
              ) : (
                <div className="space-y-2">
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className={
                        "border rounded-md p-3 " +
                        (focusId && focusId === r.id ? "ring-2 ring-primary" : "")
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">
                          {r.title?.trim() ? r.title : "(sem título)"}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">{r.status}</div>
                          <AttachmentsDialog
                            kind="REQUEST"
                            requestId={r.id}
                            buttonText="Anexos"
                            title={`Anexos • ${r.title?.trim() ? r.title : "(sem título)"}`}
                            description="Ficheiros ligados a esta requisição."
                          />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {isAdmin && r.user ? (
                          <span>
                            Para: <span className="font-medium">{r.user.name}</span>
                            {" • "}
                          </span>
                        ) : null}
                        {r.createdBy ? (
                          <span>
                            Criado por: <span className="font-medium">{r.createdBy.name}</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            {r.invoices && r.invoices.length > 0 ? (
                              <span>
                                Fatura ligada: <span className="font-medium">{r.invoices[0].invoiceNumber}</span>
                              </span>
                            ) : (
                              <span>Sem fatura ligada.</span>
                            )}
                          </div>
                          {r.items?.[0]?.productId ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/products/${r.items[0].productId}?requestId=${r.id}` +
                                      (isAdmin ? `&asUserId=${r.userId}` : "")
                                  )
                                }
                              >
                                Criar fatura (produto)
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        {origin ? (
                          <QRCodeComponent
                            data={`${origin}/requests?focus=${r.id}`}
                            title="QR • Requisição"
                            size={140}
                            showDownload
                          />
                        ) : null}
                      </div>

                      <div className="mt-2 text-sm">
                        {r.items.map((it) => (
                          <div key={it.id} className="text-muted-foreground">
                            {it.product?.name || it.productId} — {it.quantity}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
