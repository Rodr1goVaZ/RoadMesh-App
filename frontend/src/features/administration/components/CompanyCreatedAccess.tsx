import React, { createContext, useContext, useState } from 'react';
import { Clipboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/src/core/auth/AuthProvider';
import { Button } from '@/src/shared/ui/Button';
import { Feedback } from '@/src/shared/ui/Feedback';
import { colors as c } from '@/src/shared/theme/legacy';

type CreatedAccess = { email: string; temporary_password: string };
type Notice = { ownerId: string; company: string; credentials: CreatedAccess };
const AccessContext = createContext<((credentials: CreatedAccess, company: string) => void) | null>(null);
export function useCompanyCreatedAccess() {
  const show = useContext(AccessContext);
  if (!show) throw new Error('CompanyCreatedAccessProvider em falta.');
  return show;
}

export function CompanyCreatedAccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(); const [notice, setNotice] = useState<Notice | null>(null);
  const show = (credentials: CreatedAccess, company: string) => { if (user) setNotice({ ownerId: user.id, company, credentials: { email: credentials.email, temporary_password: credentials.temporary_password } }); };
  const current = notice?.ownerId === user?.id ? notice : null;
  return <AccessContext.Provider value={show}>{children}{current && <CreatedAccessDialog key={current.credentials.email} notice={current} onClose={() => setNotice(null)} />}</AccessContext.Provider>;
}
function CreatedAccessDialog({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const [copied, setCopied] = useState(false); const [copying, setCopying] = useState(false); const [error, setError] = useState('');
  const copy = async () => {
    if (copying) return; setCopying(true); setCopied(false); setError('');
    try {
      if (Platform.OS === 'web' && globalThis.navigator?.clipboard?.writeText) await globalThis.navigator.clipboard.writeText(notice.credentials.temporary_password);
      else if ((Clipboard.setString as (value: string) => unknown)(notice.credentials.temporary_password) === false) throw new Error();
      setCopied(true);
    } catch { setError('Não foi possível copiar. Pode selecionar a palavra-passe e copiá-la manualmente.'); }
    finally { setCopying(false); }
  };
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}><View style={s.overlay}><View accessibilityViewIsModal testID="company-created-access-modal" style={s.dialog}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
    <View style={s.header}><View style={s.success}><Ionicons name="checkmark-circle-outline" size={28} color="#24754B" /></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar acessos criados" testID="company-created-access-dismiss" onPress={onClose} style={s.close}><Ionicons name="close-outline" size={24} color={c.muted} /></Pressable></View>
    <Text accessibilityRole="header" style={s.title}>Acessos criados</Text><Text style={s.company}>{notice.company}</Text>
    <View style={s.field}><Text style={s.label}>Email de acesso</Text><Text selectable testID="credentials-email" style={s.email}>{notice.credentials.email}</Text></View>
    <View style={s.field}><Text style={s.label}>Palavra-passe</Text><View style={s.passwordBox}><Text selectable testID="credentials-password" style={s.password}>{notice.credentials.temporary_password}</Text></View></View>
    <Button testID="company-copy-password" title={copied ? 'Palavra-passe copiada' : 'Copiar palavra-passe'} variant="secondary" loading={copying} onPress={copy} />
    {copied && <Text accessibilityLiveRegion="polite" style={s.copied}>Copiado.</Text>}
    <Feedback testID="company-copy-password-error" error message={error} />
    <Button testID="credentials-close" title="Concluir" onPress={onClose} />
  </ScrollView></View></View></Modal>;
}
const s = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,24,35,.45)', padding: 20 }, dialog: { width: '100%', maxWidth: 500, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden' }, content: { padding: 28, gap: 18 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, success: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EAF6EF', alignItems: 'center', justifyContent: 'center' }, close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 25, fontWeight: '700', color: c.onSurface }, company: { fontSize: 14, color: c.muted, marginTop: -8 }, field: { gap: 8 }, label: { fontSize: 12, color: c.muted, fontWeight: '600' }, email: { fontSize: 16, color: c.onSurface, flexShrink: 1 }, passwordBox: { backgroundColor: '#F8F5F4', borderRadius: 12, padding: 16 }, password: { fontSize: 19, fontWeight: '600', color: c.onSurface, flexShrink: 1 }, copied: { fontSize: 12, color: '#24754B', textAlign: 'center' } });
