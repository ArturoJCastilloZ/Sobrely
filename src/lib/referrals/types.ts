/**
 * Tipos del programa de referidos (Subfase 8.6).
 *
 * Modelo: cada usuario tiene un código propio. Cuando un nuevo usuario aplica
 * ese código y luego realiza una compra pagada, el referente recibe un crédito
 * configurable (`NEXT_PUBLIC_REFERRAL_CREDIT_MXN`). El crédito se ACUMULA en un
 * ledger (`referral_credits`); no se paga ni se descuenta automáticamente en
 * esta subfase.
 */

import type { Currency } from "@/lib/billing/types";

/** Estado del ciclo de vida de un referido. */
export type ReferralStatus = "pending" | "qualified" | "credited" | "cancelled";

/** Una fila de `referrals` (vínculo referente↔referido). */
export interface Referral {
  readonly id: string;
  readonly referredUserId: string;
  readonly status: ReferralStatus;
  readonly creditAmount: number;
  readonly createdAt: string;
}

/** Resumen del panel de referidos del usuario. */
export interface ReferralSummary {
  readonly code: string;
  readonly shareUrl: string;
  readonly referrals: readonly Referral[];
  readonly creditBalance: number;
  readonly currency: Currency;
}
