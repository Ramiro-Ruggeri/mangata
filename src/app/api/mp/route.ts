// src/app/api/mp/route.ts
import { NextResponse } from "next/server";

type CartItemInput = {
  id?: number | string;
  name?: string;
  price?: number | string;
  qty?: number | string;
};

type MercadoPagoPreferenceResponse = {
  init_point?: string;
  sandbox_init_point?: string;
};

function isCartItemInput(value: unknown): value is CartItemInput {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error al crear preferencia";
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    const rawItems =
      typeof body === "object" &&
      body !== null &&
      "items" in body &&
      Array.isArray((body as { items?: unknown }).items)
        ? (body as { items: unknown[] }).items
        : [];

    const items = rawItems.filter(isCartItemInput);

    if (!items.length) {
      return NextResponse.json({ error: "Sin items" }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Falta MP_ACCESS_TOKEN en .env.local" },
        { status: 500 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";

    const currency = (process.env.MP_CURRENCY || "ARS").toUpperCase();

    const mpItems = items.map((item) => ({
      title: String(item.name || "Producto Mangata"),
      quantity: Math.max(1, Number(item.qty) || 1),
      currency_id: currency,
      unit_price: Math.max(1, Number(item.price) || 1),
    }));

    const preference = {
      items: mpItems,
      back_urls: {
        success: `${siteUrl}/checkout/success`,
        failure: `${siteUrl}/checkout/failure`,
        pending: `${siteUrl}/checkout/pending`,
      },
      auto_return: "approved",
      statement_descriptor: "MANGATA",
    };

    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(preference),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("MercadoPago error:", text);

      return NextResponse.json(
        { error: "Mercado Pago rechazó la creación de la preferencia" },
        { status: 500 }
      );
    }

    const data = (await response.json()) as MercadoPagoPreferenceResponse;

    const initPoint = data.init_point || data.sandbox_init_point;

    if (!initPoint) {
      return NextResponse.json(
        { error: "Mercado Pago no devolvió una URL de pago" },
        { status: 500 }
      );
    }

    return NextResponse.json({ init_point: initPoint }, { status: 200 });
  } catch (error: unknown) {
    console.error("MP exception:", error);

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}