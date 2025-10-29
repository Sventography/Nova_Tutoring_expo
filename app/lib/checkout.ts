export type ShippingInfo = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

export type DraftItem = {
  id: string;
  name: string;
  cashPrice: number;
  type?: "tangible" | "virtual" | string;
};

export type CheckoutDraft = {
  item: DraftItem;
  /** present for tangible, absent for virtual */
  shipping?: ShippingInfo;
};

let _draft: CheckoutDraft | null = null;

export function setCheckoutDraft(d: CheckoutDraft) { _draft = d; }
export function getCheckoutDraft(): CheckoutDraft | null { return _draft; }
export function clearCheckoutDraft() { _draft = null; }
