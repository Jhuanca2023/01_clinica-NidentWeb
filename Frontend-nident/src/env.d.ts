/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    csrf: string;
    token?: string;
  }
  interface SessionData {
    token: string;
    refreshToken: string;
    csrf: string;
    challenge: {
      type: "verify" | "setup";
      token: string;
      qr?: string;
      secret?: string;
    };
  }
}
