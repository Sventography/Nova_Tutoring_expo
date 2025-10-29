export async function purchasePackage(id:string){ return { ok:true, id }; }
export async function createCheckoutSession(_id:string){ return { checkoutUrl: undefined }; }
export default { purchasePackage, createCheckoutSession };
