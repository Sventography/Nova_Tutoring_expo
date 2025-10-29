import React, { createContext, useContext } from "react";

type AnyValue = any;

const defaultValue: AnyValue = {};

const C = createContext<AnyValue>(defaultValue);

export const Provider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: AnyValue;
}) => <C.Provider value={value ?? defaultValue}>{children}</C.Provider>;

export function useContextSafe() {
  return useContext(C);
}
