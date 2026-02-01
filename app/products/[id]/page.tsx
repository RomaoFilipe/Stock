"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";
import axiosInstance from "@/utils/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AttachmentsDialog from "@/app/components/AttachmentsDialog";
import { QRCodeComponent } from "@/components/ui/qr-code";
import PageHeader from "@/app/components/PageHeader";
import SectionCard from "@/app/components/SectionCard";
import EmptyState from "@/app/components/EmptyState";

type ProductDetails = {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  supplier?: string;
};

type ProductInvoice = {
  id: string;
  productId: string;
  requestId?: string | null;
  invoiceNumber: string;
  issuedAt: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
  request?:
    | {
        id: string;
        title?: string | null;
        status: string;
        createdAt: string;
        user: { id: string; name: string; email: string };
      }
    | null;
};

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const productId = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const requestIdFromQuery = searchParams?.get("requestId");
  const asUserIdFromQuery = searchParams?.get("asUserId") ?? searchParams?.get("userId");
  const [origin, setOrigin] = useState("");

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [invoices, setInvoices] = useState<ProductInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => {
    const q = Number.isFinite(quantity) ? quantity : 0;
    const p = Number.isFinite(unitPrice) ? unitPrice : 0;
    return q * p;
  }, [quantity, unitPrice]);

  const loadAll = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [productRes, invoicesRes] = await Promise.all([
        axiosInstance.get(`/products/${productId}`, {
          params: asUserIdFromQuery ? { asUserId: asUserIdFromQuery } : undefined,
        }),
        axiosInstance.get(`/invoices`, {
          params: asUserIdFromQuery ? { productId, asUserId: asUserIdFromQuery } : { productId },
        }),
      ]);

      setProduct(productRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      toast({
        title: "Falha ao carregar produto",
        description: "Verifique a sessão e tente novamente.",
        variant: "destructive",
      });
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const addInvoice = async () => {
    if (!productId) return;
    setSaving(true);
    try {
      const payload = {
        asUserId: asUserIdFromQuery || undefined,
        productId,
        requestId: requestIdFromQuery || undefined,
        invoiceNumber,
        issuedAt: issuedAt ? new Date(issuedAt).toISOString() : undefined,
        quantity,
        unitPrice,
        notes: notes || undefined,
      };

      const res = await axiosInstance.post("/invoices", payload);
      setInvoices((prev) => [res.data, ...prev]);

      setInvoiceNumber("");
      setIssuedAt("");
      setQuantity(1);
      setUnitPrice(0);
      setNotes("");

      toast({
        title: "Fatura adicionada",
        description: "A fatura foi associada ao produto.",
      });
    } catch (error: any) {
      const msg = error?.response?.data?.error || "Não foi possível criar a fatura.";
      toast({
        title: "Erro",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <PageHeader
          title={product?.name ?? "Produto"}
          description="Detalhes e faturas"
          actions={
            <Button variant="outline" onClick={() => router.push("/")}>Voltar</Button>
          }
        />

        {loading ? (
          <SectionCard title="A carregar..." description="A obter detalhes do produto.">
            <p className="text-sm text-muted-foreground">Aguarde.</p>
          </SectionCard>
        ) : !product ? (
          <EmptyState
            title="Produto não encontrado"
            description="Não foi possível carregar este produto. Verifique a sessão e tente novamente."
            action={
              <Button variant="outline" onClick={() => router.push("/")}>Voltar aos produtos</Button>
            }
          />
        ) : (
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="invoices">Faturas</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <SectionCard title="Detalhes do produto" description="Informação base e metadados.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">SKU:</span> {product.sku}</div>
                  <div><span className="font-medium">Preço:</span> ${product.price.toFixed(2)}</div>
                  <div><span className="font-medium">Quantidade:</span> {product.quantity}</div>
                  <div><span className="font-medium">Estado:</span> {product.status || "—"}</div>
                  <div><span className="font-medium">Categoria:</span> {product.category || "—"}</div>
                  <div><span className="font-medium">Fornecedor:</span> {product.supplier || "—"}</div>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SectionCard
                  title="Nova fatura"
                  description={requestIdFromQuery ? "Esta fatura será ligada à requisição selecionada." : "Registe uma nova fatura para este produto."}
                >
                  <div className="space-y-3">
                    <Input
                      placeholder="Número da fatura"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                    />

                    {requestIdFromQuery ? (
                      <div className="text-xs text-muted-foreground">
                        Requisição: <span className="font-medium">{requestIdFromQuery}</span>
                      </div>
                    ) : null}

                    <Input
                      type="date"
                      value={issuedAt}
                      onChange={(e) => setIssuedAt(e.target.value)}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        min={0}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        placeholder="Quantidade"
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                        placeholder="Preço unitário"
                      />
                    </div>

                    <Input
                      placeholder="Notas (opcional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total: ${total.toFixed(2)}</span>
                      <Button onClick={addInvoice} disabled={saving || !invoiceNumber.trim()}>
                        {saving ? "A guardar..." : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Faturas" description="Registos associados a este produto.">
                  {invoices.length === 0 ? (
                    <EmptyState
                      title="Sem faturas"
                      description="Ainda não existem faturas associadas a este produto."
                    />
                  ) : (
                    <div className="space-y-2">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="border rounded-md p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{inv.invoiceNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(inv.issuedAt).toLocaleDateString("pt-PT")}
                            </div>
                          </div>

                          {inv.request ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Requisição: <span className="font-medium">{inv.request.title?.trim() ? inv.request.title : inv.request.id}</span>
                              {" • "}
                              Pessoa: <span className="font-medium">{inv.request.user.name}</span>
                            </div>
                          ) : null}

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="text-sm text-muted-foreground">
                              {inv.quantity} × {inv.unitPrice} = ${(inv.quantity * inv.unitPrice).toFixed(2)}
                            </div>
                            <div className="flex items-center gap-2">
                              <AttachmentsDialog
                                kind="INVOICE"
                                invoiceId={inv.id}
                                buttonText="Anexos"
                                title={`Anexos • ${inv.invoiceNumber}`}
                                description="Ficheiros ligados a esta fatura (PDF, imagem, etc.)."
                              />
                              {origin ? (
                                <QRCodeComponent
                                  data={`${origin}/products/${productId}?invoiceId=${inv.id}${inv.requestId ? `&requestId=${inv.requestId}` : ""}`}
                                  title="QR"
                                  size={110}
                                  showDownload={false}
                                />
                              ) : null}
                            </div>
                          </div>

                          {inv.notes ? (
                            <div className="text-sm mt-1">{inv.notes}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
