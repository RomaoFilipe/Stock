"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Download, Printer, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProductQrDialogProps {
  data: string;
  title: string;
  trigger?: React.ReactNode;
}

export default function ProductQrDialog({ data, title, trigger }: ProductQrDialogProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateQr = async () => {
      try {
        setIsLoading(true);
        const url = await QRCode.toDataURL(data, {
          width: 240,
          margin: 2,
          color: { dark: "#111827", light: "#ffffff" },
        });
        setQrCodeUrl(url);
      } catch (error) {
        console.error("Error generating QR code:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (data) {
      generateQr();
    }
  }, [data]);

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `qr-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!qrCodeUrl) return;
    const printWindow = window.open("", "_blank", "width=480,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
            img { width: 240px; height: 240px; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <h2>${title}</h2>
            <img src="${qrCodeUrl}" alt="QR" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full">
            <QrCode className="h-4 w-4" />
            Ver QR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl border border-border/60 bg-background/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Usa este QR para identificar rapidamente o produto.
        </DialogDescription>
        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="flex h-60 w-60 items-center justify-center rounded-2xl border border-border/60 bg-card/60">
            {isLoading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            ) : (
              <Image src={qrCodeUrl} alt={title} width={240} height={240} className="rounded-xl" />
            )}
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="w-full gap-2" onClick={handleDownload} disabled={!qrCodeUrl}>
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={handlePrint} disabled={!qrCodeUrl}>
              <Printer className="h-4 w-4" />
              Imprimir etiqueta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
