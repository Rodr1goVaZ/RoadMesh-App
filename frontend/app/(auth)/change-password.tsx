import React, { useState } from "react";
import { Text } from "react-native";
import { Redirect, router } from "expo-router";
import { homeFor, useAuth } from "@/src/auth";
import { AreaPage, areaStyles } from "@/src/components/AreaUI";
import { Input } from "@/src/components/Input";
import { Button } from "@/src/components/Button";
import { Feedback } from "@/src/components/Feedback";
export default function ChangePassword() {
  const { user, loading: authLoading, changePassword, logout } = useAuth();
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  if (authLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  const submit = async () => {
    setError("");
    if (next.length < 12 || next !== confirm) { setError("Use pelo menos 12 caracteres e confirme a mesma palavra-passe."); return; }
    setLoading(true);
    try { router.replace(homeFor(await changePassword(current, next))); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  return <AreaPage title="Alterar palavra-passe" testID="password-change-screen" back={!user.password_change_required}>
    <Text testID="password-change-notice" style={areaStyles.hint}>{user.password_change_required ? "Antes de continuar, substitua a palavra-passe temporária por uma palavra-passe só sua." : "A alteração termina as outras sessões desta conta."}</Text>
    <Input testID="password-current" label="Palavra-passe atual" secureTextEntry value={current} onChangeText={setCurrent} />
    <Input testID="password-new" label="Nova palavra-passe (mínimo 12 caracteres)" secureTextEntry value={next} onChangeText={setNext} />
    <Input testID="password-confirm" label="Confirmar nova palavra-passe" secureTextEntry value={confirm} onChangeText={setConfirm} />
    <Feedback testID="password-change-error" message={error} error />
    <Button testID="password-change-submit" title="Guardar e continuar" loading={loading} onPress={submit} />
    <Button testID="password-change-logout" title="Terminar sessão" variant="ghost" onPress={() => logout()} />
  </AreaPage>;
}