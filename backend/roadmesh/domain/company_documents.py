"""Public company identity allowed in workshop documents."""
DOCUMENT_COMPANY_FIELDS = (
    'id', 'name', 'legal_name', 'nif', 'address', 'country', 'district',
    'municipality', 'postal_code', 'email', 'phone', 'mobile', 'logo_media_id',
)


def document_company(company):
    return {key: company[key] for key in DOCUMENT_COMPANY_FIELDS if key in (company or {})}
