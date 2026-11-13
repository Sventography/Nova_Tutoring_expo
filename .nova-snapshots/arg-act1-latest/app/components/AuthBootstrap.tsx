import React, { useEffect } from "react";
import { AUTH_MODE } from "../config/auth-mode";

// If you're in local mode, do nothing. In remote mode, you can add your ping/session restore here.
export default function AuthBootstrap() {
  useEffect(() => {
    if (AUTH_MODE === 'remote') {
      // TODO: ping backend / restore remote session here
      // e.g., await api.auth.restore();
    }
  }, []);
  return null;
}
