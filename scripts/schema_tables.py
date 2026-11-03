"""Exact table inventories shared by private backup and restore tools."""
BASE = 'workshops clients users vehicles products appointments quotes work_orders work_order_items quote_items purchase_orders purchase_order_items stock_movements media photos damages invoices counters revoked_sessions login_limits support_sessions admin_support_audit'.split()
BUSINESS = 'suppliers financial_movements order_receipts reorder_needs password_resets'.split()
STAND = 'stand_inventory stand_leads stand_sales'.split()
PLATFORM = 'platform_service_periods platform_service_movements'.split()


def tables_for_version(version):
    prefix = 'RoadMesh PostgreSQL schema version '
    inventories = {prefix + str(n) + '; private server access': tables for n, tables in (
        (2, BASE), (3, BASE + BUSINESS), (5, BASE + BUSINESS + STAND),
        (6, BASE + BUSINESS + STAND + PLATFORM))}
    if version not in inventories:
        raise ValueError('Unsupported RoadMesh snapshot schema')
    return inventories[version]
