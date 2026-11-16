"""Typed product records: tenant isolation, optimistic revisions and server-side timekeeping."""
from datetime import datetime, timezone
from fastapi import Depends, HTTPException
from pydantic import Field
from pymongo import ReturnDocument
from roadmesh.core.access_control import StrictModel, identifier, timestamp
from roadmesh.core.module_catalog import FEATURES, enabled_features
from roadmesh.infrastructure.database.integrity import transact

# The server owns both field definitions and state vocabularies.
SPECS = {
 "digital_inspections": {"singular": "Inspeção", "states": ["aberta", "revista", "concluida", "arquivada"], "vehicle": True,
  "fields": [("component", "Componente / sistema", "text", True), ("finding", "Resultado observado", "multiline", True), ("severity", "Gravidade", "text", False), ("recommendation", "Recomendação", "multiline", False)]},
 "technician_time": {"singular": "Tarefa", "states": ["planeada", "em_curso", "pausada", "concluida", "arquivada"], "vehicle": True,
  "fields": [("work_order_id", "Referência da ordem de serviço", "text", False), ("task", "Trabalho a executar", "multiline", True), ("estimated_minutes", "Tempo previsto (minutos)", "number", False)]},
 "customer_notifications": {"singular": "Mensagem", "states": ["rascunho", "preparada", "arquivada"], "vehicle": False,
  "notice": "Guarde modelos e prepare mensagens. Os envios automáticos ficam disponíveis depois de contratar e ligar um fornecedor.",
  "fields": [("recipient", "Destinatário", "text", False), ("channel", "Canal (email, SMS ou WhatsApp)", "text", True), ("message", "Mensagem", "multiline", True), ("event", "Evento associado", "text", False)]},
 "online_bookings": {"singular": "Pedido de reserva", "states": ["pedido", "confirmado", "cancelado", "concluido", "arquivada"], "vehicle": False,
  "fields": [("contact", "Contacto do cliente", "text", True), ("service", "Serviço pretendido", "text", True), ("start", "Início (AAAA-MM-DD HH:MM)", "datetime", True), ("end", "Fim (AAAA-MM-DD HH:MM)", "datetime", True), ("resource", "Recurso / posto", "text", True)]},
 "invoicing": {"singular": "Ligação de faturação", "states": ["por_configurar", "em_validacao", "arquivada"], "vehicle": False,
  "notice": "A emissão fiscal depende de um fornecedor contratado. Estes registos organizam a preparação; não emitem faturas.",
  "fields": [("provider", "Software de faturação", "text", True), ("account_reference", "Referência da conta (sem credenciais)", "text", False), ("contact", "Contacto comercial / suporte", "text", False)]},
 "technical_data": {"singular": "Referência técnica", "states": ["por_validar", "validada", "arquivada"], "vehicle": True,
  "notice": "As pesquisas automáticas dependem de licenças de dados. Pode organizar referências manuais com a respetiva origem.",
  "fields": [("reference", "Referência OEM / fabricante", "text", True), ("brand", "Marca / fabricante", "text", False), ("source", "Origem da informação", "text", True), ("compatibility", "Compatibilidade e observações", "multiline", False)]},
 "marketing": {"singular": "Campanha", "states": ["rascunho", "revista", "arquivada"], "vehicle": False,
  "notice": "Prepare campanhas e segmentos. Nenhum envio comercial é efetuado ao guardar.",
  "fields": [("audience", "Segmento de clientes", "text", True), ("message", "Conteúdo da campanha", "multiline", True), ("objective", "Objetivo", "text", False)]},
 "multi_location": {"singular": "Unidade", "states": ["ativa", "inativa", "arquivada"], "vehicle": False,
  "fields": [("address", "Morada", "multiline", True), ("contact", "Contacto", "text", True), ("manager", "Responsável", "text", False), ("hours", "Horário", "text", False)]},
 "vehicle_reception": {"singular": "Receção", "states": ["aberta", "finalizada", "arquivada"], "vehicle": True,
  "fields": [("mileage", "Quilometragem", "number", True), ("fuel", "Combustível à entrada", "text", True), ("complaint", "Pedido do cliente", "multiline", True), ("condition", "Estado e danos observados", "multiline", False)]},
}

class RecordBody(StrictModel):
 title: str = Field(min_length=2, max_length=160)
 vehicle_id: str | None = Field(default=None, max_length=100)
 notes: str = Field(default="", max_length=4000)
 values: dict[str, str] = Field(default_factory=dict, max_length=12)
 revision: int = Field(default=0, ge=0)
 status: str | None = Field(default=None, max_length=32)

class RevisionBody(StrictModel):
 revision: int = Field(ge=1)

def spec_for(module):
 if module not in SPECS:
  raise HTTPException(404, "Produto não encontrado.")
 return SPECS[module]

def validate_values(spec, values):
 fields = {f[0]: f for f in spec["fields"]}
 if set(values) - set(fields):
  raise HTTPException(422, "Existem campos desconhecidos neste formulário.")
 clean = {}
 for key, label, kind, required in spec["fields"]:
  value = values.get(key, "").strip()
  if len(value) > 4000 or (required and not value):
   raise HTTPException(422, f"Reveja o campo: {label}.")
  if value and kind == "number":
   try:
    n = float(value.replace(",", "."))
    if not 0 <= n <= 10000000: raise ValueError()
   except ValueError:
    raise HTTPException(422, f"Indique um número válido: {label}.")
  if value and kind == "datetime":
   try:
    # Local form dates have an explicit workshop timezone, including DST.
    from zoneinfo import ZoneInfo
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None: parsed = parsed.replace(tzinfo=ZoneInfo("Europe/Lisbon"))
    value = parsed.astimezone(timezone.utc).isoformat()
   except ValueError:
    raise HTTPException(422, f"Indique uma data e hora válidas: {label}.")
  clean[key] = value
 if clean.get("start") and clean["end"] <= clean["start"]:
  raise HTTPException(422, "O fim deve ser posterior ao início.")
 return clean

async def initialize_products(db):
 # Split former bundles once, preserving both their access and negotiated total.
 companies = await db.workshops.find({"subscription_version":1,"product_catalog_version":{"$ne":2}},{"_id":0}).to_list(None)
 for company in companies:
  enabled=list(company.get("enabled_modules",[]))
  prices=dict(company.get("module_prices",{}))
  additions=[]
  if "service_orders" in enabled: additions += ["quotes","payments","invoicing","reports"]
  if "customer_notifications" in enabled: additions += ["appointments"]
  for key in additions:
   if key not in enabled:
    enabled.append(key)
    prices[key]="0.00"
  await db.workshops.update_one({"id":company["id"],"product_catalog_version":{"$ne":2}},
   {"$set":{"enabled_modules":enabled,"module_prices":prices,"product_catalog_version":2,
    "catalog_migration_backup":{"enabled_modules":company.get("enabled_modules",[]),"module_prices":company.get("module_prices",{})}}})
 if getattr(db, "is_postgres", False) is not True:
  await db.product_records.create_index("id", unique=True)
  await db.product_records.create_index([("workshop_id", 1), ("module", 1), ("created_at", -1)])

def register_product_routes(api, db, access):
 staff = Depends(access.workshop)
 def scope(user, module, extra=None):
  return {"workshop_id": user["workshop_id"], "module": module, **(extra or {})}

 @api.get("/workspace/{module}/definition")
 async def definition(module: str, user=staff):
  spec = spec_for(module)
  return {**spec, "fields": [{"key": k, "label": label, "kind": kind, "required": required} for k,label,kind,required in spec["fields"]]}

 @api.get("/workspace/{module}/records")
 async def records(module: str, skip: int = 0, limit: int = 30, user=staff):
  spec_for(module)
  if skip < 0 or not 1 <= limit <= 100: raise HTTPException(422, "Paginação inválida.")
  q = scope(user, module)
  return {"items": await db.product_records.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit),
          "total": await db.product_records.count_documents(q)}

 @api.post("/workspace/{module}/records", status_code=201)
 async def create(module: str, body: RecordBody, user=staff):
  return await save(module, None, body, user)

 @api.get("/workspace/{module}/records/{rid}")
 async def detail(module: str, rid: str, user=staff):
  spec_for(module)
  record = await db.product_records.find_one(scope(user,module,{"id":rid}),{"_id":0})
  if not record: raise HTTPException(404,"Registo não encontrado.")
  return record

 @api.put("/workspace/{module}/records/{rid}")
 async def update(module: str, rid: str, body: RecordBody, user=staff):
  return await save(module, rid, body, user)

 async def save(module, rid, body, user):
  spec = spec_for(module)
  values = validate_values(spec, body.values)
  if module in {"invoicing", "multi_location"} and user.get("role") != "admin" and not await access.is_workshop_manager(user):
   raise HTTPException(403, "Apenas o responsável pode gerir esta configuração.")
  status = body.status or spec["states"][0]
  if status not in spec["states"]: raise HTTPException(422, "Estado inválido.")
  if module == "technician_time" and status == "em_curso":
   raise HTTPException(422, "Use a ação Iniciar para registar o tempo.")
  async def operation(session):
   previous = await db.product_records.find_one(scope(user, module, {"id": rid}), {"_id": 0}, session=session) if rid else None
   if rid and not previous: raise HTTPException(404, "Registo não encontrado.")
   if previous and previous["revision"] != body.revision: raise HTTPException(409, "O registo mudou. Atualize antes de guardar.")
   if previous and module == "technician_time" and previous.get("running_since"):
    raise HTTPException(409, "Pare o cronómetro antes de editar.")
   if previous and module == "vehicle_reception" and previous["status"] == "finalizada":
    raise HTTPException(409, "Uma receção finalizada fica preservada. Crie um novo registo para correções.")
   if spec["vehicle"]:
    if not body.vehicle_id or not await db.vehicles.find_one({"id": body.vehicle_id, "workshop_id": user["workshop_id"]}, {"_id":0,"id":1}, session=session):
     raise HTTPException(422, "Escolha uma viatura da empresa.")
   if module == "online_bookings" and status == "confirmado":
    # Serialize availability decisions for this tenant, even when two inserts race.
    await db.workshops.update_one({"id":user["workshop_id"]}, {"$inc":{"booking_revision":1}}, session=session)
    overlaps = await db.product_records.find_one(scope(user,module,{"status":"confirmado","id":{"$ne":rid},
       "booking_resource": values["resource"], "booking_start":{"$lt":values["end"]},"booking_end":{"$gt":values["start"]}}), {"_id":0,"id":1},session=session)
    if overlaps: raise HTTPException(409, "Esse recurso já tem uma reserva confirmada nesse horário.")
   doc = {**(previous or {}), "id":rid or identifier(),"workshop_id":user["workshop_id"],"module":module,
    "title":body.title,"vehicle_id":body.vehicle_id if spec["vehicle"] else None,"values":values,
    "notes":body.notes,"status":status,"revision":body.revision+1 if previous else 1,
    "created_at":previous["created_at"] if previous else timestamp(),"updated_at":timestamp(),"updated_by":user["id"]}
   if module == "online_bookings":
    doc.update(booking_resource=values["resource"],booking_start=values["start"],booking_end=values["end"])
   if previous:
    result = await db.product_records.update_one(scope(user,module,{"id":rid,"revision":body.revision}),{"$set":doc},session=session)
    if result.matched_count != 1: raise HTTPException(409, "O registo mudou. Atualize a página.")
   else: await db.product_records.insert_one(doc,session=session)
   doc.pop("_id",None)
   return doc
  result = await transact(db,operation)
  await access.audit(user, "product.record.saved", resource=result["id"],details={"module":module,"revision":result["revision"]})
  return result

 @api.post("/workspace/technician_time/records/{rid}/{action}")
 async def timer(rid: str, action: str, body: RevisionBody, user=staff):
  if action not in {"start","stop"}: raise HTTPException(404,"Ação não encontrada.")
  async def operation(session):
   q=scope(user,"technician_time",{"id":rid,"revision":body.revision})
   record=await db.product_records.find_one(q,{"_id":0},session=session)
   if not record: raise HTTPException(409,"A tarefa mudou. Atualize a página.")
   stamp=datetime.now(timezone.utc)
   change={"updated_at":stamp.isoformat(),"updated_by":user["id"]}
   if action=="start":
    if record.get("running_since") or record["status"] in {"concluida","arquivada"}: raise HTTPException(409,"Esta tarefa não pode ser iniciada.")
    await db.users.update_one({"id":user["id"]},{"$inc":{"timer_revision":1}},session=session)
    running=await db.product_records.find_one(scope(user,"technician_time",{"running_by":user["id"],"running_since":{"$ne":None}}),{"_id":0,"id":1},session=session)
    if running: raise HTTPException(409,"Pare a tarefa atual antes de iniciar outra.")
    change.update(running_since=stamp.isoformat(),running_by=user["id"],status="em_curso")
   else:
    if not record.get("running_since") or record.get("running_by")!=user["id"]: raise HTTPException(409,"Apenas o técnico que iniciou pode parar o cronómetro.")
    seconds=max(0,int((stamp-datetime.fromisoformat(record["running_since"])).total_seconds()))
    change.update(running_since=None,status="pausada",elapsed_seconds=record.get("elapsed_seconds",0)+seconds)
   return await db.product_records.find_one_and_update(q,{"$set":change,"$inc":{"revision":1}},projection={"_id":0},return_document=ReturnDocument.AFTER,session=session)
  return await transact(db,operation)

 @api.get("/workspace/reports/summary")
 async def reports(user=staff):
  enabled=enabled_features(user); q={"workshop_id":user["workshop_id"]}
  cards=[{"label":"Módulos ativos","value":len(enabled)}]
  for module,collection,label in [("customer_database","clients","Clientes"),("customer_database","vehicles","Viaturas"),
    ("service_orders","work_orders","Ordens de serviço"),("quotes","quotes","Orçamentos"),("inventory","products","Produtos"),
    ("appointments","appointments","Marcações")]:
   if module in enabled: cards.append({"label":label,"value":await db[collection].count_documents(q)})
  for module in SPECS:
   if module in enabled:
    cards.append({"label":next(x["name"] for x in FEATURES if x["id"]==module),"value":await db.product_records.count_documents(scope(user,module,{"status":{"$ne":"arquivada"}}))})
  return {"cards":cards,"generated_at":timestamp(),"description":"Contagens atuais dos módulos ativos. Não representam receita nem margem."}

