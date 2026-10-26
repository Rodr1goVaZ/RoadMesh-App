import React from "react";
import { Input } from "@/src/shared/ui/Input";

export type ClientFieldsValue = { name: string; nif: string; phone: string; email: string; address: string };

/** The same customer fields are used by Oficina and Stand. Saving stays with the caller. */
export function ClientFields({ value, onChange, testIDPrefix = "client", disabled = false }: {
  value: ClientFieldsValue;
  onChange: (value: ClientFieldsValue) => void;
  testIDPrefix?: string;
  disabled?: boolean;
}) {
  const set = (key: keyof ClientFieldsValue, text: string) => onChange({ ...value, [key]: text });
  return <>
    <Input label="Nome *" value={value.name} onChangeText={text => set("name", text)} editable={!disabled} testID={`${testIDPrefix}-name`} />
    <Input label="NIF" value={value.nif} onChangeText={text => set("nif", text)} editable={!disabled} keyboardType="number-pad" testID={`${testIDPrefix}-nif`} />
    <Input label="Telefone" value={value.phone} onChangeText={text => set("phone", text)} editable={!disabled} keyboardType="phone-pad" testID={`${testIDPrefix}-phone`} />
    <Input label="Email" value={value.email} onChangeText={text => set("email", text)} editable={!disabled} keyboardType="email-address" autoCapitalize="none" testID={`${testIDPrefix}-email`} />
    <Input label="Morada" value={value.address} onChangeText={text => set("address", text)} editable={!disabled} multiline numberOfLines={2} testID={`${testIDPrefix}-address`} />
  </>;
}
