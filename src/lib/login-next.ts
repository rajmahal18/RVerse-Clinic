export function safeLoginNext(value: string | null | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") && !/[\\\s\u0000-\u001f]/.test(value)
    ? value
    : "/dashboard";
}
