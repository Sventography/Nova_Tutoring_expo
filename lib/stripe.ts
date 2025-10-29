type AnyFn = (...args: any[]) => any;
const __noop: AnyFn = async (..._args: any[]) => undefined;
const api: Record<string, AnyFn> = new Proxy({}, { get: () => __noop });
export default api;
export const useStripe: AnyFn = __noop;
