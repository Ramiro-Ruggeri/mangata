# Release Fase A — 05/11/2026

- Commit e imagen: `0b226dfd50a5c1f5ebcf256a237275df07b73175`, publicado en `origin/main` y `https://mangata.com.ar`.
- Rollback conservado: imagen y directorio de `c4e988ebc9682ddced08dd4d540ab4d046e91f24`. No requiere tocar la base.
- Sin cambios en base, stock, secretos ni nginx.

## Comprobaciones

- Candidato aislado, sin secretos ni red: sano, 26 productos idénticos a producción, 4 regresiones SEO.
- Dominio: 4 regresiones SEO, 404 real, 301 de HTTP y www, canonical correcto, bolsa agregar y quitar sin abrir el pago, sin errores de consola.
- No probado en esta release: una compra real, suite Playwright.

## Incidente: conciliación caída 19 minutos

La release se empaquetó en Windows con `git archive` y `core.autocrlf=true`, y el `.gitattributes` estaba vacío. Los scripts de `deploy/` llegaron con CRLF y `/bin/sh` no pudo ejecutarlos.

- Impacto: fallaron 4 corridas de `mangata-commerce-reconcile`, de 00:02 a 00:18 del 06/11. No había pagos pendientes (`checked: 0`, `overdue: 0`) y el stock no cambió. El backup de las 04:30 habría fallado igual; se corrigió antes.
- Detección: tardía. El rollout terminó sin comprobar una corrida real del timer contra la release nueva.
- Corrección: se reextrajeron los archivos del mismo commit con LF. `deploy/` quedó idéntico al de la release anterior. Corrida manual a las 00:21: `status 200`.
- Prevención: `.gitattributes` fija LF para lo que corre en el VPS. Cada release debe ejecutar `sh -n` sobre los scripts y correr `systemctl start mangata-commerce-reconcile.service` antes de darse por terminada.
