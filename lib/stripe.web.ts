import React from "react";
export const StripeProvider = ({ children }: any) => { return children; };
export const CardField = (_props: any) => null;
export const CardForm = (_props: any) => null;
export function useStripe() {
  return {
    confirmPayment: async (_cs: string, _p: any) => ({ error: undefined }),
    initPaymentSheet: async (_p: any) => ({ error: undefined }),
    presentPaymentSheet: async (_p?: any) => ({ error: undefined }),
    createPaymentMethod: async (_p: any) => ({ error: undefined }),
    handleNextAction: async (_cs: string) => ({ error: undefined })
  };
}
export default { StripeProvider, CardField, CardForm, useStripe };
