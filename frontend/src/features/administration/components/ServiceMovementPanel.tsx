import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/src/core/http/api';
import { Button } from '@/src/shared/ui/Button';
import { Input } from '@/src/shared/ui/Input';
import { Feedback } from '@/src/shared/ui/Feedback';
import { ServiceRecord } from '../admin-analytics';
import { ServiceMovement as Movement, movementNames as names, movementPayload } from '../service-movements';
export function ServiceMovementPanel({ companyId, year, month, onRecord }: { companyId: string; year: number; month: number; onRecord: (record: ServiceRecord) => void }) {
  const url = `/admin/workshops/${companyId}/service-months/${year}/${month}/movements`;
  const qc = useQueryClient();
  const query = useQuery<{ movements: Movement[]; legacy_unimported: boolean }>({ queryKey: ['admin-service-movements', companyId, year, month], queryFn: () => api.get(url) });
  const [kind, setKind] = useState<'payment' | 'assistance'>('payment');
  const [reverse, setReverse] = useState<Movement | null>(null);
  const [amount, setAmount] = useState(''); const [date, setDate] = useState('');
  const [reference, setReference] = useState(''); const [method, setMethod] = useState(''); const [note, setNote] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const pending = useRef(false);
  const request = useRef({ fingerprint: '', key: '' });
  const save = async () => {
    if (pending.current) return;
    setError('');
    try {
      const payload = movementPayload({ kind, amount, date, reference, method, note }, reverse);
      const fingerprint = JSON.stringify(payload);
      if (request.current.fingerprint !== fingerprint) request.current = { fingerprint, key: `service-${Date.now()}-${Math.random().toString(36).slice(2)}` };
      pending.current = true; setBusy(true);
      const result = await api.post(url, { ...payload, idempotency_key: request.current.key });
      if (result.record) onRecord(result.record);
      await Promise.all(['admin-service-movements', 'admin-analytics', 'admin-workshop', 'admin-workshops'].map(key => qc.invalidateQueries({ queryKey: [key] })));
      setAmount(''); setReference(''); setMethod(''); setNote(''); setReverse(null); request.current = { fingerprint: '', key: '' };
    } catch (e: any) { setError(e.message); }
    finally { pending.current = false; setBusy(false); }
  };
  const reversed = new Set(query.data?.movements.map(entry => entry.reverses_id).filter(Boolean));
  return <View style={{ gap: 14 }} testID="service-movement-panel">
    <Text style={{ fontWeight: '700', fontSize: 18 }}>Histórico de pagamentos e assistência</Text>
    {query.isLoading && <Text>A consultar movimentos…</Text>}
    {query.isError && <><Feedback testID="service-ledger-load-error" error message="Não foi possível consultar o histórico." /><Button title="Tentar novamente" onPress={() => void query.refetch()} /></>}
    {query.data?.legacy_unimported && <Text>Existem totais anteriores. Serão preservados como saldos de abertura, com data original desconhecida, no próximo registo.</Text>}
    {query.data?.movements.map(entry => <View key={entry.id} style={{ gap: 5, borderTopWidth: 1, borderColor: '#DDD', paddingTop: 12 }}>
      <Text selectable>{names[entry.kind] || entry.kind} · {entry.amount} {entry.bucket === 'hours_used' ? 'h' : '€'}</Text>
      <Text selectable>{entry.occurred_on?.split('-').reverse().join('/') || 'Data original desconhecida'} · {entry.reference || 'Sem referência anterior'} {entry.method && `· ${entry.method}`}</Text>
      <Text selectable>{entry.note}</Text><Text>Registado em {new Date(entry.created_at).toLocaleString('pt-PT')}</Text>
      {(['payment', 'assistance'].includes(entry.kind) || (entry.kind === 'opening' && entry.bucket !== 'billed')) && !reversed.has(entry.id) && <Button variant="secondary" title="Estornar este movimento" disabled={busy} onPress={() => { setReverse(entry); setError(''); }} />}
      {reversed.has(entry.id) && <Text>Estornado · o original foi preservado</Text>}
    </View>)}
    <Text style={{ fontWeight: '700' }}>{reverse ? `Estornar ${reverse.amount} ${reverse.bucket === 'hours_used' ? 'h' : '€'}` : 'Novo movimento'}</Text>
    {reverse ? <Button title="Cancelar estorno" variant="ghost" disabled={busy} onPress={() => setReverse(null)} /> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <Button title={kind === 'payment' ? 'Pagamento selecionado' : 'Pagamento'} style={{ flex: 1, minWidth: 120 }} variant="secondary" disabled={busy} onPress={() => setKind('payment')} />
      <Button title={kind === 'assistance' ? 'Assistência selecionada' : 'Assistência'} style={{ flex: 1, minWidth: 120 }} variant="secondary" disabled={busy} onPress={() => setKind('assistance')} />
    </View>}
    {!reverse && <Input label={kind === 'payment' ? 'Valor recebido (€)' : 'Horas utilizadas'} value={amount} onChangeText={setAmount} editable={!busy} keyboardType="decimal-pad" />}
    <Input label="Data do movimento (DD/MM/AAAA)" value={date} onChangeText={setDate} editable={!busy} maxLength={10} />
    <Input label="Referência / identificação do atendimento" value={reference} onChangeText={setReference} editable={!busy} maxLength={200} />
    {!reverse && kind === 'payment' && <Input label="Método do pagamento" placeholder="Ex.: transferência bancária" value={method} onChangeText={setMethod} editable={!busy} maxLength={100} />}
    <Input label="Descrição / motivo do estorno" value={note} onChangeText={setNote} editable={!busy} multiline maxLength={1000} />
    <Feedback testID="service-ledger-save-error" error message={error} /><Button title={reverse ? 'Confirmar estorno' : 'Registar movimento'} loading={busy} disabled={query.isLoading || query.isError} onPress={save} />
  </View>;
}
