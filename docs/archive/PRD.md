# RoadMesh — Product Requirements

## Vision
Multi-tenant SaaS platform for Portuguese auto-repair workshops (oficinas automóveis). Mobile/tablet-first, professional, wine-red brand.

## User choices (locked)
- **Auth**: JWT email + password (registration creates a new workshop tenant)
- **Photos**: existing base64 records remain readable. New photo uploads use private managed object storage; MongoDB holds media IDs and tenant ownership.
- **Multi-tenant**: each registered user gets their own workshop with strict data isolation via `workshop_id`
- **Invoicing**: internal PDF-ready structure with `external_invoice_id` field for future Moloni/InvoiceXpress integration
- **Localization**: pt-PT, EUR (€), dates dd/mm/aaaa

## Core features implemented
1. **Auth & Tenancy** — register/login/logout, JWT, isolated data per workshop
2. **Dashboard (Início)** — 4 KPIs (Ordens de Serviço, Em Reparação, Aguardam Cliente, Faturação), recent work orders, quick actions
3. **Prestação de Serviço** — OS list with search + status filters, OS detail with items/totals/IVA, status workflow (entrada → diagnóstico → aguarda peças → concluído), create OS
4. **Orçamentos** — CRUD, statuses (rascunho/enviado/aceite/recusado), convert accepted quote → OS
5. **Gestão de Clientes** — list/search, create/edit, detail with tabs (contactos, viaturas, histórico), add vehicles
6. **Gestão de Stock** — products list with category filter, product detail with stock movements, low-stock indicator, create product
7. **Encomendas** — create purchase order to supplier, receive → auto-updates stock and creates movement
8. **Fotos do Veículo** — organized by zone (exterior 360, interior, pneus, pintura, chassis), pick from gallery, managed private image storage for new uploads, legacy base64 records still displayed
9. **Faturação** — invoices from concluded OS (orçamento/fatura/fatura-recibo)
10. **Danos** — quick actions on dashboard, work order, vehicle detail and photo gallery; risk/dent/leak selection, location, notes, required photo, severity, saved history and delete confirmation.

## Incremental requests implemented
- User follow-up: remove the photo-like logo background. The supplied artwork was processed deterministically (not regenerated), pale backdrop removed including interior negative spaces, antialiased edges retained and transparent padding cropped. Transparent PNG stored at managed path `roadmesh/brand/69ffc352-597e-4c91-accf-3ad7d6391ec6.png`, cached in `backend/assets/roadmesh-logo.png`, public brand-only route `/api/brand/logo.png`. Shared Logo component covers login, register (explicit follow-up), dashboard, More; PDF uses same transparent PNG.
- Workshop-wide partial/normalized plate search (case, spaces, hyphens ignored), including vehicles with no work order. Search links vehicle/client/history/photos/damages.
- Quotes display email and WhatsApp one-tap compose actions using saved client contacts, fully encoded line items, VAT, total and workshop identity. Portuguese numbers normalize to +351; international prefixes retained. Sending is completed by user in the external app, NOT automatically marked sent. Explicit confirm-sent button retains honest status.
- Client contact editor for missing/incorrect email and phone. Quote creation supports parts and labor and decimal commas.
- Real authenticated ReportLab PDF exports (not placeholders), original logo, customer, vehicle, parts/labor line details, VAT, totals, date, page numbers, wrapped descriptions. New invoices freeze workshop/client/vehicle/items snapshot. Legacy invoices snapshot their source OS at first export.
- Native PDF download and sharing via expo-file-system/legacy + expo-sharing; preview opens generated PDF. PDF labelled **Documento interno · Sem validade fiscal**; external fiscal certification still out of scope.
- Camera/gallery permission descriptions configured. New uploads binary multipart, <=10MB, server image validation/compression, metadata removed, private tenant-protected reads. Existing photos are not migrated or removed.

## Architecture additions
- `backend/media_storage.py`: storage handshake, upload validation, private binary delivery, threadpool for storage IO.
- `backend/pdf_documents.py`: paginated PDF builder; original brand asset cached under `backend/assets` from managed customer-assets URL.
- Frontend routes `viaturas`, `viatura`, `danos` are hidden from bottom navigation; native components in `src/components`; sharing helpers in `src/utils/documents.ts` and `media.ts`.
- Expo actual installed SDK: 57 (package.json source of truth). Backend remains FastAPI/Motor, JWT unchanged.

## Backlog
- P0: none outstanding in implemented flows after regression and follow-up verification.
- P1: verify camera, native email/WhatsApp handoff and PDF share sheet on a physical iOS/Android device; external certified invoicing only if requested.
- P2: atomic numbering counters; richer damage annotations; workshop fiscal profile editor.

## Verification results
- Backend testing agent: 29/29 tests passed for features (report `/app/test_reports/iteration_2.json`).
- Frontend: logo original version on four screens, normalized plate search, quote comma decimals, email/WhatsApp encoded composer links, explicit sent status, acceptance/conversion, PDF export, mobile and tablet five-tab layout verified.
- Image-picker follow-up PASSED: register `expect_file_chooser` before clicking. Main screenshot tool selected actual JPEG, previewed it, saved via managed storage + damages API, verified loaded history image, and tested cancel/confirm deletion, removing temporary record. Original report's gallery issue was an automation listener/timing issue, not reproduced in application. Native camera still requires physical-device validation.
- Metro 1006 is dev hot-reload socket idle noise; RCA found stable Metro process and successful subsequent UI actions. No app API/functionality outage.
- Transparent PNG visually verified on login and register; authenticated PDF export rechecked after logo replacement. Generated FT2026/001 includes transparent logo, Pedro Alves, Audi A4 / 55-CD-99, parts 380€, labor 120€, subtotal 500€, VAT 115€, total 615€, dd/mm/yyyy and internal document notice; no clipping/overlaps found.
- Final TypeScript compilation and JS/Python lint checks pass. Test account credentials documented.

## Design
- Soft light-blue background (#EEF3FA), white cards, subtle shadows, wine-red actions (#7A1E2B)
- Bottom tab nav: Início, Serviço, Clientes, Stock, Mais
- All pt-PT copy, EUR formatting, dd/mm/aaaa dates

## Tech
- Backend: FastAPI, motor (async MongoDB), PyJWT, bcrypt
- Frontend: Expo Router, React Native, TanStack Query, expo-image-picker
- Storage: SecureStore (mobile) + AsyncStorage (web) for token/user session
