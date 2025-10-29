export type ToastOpts = { message:string }; export const showToast = ({ message }:ToastOpts)=>console.log("[toast]", message); export default showToast;
