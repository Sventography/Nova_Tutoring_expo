let fn: ((title: string, pts: number) => void) | null = null

export function setToastRef(cb: (title: string, pts: number) => void) {
  fn = cb
}

export function showToast(title: string, pts: number) {
  if (fn) fn(title, pts)
}
