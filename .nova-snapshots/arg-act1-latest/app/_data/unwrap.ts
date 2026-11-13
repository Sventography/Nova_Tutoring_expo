export function unwrap<T = any>(m: any): T {
  return (m && (m.default || m)) as T;
}
