"use client";

import { useEffect, useState } from "react";
import { CSRF_COOKIE_NAME, CSRF_FIELD_NAME } from "@/lib/csrf-constants";

function readCookie(name: string) {
  const match = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

export function CsrfField() {
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(readCookie(CSRF_COOKIE_NAME));
  }, []);

  return <input type="hidden" name={CSRF_FIELD_NAME} value={token} />;
}
