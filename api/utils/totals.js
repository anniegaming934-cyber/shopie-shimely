// api/utils/totals.js
import Payment from "../models/Payment.js";
import { connectDB } from "../config/db.js";
import { validMethods } from "./numbers.js";

export async function computeTotals() {
  await connectDB();

  const totals = { cashapp: 0, paypal: 0, chime: 0 };

  // also get txType to know cashin/cashout
  const payments = await Payment.find(
    {},
    { amount: 1, method: 1, txType: 1 }
  ).lean();

  for (const p of payments) {
    if (!validMethods.includes(p.method)) continue;

    const type = p.txType === "cashout" ? "cashout" : "cashin";
    if (type === "cashin") {
      totals[p.method] += p.amount;
    } else {
      totals[p.method] -= p.amount;
    }
  }

  return totals;
}
