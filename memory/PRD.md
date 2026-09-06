# RoadMesh — Product Requirements

## Vision
Multi-tenant SaaS platform for Portuguese auto-repair workshops (oficinas automóveis). Mobile/tablet-first, professional, wine-red brand.

## User choices (locked)
- **Auth**: JWT email + password (registration creates a new workshop tenant)
- **Photos**: base64 stored inline in MongoDB
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
8. **Fotos do Veículo** — organized by zone (exterior 360, interior, pneus, pintura, chassis), pick from gallery, base64 stored
9. **Faturação** — invoices from concluded OS (orçamento/fatura/fatura-recibo)
10. **Danos** — API endpoints ready (photo + severity)

## Design
- Soft light-blue background (#EEF3FA), white cards, subtle shadows, wine-red actions (#7A1E2B)
- Bottom tab nav: Início, Serviço, Clientes, Stock, Mais
- All pt-PT copy, EUR formatting, dd/mm/aaaa dates

## Tech
- Backend: FastAPI, motor (async MongoDB), PyJWT, bcrypt
- Frontend: Expo Router, React Native, TanStack Query, expo-image-picker
- Storage: SecureStore (mobile) + AsyncStorage (web) for token/user session
