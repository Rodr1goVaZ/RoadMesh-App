import React, { useEffect, useState } from "react";
import { Text, View, Share } from "react-native";
import { router, useLocalSearchParams, Redirect, Href } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/core/auth/AuthProvider";
import { featureCatalog, hasFeature, FeatureId } from "@/src/core/auth/company-features";
import { api } from "@/src/core/http/api";
import { AreaPage, Panel, QueryState, Metrics, useAreaStyles } from "@/src/shared/layout/AreaUI";
import { Input } from "@/src/shared/ui/Input";
import { Button } from "@/src/shared/ui/Button";
import { Feedback } from "@/src/shared/ui/Feedback";
import { VehiclePicker } from "@/src/shared/pickers/VehiclePicker";

type Definition = { singular: string; states: string[]; vehicle: boolean; notice?: string; fields: {key: string; label: string; kind: string; required: boolean}[] };
type ProductRecord = { id: string; title: string; vehicle_id?: string; notes: string; values: Record<string,string>; revision: number; status: string; created_at: string; updated_at: string; elapsed_seconds?: number; running_since?: string; running_by?: string };
const stateNames: Record<string,string> = { aberta:"Aberta", revista:"Revista", concluida:"Concluída", arquivada:"Arquivado", planeada:"Planeada", em_curso:"Em curso", pausada:"Pausada", rascunho:"Rascunho", preparada:"Preparada", pedido:"Pedido", confirmado:"Confirmado", cancelado:"Cancelado", concluido:"Concluído", por_configurar:"Por configurar", em_validacao:"Em validação", por_validar:"Por validar", validada:"Validada", ativa:"Ativa", inativa:"Inativa", finalizada:"Finalizada" };
const label = (value: string) => stateNames[value] || value;
function RecordedTime({ record }: {record: ProductRecord}) {
 const s = useAreaStyles(); const [now,setNow] = useState(() => Date.now());
 useEffect(() => { if (!record.running_since) return; const timer = setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(timer); },[record.running_since]);
 const seconds=(record.elapsed_seconds || 0)+(record.running_since ? Math.max(0,Math.floor((now-Date.parse(record.running_since))/1000)) : 0);
 return <Text style={s.label}>Tempo registado: {Math.floor(seconds/3600)}h {Math.floor(seconds%3600/60)}m {seconds%60}s</Text>;
}
export function ProductScreen() {
 const params=useLocalSearchParams<{module:string;id?:string}>();
 return <ProductPage key={params.module+":"+(params.id||"list")}/>;
}
function ProductPage() {
 const params=useLocalSearchParams<{module:string;id?:string}>(); const module=params.module as FeatureId;
 const {user,support}=useAuth(); const company=support||user; const s=useAreaStyles(); const qc=useQueryClient();
 const feature=featureCatalog.find(f=>f.id===module); const permitted=!!feature && hasFeature(company,module);
 const base="/workspace/"+module; const editing=!!params.id; const creating=params.id==="new"; const report=module==="reports";
 const [page,setPage]=useState(0); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [success,setSuccess]=useState("");
 const [edits,setEdits]=useState<Partial<ProductRecord>>({});
 const definition=useQuery<Definition>({queryKey:["products",module,"definition"],queryFn:()=>api.get(base+"/definition"),enabled:permitted&&!report});
 const records=useQuery<{items:ProductRecord[];total:number}>({queryKey:["products",module,"list",page],queryFn:()=>api.get(base+"/records?skip="+(page*30)),enabled:permitted&&!report&&!editing});
 const detail=useQuery<ProductRecord>({queryKey:["products",module,params.id],queryFn:()=>api.get(base+"/records/"+params.id),enabled:permitted&&!report&&editing&&!creating});
 const summary=useQuery<{cards:{label:string;value:number}[];description:string;generated_at:string}>({queryKey:["products","reports"],queryFn:()=>api.get("/workspace/reports/summary"),enabled:permitted&&report});
 const title=edits.title ?? detail.data?.title ?? "";
 const vehicle=edits.vehicle_id ?? detail.data?.vehicle_id ?? "";
 const notes=edits.notes ?? detail.data?.notes ?? "";
 const values=edits.values ?? detail.data?.values ?? {};
 const status=edits.status ?? detail.data?.status ?? "";
 const setTitle=(v:string)=>setEdits(old=>({...old,title:v}));
 const setVehicle=(v:string)=>setEdits(old=>({...old,vehicle_id:v}));
 const setNotes=(v:string)=>setEdits(old=>({...old,notes:v}));
 const setStatus=(v:string)=>setEdits(old=>({...old,status:v}));
 const refresh=async()=>{await qc.invalidateQueries({queryKey:["products",module]}); await qc.invalidateQueries({queryKey:["module-dashboard"]});};
 const save=async()=>{
  if(!definition.data)return;
  if(title.trim().length<2 || (definition.data.vehicle&&!vehicle) || definition.data.fields.some(f=>f.required&&!values[f.key]?.trim())){setError("Preencha o título, a viatura e os campos obrigatórios.");return;}
  setBusy(true);setError("");setSuccess("");
  try{const body={title,vehicle_id:vehicle||null,notes,values,status:status||undefined,revision:detail.data?.revision||0};
   const record=creating ? await api.post(base+"/records",body) : await api.put(base+"/records/"+params.id,body);
   await refresh();setSuccess("Registo guardado."); if(creating)router.replace(("/(app)/produtos/"+module+"/"+record.id) as Href);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 const timer=async(action:string)=>{if(!detail.data)return;setBusy(true);setError("");try{await api.post(base+"/records/"+params.id+"/"+action,{revision:detail.data.revision});await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 if(!permitted)return <Redirect href="/(app)/inicio"/>;
 const form=definition.data; const record=detail.data;
 const frozen=module==="vehicle_reception"&&record?.status==="finalizada";
 return <AreaPage title={feature.name} testID={"product-"+module} onRefresh={()=>void refresh()} refreshing={false}>
  <Text style={s.title}>{editing?(creating?"Novo registo":record?.title||feature.name):feature.name}</Text>
  <Text style={s.hint}>{feature.description}</Text>
  {report ? <>
   <QueryState testID="reports-query" loading={summary.isPending} error={summary.error} retry={summary.refetch}/>
   {summary.data&&<><Metrics testID="product-reports" entries={summary.data.cards}/><Text style={s.hint}>{summary.data.description}</Text><Button title="Partilhar resumo" onPress={()=>void Share.share({message:summary.data!.cards.map(c=>c.label+": "+c.value).join("\n")})}/></>}
  </> : <>
   <QueryState testID="product-definition" loading={definition.isPending} error={definition.error} retry={definition.refetch}/>
   {form?.notice&&<Panel testID="product-notice" title="Disponibilidade"><Text style={s.hint}>{form.notice}</Text></Panel>}
   {!editing&&form&&<>
    <Button testID="product-new" title={"Criar "+form.singular.toLowerCase()} onPress={()=>router.push(("/(app)/produtos/"+module+"/new") as Href)}/>
    <QueryState testID="product-list" loading={records.isPending} error={records.error} retry={records.refetch}/>
    {records.data?.items.map(r=><Panel key={r.id} testID={"record-"+r.id} title={r.title}><Text style={s.hint}>{label(r.status)} · {new Date(r.updated_at).toLocaleString("pt-PT")}</Text><Text numberOfLines={2} style={s.hint}>{r.notes||Object.values(r.values).filter(Boolean).slice(0,2).join(" · ")}</Text>{module==="technician_time"&&<RecordedTime record={r}/>}<Button title="Abrir registo" variant="secondary" onPress={()=>router.push(("/(app)/produtos/"+module+"/"+r.id) as Href)}/></Panel>)}
    {records.data&&!records.data.total&&<Panel testID="product-empty" title="Ainda sem registos"><Text style={s.hint}>Crie o primeiro registo para começar a trabalhar neste produto.</Text></Panel>}
    {!!records.data?.total&&<View style={s.row}><Button title="Anterior" variant="ghost" disabled={page===0} onPress={()=>setPage(p=>p-1)}/><Text style={s.hint}>{page*30+1}–{Math.min((page+1)*30,records.data.total)} de {records.data.total}</Text><Button title="Seguinte" variant="ghost" disabled={(page+1)*30>=records.data.total} onPress={()=>setPage(p=>p+1)}/></View>}
   </>}
   {editing&&<><QueryState testID="product-detail" loading={!creating&&detail.isPending} error={detail.error} retry={detail.refetch}/>
    {form&&(creating||record)&&<Panel testID="product-form" title={form.singular}>
     <Input label="Título *" testID="product-title" value={title} editable={!busy&&!frozen} maxLength={160} onChangeText={setTitle}/>
     {form.vehicle&&!frozen&&<VehiclePicker value={vehicle} onChange={setVehicle}/>}
     {form.fields.map(f=><Input key={f.key} testID={"product-field-"+f.key} label={f.label+(f.required?" *":"")} value={values[f.key]||""} placeholder={f.kind==="datetime"?"2026-12-01 09:00":undefined} multiline={f.kind==="multiline"} maxLength={4000} keyboardType={f.kind==="number"?"decimal-pad":"default"} editable={!busy&&!frozen} onChangeText={v=>setEdits(old=>({...old,values:{...values,[f.key]:v}}))}/>)}
     <Input label="Notas" testID="product-notes" multiline value={notes} editable={!busy&&!frozen} maxLength={4000} onChangeText={setNotes}/>
     {!frozen&&<><Text style={s.label}>Estado</Text><View style={s.row}>{form.states.filter(v=>v!=="em_curso").map(v=><Button key={v} title={label(v)} variant={(status||form.states[0])===v?"primary":"secondary"} disabled={busy||!!record?.running_since} onPress={()=>setStatus(v)}/>)}</View></>}
     <Feedback testID="product-error" error message={error}/><Feedback testID="product-success" message={success}/>
     {frozen?<Text style={s.hint}>Receção finalizada e preservada. Registe correções numa nova receção.</Text>:<Button testID="product-save" title="Guardar" loading={busy} disabled={busy||!!record?.running_since} onPress={()=>void save()}/>}
     {record&&module==="technician_time"&&<><RecordedTime record={record}/><Button title={record.running_since?"Parar cronómetro":"Iniciar cronómetro"} disabled={busy||["concluida","arquivada"].includes(record.status)} onPress={()=>void timer(record.running_since?"stop":"start")}/></>}
     {record&&module==="vehicle_reception"&&vehicle&&<><Button title="Fotografias da viatura" variant="secondary" onPress={()=>router.push({pathname:"/(app)/fotos/[vehicleId]",params:{vehicleId:vehicle}})}/><Button title="Partilhar relatório de receção" variant="secondary" onPress={()=>void Share.share({message:[record.title,"Receção: "+record.id,"Data: "+record.created_at,...form.fields.map(f=>f.label+": "+(record.values[f.key]||"—")),record.notes].join("\n")})}/></>}
    </Panel>}
   </>}
  </>}
 </AreaPage>;
}

