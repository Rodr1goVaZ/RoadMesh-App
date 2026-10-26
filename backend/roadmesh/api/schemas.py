"""Request models shared by the workshop API routes."""
from typing import List, Literal, Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

class ClientIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=1,max_length=200)
    nif: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class VehicleIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    client_id: str
    license_plate: str = Field(min_length=1,max_length=30)
    make: str
    model: str
    year: Optional[int] = None
    vin: Optional[str] = None
    fuel: Optional[str] = None
    mileage: Optional[int] = None

class WorkOrderItemIn(BaseModel):
    item_type: Literal["peca", "mao_de_obra"]
    description: str = Field(default="", max_length=1000)
    quantity: float = Field(default=1, gt=0, le=1000000, allow_inf_nan=False)
    unit_price: float = Field(default=0, ge=0, allow_inf_nan=False)
    vat_rate: float = Field(default=23, ge=0, le=100, allow_inf_nan=False)
    product_id: Optional[str] = None

class WorkOrderIn(BaseModel):
    client_id: str
    vehicle_id: str
    mechanic: Optional[str] = None
    complaint: Optional[str] = None
    notes: Optional[str] = None
    mileage_in: Optional[int] = None
    status: Literal["entrada", "diagnostico", "aguardando_pecas", "concluido"] = "entrada"
    items: List[WorkOrderItemIn] = []

class ProductIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    reference: str = Field(min_length=1, max_length=150)
    name: str = Field(min_length=1, max_length=200)
    barcode: Optional[str] = None
    restock_enabled: bool = False
    supplier: Optional[str] = None
    category: Optional[str] = None
    stock: float = Field(default=0, ge=0, le=1000000000, allow_inf_nan=False)
    min_stock: float = Field(default=0, ge=0, allow_inf_nan=False)
    profit_margin: Optional[Decimal] = Field(default=None,ge=0,lt=100,max_digits=4,decimal_places=2)
    purchase_price: float = Field(default=0, ge=0, allow_inf_nan=False)
    sale_price: float = Field(default=0, ge=0, allow_inf_nan=False)
    vat_rate: float = Field(default=23, ge=0, le=100, allow_inf_nan=False)

class ProductUpdateIn(ProductIn):
    stock: Optional[float] = Field(default=None, ge=0, le=1000000000, allow_inf_nan=False)

class OrderItemIn(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0, allow_inf_nan=False)

class PurchaseOrderIn(BaseModel):
    idempotency_key: str | None = Field(default=None,min_length=8,max_length=150)
    model_config = ConfigDict(str_strip_whitespace=True)
    supplier: str = Field(min_length=1,max_length=200)
    items: List[OrderItemIn] = Field(min_length=1)
    notes: Optional[str] = None

class QuoteIn(BaseModel):
    client_id: str
    vehicle_id: str
    items: List[WorkOrderItemIn]
    notes: Optional[str] = None

class InvoiceIn(BaseModel):
    work_order_id: str
    document_type: Literal["orcamento", "fatura", "fatura_recibo"]

class PhotoIn(BaseModel):
    vehicle_id: str
    work_order_id: Optional[str] = None
    zone: str  # exterior_360 | interior | pneus_rodas | pintura | chassis_inferior
    media_id: str
    caption: Optional[str] = None

class DamageIn(BaseModel):
    vehicle_id: str
    photo_id: Optional[str] = None
    category: Literal["ferrugem", "dano_estrutural", "fuga", "desgaste_pneu", "risco", "amolgadela", "outro"]
    severity: Literal["baixo", "medio", "critico"]
    description: str = Field(default="", max_length=1000)
    location: str = Field(default="", max_length=150)
    media_id: str
