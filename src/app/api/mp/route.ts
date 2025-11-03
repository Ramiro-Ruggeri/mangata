// src/app/api/mp/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Esperamos items: [{ id:number, name:string, price:number, qty:number }]
    const items = Array.isArray(body?.items) ? body.items : [];
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

    // Armamos ítems como Mercado Pago espera
    const mpItems = items.map((it: any) => ({
      title: String(it.name),
      quantity: Number(it.qty) || 1,
      currency_id: currency,
      unit_price: Number(it.price), // número con . para decimales (si tuviera)
    }));

    const preference = {
      items: mpItems,
      back_urls: {
        success: `${siteUrl}/checkout/success`,
        failure: `${siteUrl}/checkout/failure`,
        pending: `${siteUrl}/checkout/pending`,
      },
      auto_return: "approved", // ← evita el "invalid_auto_return"
      // binary_mode: false,    // si lo pones true, solo hay aprobado/rechazado (sin pending)
      statement_descriptor: "MANGATA",
      // external_reference: "order-xyz", // opcional
    };

    const res = await fetch(
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

    if (!res.ok) {
      const text = await res.text();
      console.error("MercadoPago error:", text);
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await res.json();
    // init_point = URL para redirigir (sandbox)
    return NextResponse.json({ init_point: data.init_point }, { status: 200 });
  } catch (err: any) {
    console.error("MP exception:", err);
    return NextResponse.json(
      { error: err?.message || "Error al crear preferencia" },
      { status: 500 }
    );
  }
}
