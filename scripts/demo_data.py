"""Idempotent, synthetic demo data created through the real application API."""
from datetime import datetime, timedelta
from io import BytesIO
from zoneinfo import ZoneInfo

PASSWORD = "RoadMeshTeste2026!"
ADMIN_EMAIL = "admin@roadmesh-demo.pt"
STAFF_EMAIL = "oficina@roadmesh-demo.pt"
CLIENT_EMAIL = "cliente@roadmesh-demo.pt"


def prepare_demo(base_url, database):
    import bcrypt
    import requests
    from PIL import Image, ImageDraw

    # This database is the runner's private local replica set, never the .env DB.
    account = database.users.find_one({"email": ADMIN_EMAIL, "role": "admin", "workshop_id": None})
    if not account:
        raise RuntimeError("A conta de administração de demonstração não foi criada")
    database.users.update_one({"_id": account["_id"]}, {"$set": {
        "password_hash": bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode(),
        "password_change_required": False, "is_active": True,
    }, "$inc": {"session_version": 1}})
    admin, staff, client = requests.Session(), requests.Session(), requests.Session()

    def call(session, method, path, data=None, files=None):
        response = session.request(method, base_url + "/api" + path, json=data, files=files, timeout=30)
        if not response.ok:
            raise RuntimeError(f"Demonstração: {method} {path}: {response.status_code} {response.text[:300]}")
        return response.json()

    def login(session, role, email, password):
        auth = call(session, "POST", f"/auth/{role}/login", {"email": email, "password": password})
        session.headers["Authorization"] = "Bearer " + auth["access_token"]
        return auth

    def activate(session, role, credentials):
        login(session, role, credentials["email"], credentials["temporary_password"])
        auth = call(session, "POST", "/auth/change-password", {"current_password": credentials["temporary_password"], "new_password": PASSWORD})
        session.headers["Authorization"] = "Bearer " + auth["access_token"]

    login(admin, "admin", ADMIN_EMAIL, PASSWORD)
    workshops = call(admin, "GET", "/admin/workshops")
    workshop = next((w for w in workshops if w.get("manager_email") == STAFF_EMAIL), None)
    if not workshop:
        provision = call(admin, "POST", "/admin/workshops", {"name": "Oficina RoadMesh · Demonstração", "nif": "", "address": "Dados fictícios para testes", "manager_name": "Equipa de Testes", "manager_email": STAFF_EMAIL})
        workshop = provision["workshop"]
        credentials = provision["credentials"]
    else:
        credentials = call(admin, "POST", f"/admin/users/{workshop['manager_id']}/reset-password")["credentials"]
    activate(staff, "staff", credentials)
    client_names = ["João Silva (Demonstração)", "Ana Costa (Demonstração)", "Pedro Alves (Demonstração)"]
    saved_clients = call(staff, "GET", "/clients")
    clients = []
    for index, name in enumerate(client_names):
        current = next((c for c in saved_clients if c["name"] == name), None)
        if not current:
            current = call(staff, "POST", "/clients", {"name": name, "email": CLIENT_EMAIL if index == 0 else f"cliente{index}@roadmesh-demo.pt", "phone": "", "address": "Morada fictícia — demonstração"})
        clients.append(current)
    saved_vehicles = call(staff, "GET", "/vehicles")
    vehicles = []
    for owner, plate, make, model in zip(clients, ["AA-12-BB", "22-CD-44", "55-CD-99"], ["BMW", "Volkswagen", "Audi"], ["320d", "Golf", "A4"]):
        current = next((v for v in saved_vehicles if v["license_plate"] == plate), None)
        vehicles.append(current or call(staff, "POST", "/vehicles", {"client_id": owner["id"], "license_plate": plate, "make": make, "model": model, "year": 2020, "fuel": "Diesel", "mileage": 85000}))
    saved_products = call(staff, "GET", "/products")
    products = []
    for reference, name, price, category in [("DEMO-OL", "Óleo de motor 5W30", 42.5, "Óleos"), ("DEMO-PA", "Pastilhas de travão", 85, "Travões"), ("DEMO-FI", "Filtro de óleo", 12.5, "Filtros")]:
        current = next((p for p in saved_products if p["reference"] == reference), None)
        products.append(current or call(staff, "POST", "/products", {"reference": reference, "name": name, "category": category, "stock": 20, "min_stock": 5, "sale_price": price, "purchase_price": round(price * .6, 2), "supplier": "Fornecedor de demonstração"}))
    orders = call(staff, "GET", "/work-orders")
    for index, (status, description) in enumerate([("diagnostico", "DEMO: Revisão e travões"), ("aguardando_pecas", "DEMO: Substituição de filtro"), ("concluido", "DEMO: Revisão concluída")]):
        order = next((o for o in orders if o.get("complaint") == description), None)
        if not order:
            order = call(staff, "POST", "/work-orders", {"client_id": clients[index]["id"], "vehicle_id": vehicles[index]["id"], "status": status, "mechanic": "Mecânico de demonstração", "complaint": description, "items": [{"item_type": "mao_de_obra", "description": "Mão de obra", "quantity": 2, "unit_price": 45}, {"item_type": "peca", "description": products[index]["name"], "quantity": 1, "unit_price": products[index]["sale_price"], "product_id": products[index]["id"]}]})
        if status == "concluido":
            invoices = call(staff, "GET", "/invoices")
            if not any(i["work_order_id"] == order["id"] for i in invoices):
                call(staff, "POST", "/invoices", {"work_order_id": order["id"], "document_type": "fatura"})
    quotes = call(staff, "GET", "/quotes")
    if not any(q.get("notes") == "DEMO: Orçamento para experimentar o fluxo" for q in quotes):
        call(staff, "POST", "/quotes", {"client_id": clients[0]["id"], "vehicle_id": vehicles[0]["id"], "notes": "DEMO: Orçamento para experimentar o fluxo", "items": [{"item_type": "mao_de_obra", "description": "Diagnóstico eletrónico", "quantity": 1, "unit_price": 40}, {"item_type": "peca", "description": products[2]["name"], "quantity": 1, "unit_price": products[2]["sale_price"], "product_id": products[2]["id"]}]})
    orders = call(staff, "GET", "/purchase-orders")
    if not any(o.get("notes") == "DEMO: Rececionar para testar o stock" for o in orders):
        call(staff, "POST", "/purchase-orders", {"supplier": "Fornecedor de demonstração", "notes": "DEMO: Rececionar para testar o stock", "items": [{"product_id": products[0]["id"], "quantity": 5, "unit_price": 25.5}]})
    photos = call(staff, "GET", f"/photos?vehicle_id={vehicles[0]['id']}")
    if not any(p.get("caption") == "Imagem ilustrativa de demonstração" for p in photos):
        image = Image.new("RGB", (900, 520), "#EEF3FA")
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((150, 190, 750, 360), radius=35, fill="#7A1E2B")
        draw.polygon([(270, 190), (360, 110), (570, 110), (660, 190)], fill="#7A1E2B")
        draw.ellipse((220, 310, 330, 420), fill="#222222")
        draw.ellipse((580, 310, 690, 420), fill="#222222")
        draw.text((250, 455), "ROADMESH - IMAGEM DE DEMONSTRACAO", fill="#222222")
        data = BytesIO(); image.save(data, "JPEG")
        media = call(staff, "POST", "/media", files={"file": ("demonstracao.jpg", data.getvalue(), "image/jpeg")})
        photo = call(staff, "POST", "/photos", {"vehicle_id": vehicles[0]["id"], "zone": "exterior_360", "media_id": media["id"], "caption": "Imagem ilustrativa de demonstração"})
        call(staff, "POST", "/damages", {"vehicle_id": vehicles[0]["id"], "photo_id": photo["id"], "media_id": media["id"], "category": "risco", "severity": "baixo", "location": "Porta dianteira", "description": "Registo fictício para experimentar o histórico de danos"})
    portal_user = call(staff, "GET", f"/clients/{clients[0]['id']}/account")
    if not portal_user:
        credentials = call(staff, "POST", f"/clients/{clients[0]['id']}/account", {"name": "João Silva (Demonstração)", "email": CLIENT_EMAIL})["credentials"]
    else:
        credentials = call(admin, "POST", f"/admin/users/{portal_user['id']}/reset-password")["credentials"]
    activate(client, "client", credentials)
    appointments = call(client, "GET", "/portal/appointments")
    if not any(a.get("description") == "DEMO: Revisão anual" for a in appointments):
        future = datetime.now(ZoneInfo("Europe/Lisbon")) + timedelta(days=3)
        call(client, "POST", "/portal/appointments", {"vehicle_id": vehicles[0]["id"], "scheduled_local": future.strftime("%Y-%m-%dT%H:%M"), "description": "DEMO: Revisão anual", "contact": "Contacto de demonstração"})
    admin.close(); staff.close(); client.close()
