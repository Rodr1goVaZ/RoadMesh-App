"""Expanded product catalogue exercised against an isolated local API/database."""
from datetime import datetime, timezone
from uuid import uuid4
import pytest
from conftest import API, checked
from roadmesh.core.module_catalog import FEATURE_IDS
from roadmesh.modules.products.routes import SPECS

@pytest.fixture
def product_company(workshop_factory):
 return workshop_factory("TEST_Product_Catalog")

def configure(admin, company, modules):
 checked(admin.put(API+f"/admin/workshops/{company['user']['workshop_id']}",json={
  "name":"TEST_Product_Catalog","manager_name":"Manager","manager_email":company["email"],
  "subscription_version":1,"enabled_modules":modules,"base_monthly_fee":"1.25",
  "module_prices":{m:"2.10" for m in FEATURE_IDS}}))
 return checked(admin.get(API+f"/admin/workshops/{company['user']['workshop_id']}"))

def payload(module, vehicle):
 spec=SPECS[module]
 values={}
 for key,label,kind,required in spec["fields"]:
  values[key] = "2099-12-01 09:00" if key=="start" else "2099-12-01 10:00" if key=="end" else "10" if kind=="number" else "Registo de teste"
 return {"title":"Registo de teste","vehicle_id":vehicle["id"] if spec["vehicle"] else None,"values":values}

def test_full_catalogue_prices_presets_and_permissions(platform_session, product_company):
 c=product_company; staff=c["session"]
 assert staff.get(API+"/workspace/digital_inspections/records").status_code==403
 configured=configure(platform_session,c,list(FEATURE_IDS))
 assert float(configured["monthly_fee"])==34.85
 preset=checked(platform_session.post(API+"/admin/module-presets",json={"name":"Todos produtos","enabled_modules":list(FEATURE_IDS),"revision":0}),201)
 assert len(preset["enabled_modules"])==16
 assert len(checked(platform_session.get(API+"/admin/module-catalog"))["modules"])==16
 for module in SPECS:
  configure(platform_session,c,[module])
  assert staff.get(API+f"/workspace/{module}/records").status_code==200
  for other in SPECS:
   if other!=module: assert staff.get(API+f"/workspace/{other}/records").status_code==403
 configure(platform_session,c,[])
 assert staff.get(API+"/workspace/reports/summary").status_code==403

@pytest.mark.parametrize("module",list(SPECS))
def test_records_revision_validation_and_tenant_isolation(platform_session,product_company,workshop_factory,module):
 c=product_company; staff=c["session"]
 vehicle=checked(staff.get(API+"/vehicles"))[0]
 configure(platform_session,c,[module])
 body=payload(module,vehicle)
 created=checked(staff.post(API+f"/workspace/{module}/records",json=body),201)
 url=API+f"/workspace/{module}/records/{created['id']}"
 assert checked(staff.get(url))["values"]
 assert checked(staff.get(API+f"/workspace/{module}/records"))["total"]==1
 other=workshop_factory("TEST_Product_Other")
 configure(platform_session,other,[module])
 assert other["session"].get(url).status_code==404
 updated=checked(staff.put(url,json={**body,"revision":1,"notes":"Revisto"}))
 assert updated["revision"]==2
 assert staff.put(url,json={**body,"revision":1}).status_code==409
 assert staff.post(API+f"/workspace/{module}/records",json={**body,"values":{**body["values"],"unknown":"x"}}).status_code==422
 if SPECS[module]["vehicle"]:
  assert staff.post(API+f"/workspace/{module}/records",json={**body,"vehicle_id":str(uuid4())}).status_code==422

def test_timekeeper_and_reception_finalization(platform_session,product_company):
 c=product_company; staff=c["session"]; v=checked(staff.get(API+"/vehicles"))[0]
 configure(platform_session,c,["technician_time","vehicle_reception"])
 body=payload("technician_time",v)
 first=checked(staff.post(API+"/workspace/technician_time/records",json=body),201)
 second=checked(staff.post(API+"/workspace/technician_time/records",json=body),201)
 url=API+"/workspace/technician_time/records/"+first["id"]
 started=checked(staff.post(url+"/start",json={"revision":1}))
 assert started["running_since"] and started["revision"]==2
 assert staff.post(API+"/workspace/technician_time/records/"+second["id"]+"/start",json={"revision":1}).status_code==409
 stopped=checked(staff.post(url+"/stop",json={"revision":2}))
 assert stopped["running_since"] is None and stopped["elapsed_seconds"]>=0
 reception=payload("vehicle_reception",v)
 saved=checked(staff.post(API+"/workspace/vehicle_reception/records",json={**reception,"status":"finalizada"}),201)
 assert staff.put(API+"/workspace/vehicle_reception/records/"+saved["id"],json={**reception,"revision":1}).status_code==409

def test_reservations_conflict_only_on_confirmed_resource(platform_session,product_company):
 c=product_company;staff=c["session"];v=checked(staff.get(API+"/vehicles"))[0]
 configure(platform_session,c,["online_bookings"])
 body=payload("online_bookings",v)
 checked(staff.post(API+"/workspace/online_bookings/records",json={**body,"status":"confirmado"}),201)
 assert staff.post(API+"/workspace/online_bookings/records",json={**body,"status":"confirmado"}).status_code==409
 checked(staff.post(API+"/workspace/online_bookings/records",json=body),201)
 checked(staff.post(API+"/workspace/online_bookings/records",json={**body,"status":"confirmado","values":{**body["values"],"resource":"Outro posto"}}),201)

def test_quotes_conversion_requires_service_orders(platform_session,product_company):
 c=product_company;staff=c["session"];v=checked(staff.get(API+"/vehicles"))[0]
 configure(platform_session,c,["quotes"])
 quote=checked(staff.post(API+"/quotes",json={"client_id":v["client_id"],"vehicle_id":v["id"],"items":[{"item_type":"mao_de_obra","description":"Teste","quantity":1,"unit_price":10}]}),201)
 assert staff.post(API+f"/quotes/{quote['id']}/convert").status_code==403

def test_payments_and_reports_work_without_enabling_other_products(platform_session,product_company):
 c=product_company;staff=c["session"]
 configure(platform_session,c,["payments"])
 invoices=checked(staff.get(API+"/invoices"))
 assert staff.post(API+"/invoices",json={"work_order_id":str(uuid4()),"document_type":"fatura"}).status_code==403
 assert staff.get(API+"/finance/summary").status_code==200
 if invoices:
  assert staff.get(API+f"/invoices/{invoices[0]['id']}/balance").status_code==200
 configure(platform_session,c,["reports"])
 summary=checked(staff.get(API+"/workspace/reports/summary"))
 assert summary["cards"]==[{"label":"Módulos ativos","value":1}]
 assert staff.get(API+"/vehicles").status_code==403


