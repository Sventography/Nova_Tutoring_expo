export function canonId(id: string) {
  return id
    .toLowerCase()
    .replace(/[:]/g, "")
    .replace(/[_\s]/g, "-");
}
