-- APENAS LEITURA. Executar antes da migração 003, e guardar resultados em privado.
-- Nenhum registo é eliminado ou fundido. Os IDs identificam conflitos a rever.
WITH normalized AS (
 SELECT id,workshop_id,NULLIF(regexp_replace(upper(COALESCE(nif,'')),'[^A-Z0-9]','','g'),'') AS key
 FROM roadmesh.clients
)
SELECT 'clients.nif' AS conflict,workshop_id,array_agg(id ORDER BY id) AS record_ids,count(*) AS records
FROM normalized WHERE key IS NOT NULL GROUP BY workshop_id,key HAVING count(*)>1;

WITH normalized AS (
 SELECT id,workshop_id,jsonb_build_array(
  lower(regexp_replace(btrim(name),'\s+',' ','g')),lower(regexp_replace(btrim(COALESCE(nif,'')),'\s+',' ','g')),
  lower(regexp_replace(btrim(COALESCE(phone,'')),'\s+',' ','g')),lower(regexp_replace(btrim(COALESCE(email,'')),'\s+',' ','g')),
  lower(regexp_replace(btrim(COALESCE(address,'')),'\s+',' ','g'))) AS key FROM roadmesh.clients
)
SELECT 'clients.identity' AS conflict,workshop_id,array_agg(id ORDER BY id) AS record_ids,count(*) AS records
FROM normalized GROUP BY workshop_id,key HAVING count(*)>1;

WITH normalized AS (
 SELECT 'vehicles.plate' AS conflict,id,workshop_id,NULLIF(regexp_replace(upper(license_plate),'[^A-Z0-9]','','g'),'') AS key FROM roadmesh.vehicles
 UNION ALL SELECT 'vehicles.vin',id,workshop_id,NULLIF(regexp_replace(upper(COALESCE(vin,'')),'[^A-Z0-9]','','g'),'') FROM roadmesh.vehicles
 UNION ALL SELECT 'products.reference',id,workshop_id,NULLIF(upper(regexp_replace(btrim(reference),'\s+',' ','g')),'') FROM roadmesh.products
 UNION ALL SELECT 'products.barcode',id,workshop_id,NULLIF(regexp_replace(upper(COALESCE(metadata->>'barcode','')),'[^A-Z0-9]','','g'),'') FROM roadmesh.products
)
SELECT conflict,workshop_id,array_agg(id ORDER BY id) AS record_ids,count(*) AS records
FROM normalized WHERE key IS NOT NULL GROUP BY conflict,workshop_id,key HAVING count(*)>1;
