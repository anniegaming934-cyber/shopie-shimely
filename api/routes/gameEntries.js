// api/routes/gameEntries.js
import express from "express";
import { connectDB } from "../config/db.js";
import GameEntry, {
  ALLOWED_TYPES,
  ALLOWED_METHODS,
} from "../models/GameEntry.js";
import GameEntryHistory from "../models/GameEntryHistory.js";
import Game from "../models/Game.js"; // for totalCoins updates
import { requireAuth } from "../middleware/auth.js"; // your JWT check

const router = express.Router();
router.use(requireAuth);
// Ensure DB for all routes here
router.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB connect (gameEntries) failed:", err);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// helpers
function toNumber(n, def = 0) {
  if (n === undefined || n === null || n === "") return def;
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
}

// Normalize any date input to "YYYY-MM-DD" string (or undefined)
function normalizeDateString(d) {
  if (!d) return undefined;
  if (typeof d === "string") {
    // already "YYYY-MM-DD" or ISO -> just slice first 10
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    const date = new Date(d);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
    return undefined;
  }
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

// For aggregations: prefer amountFinal, then amount, then 0
const COIN_AMOUNT_EXPR = {
  $ifNull: ["$amountFinal", { $ifNull: ["$amount", 0] }],
};

// ⭐ how much this entry changes totalCoins
function coinEffect(type, amountFinal) {
  const amt = Number(amountFinal);
  if (!Number.isFinite(amt) || amt <= 0) return 0;

  // freeplay + playedgame + deposit → minus
  // redeem                         → plus
  if (type === "deposit" || type === "freeplay" || type === "playedgame") {
    return -amt;
  }
  if (type === "redeem") return amt;
  return 0;
}

// ⭐ apply a delta to Game.totalCoins
async function applyGameDelta(gameName, delta) {
  try {
    const name = String(gameName || "").trim();
    if (!name) return;

    const game = await Game.findOne({ name });
    if (!game) return; // silently ignore if no game found

    const current = Number(game.totalCoins || 0);
    game.totalCoins = current + delta;
    await game.save();
  } catch (err) {
    console.error("⚠️ Failed to update Game.totalCoins:", err);
  }
}

// Small helper to record history
async function recordHistory(entry, action = "update") {
  try {
    if (!entry) return;

    await GameEntryHistory.create({
      entryId: entry._id,
      username: entry.username,
      createdBy: entry.createdBy,

      type: entry.type,
      method: entry.method,

      playerName: entry.playerName,
      playerTag: entry.playerTag,
      gameName: entry.gameName,

      amountBase: entry.amountBase,
      amount: entry.amount,
      bonusRate: entry.bonusRate,
      bonusAmount: entry.bonusAmount,
      amountFinal: entry.amountFinal,

      totalPaid: entry.totalPaid,
      totalCashout: entry.totalCashout,
      remainingPay: entry.remainingPay,
      extraMoney: entry.extraMoney,
      reduction: entry.reduction,

      isPending: entry.isPending,
      date: entry.date,
      note: entry.note,

      action,
      snapshot: entry.toObject(),
    });
  } catch (err) {
    console.error("⚠️ Failed to record GameEntry history:", err.message || err);
  }
}

// ⭐ Build monthly filter on createdAt (Date)
function buildMonthFilter(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return {};
  }

  const start = new Date(y, m - 1, 1); // inclusive
  const end = new Date(y, m, 1); // exclusive

  return { createdAt: { $gte: start, $lt: end } };
}

/**
 * 🔹 GET /api/game-entries
 * Optional query:
 *   username, type, method, gameName, playerTag, dateFrom, dateTo
 */
router.get("/", async (req, res) => {
  try {
    const { username, type, method, gameName, playerTag, dateFrom, dateTo } =
      req.query;

    const filter = {};

    if (username && String(username).trim()) {
      filter.username = String(username).trim();
    }

    if (type && ALLOWED_TYPES.includes(String(type))) {
      filter.type = String(type);
    }

    if (method && ALLOWED_METHODS.includes(String(method))) {
      filter.method = String(method);
    }

    if (gameName && String(gameName).trim()) {
      filter.gameName = String(gameName).trim();
    }

    if (playerTag && String(playerTag).trim()) {
      filter.playerTag = String(playerTag).trim();
    }

    // date range filter (stored as "YYYY-MM-DD" string)
    const from = normalizeDateString(dateFrom);
    const to = normalizeDateString(dateTo);

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const docs = await GameEntry.find(filter).sort({ createdAt: -1 }).lean();

    res.json(docs);
  } catch (err) {
    console.error("❌ GET /api/game-entries error:", err);
    res.status(500).json({ message: "Failed to load game entries" });
  }
});

/**
 * 🔹 POST /api/game-entries
 */
router.post("/", async (req, res) => {
  try {
    const {
      username,
      createdBy,
      type,
      method,
      playerName,
      playerTag,
      gameName,
      amountBase,
      amount,
      bonusRate,
      bonusAmount,
      amountFinal,
      date,
      note,
      totalPaid,
      totalCashout,
      remainingPay,
      extraMoney,
      reduction,
      isPending,
    } = req.body;

    if (!username || !String(username).trim()) {
      return res.status(400).json({ message: "username is required" });
    }
    if (!createdBy || !String(createdBy).trim()) {
      return res.status(400).json({ message: "createdBy is required" });
    }
    if (!type || !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }
    if (["deposit", "redeem"].includes(type)) {
      if (!method || !ALLOWED_METHODS.includes(method)) {
        return res.status(400).json({ message: "Invalid or missing method" });
      }
    }

    if (!gameName || !String(gameName).trim()) {
      return res.status(400).json({ message: "gameName is required" });
    }

    const base = toNumber(amountBase, NaN);
    if (!Number.isFinite(base) || base < 0) {
      return res.status(400).json({ message: "Invalid amountBase" });
    }

    const final = toNumber(amountFinal, NaN);
    if (!Number.isFinite(final) || final < 0) {
      return res.status(400).json({ message: "Invalid amountFinal" });
    }

    const cleanUsername = String(username).trim();
    const cleanCreatedBy = String(createdBy).trim();
    const cleanGameName = String(gameName).trim();
    const cleanPlayerTag = String(playerTag || "").trim();
    const numericReduction = toNumber(reduction, 0);
    const incomingAmount = amount != null ? toNumber(amount, 0) : final;
    const incomingTotalCashout = toNumber(totalCashout, 0);
    const incomingExtraMoney = toNumber(extraMoney, 0);

    /**
     * ⭐ SPECIAL CASE: Player Tag deposit with reduction
     * If this is a player-tag deposit AND we have a positive reduction,
     * merge into an existing deposit row for the same username + playerTag
     * instead of creating a brand new entry.
     *
     * New reduction will be recalculated as:
     *    reduction = max(totalCashout - totalDeposit, 0)
     */
    if (type === "deposit" && cleanPlayerTag && numericReduction > 0) {
      // Find the latest deposit entry for this user + tag
      const existing = await GameEntry.findOne({
        username: cleanUsername,
        playerTag: cleanPlayerTag,
        type: "deposit",
      }).sort({ createdAt: -1 });

      if (existing) {
        // Snapshot old values for coin delta
        const oldType = existing.type;
        const oldAmtFinal = Number(existing.amountFinal || 0);
        const oldGameName = existing.gameName;

        // Merge numeric fields (treat incoming values as additional deposit)
        existing.amountBase = toNumber(existing.amountBase, 0) + base;
        existing.amount = toNumber(existing.amount, 0) + incomingAmount;
        existing.amountFinal = oldAmtFinal + final;

        // For player-tag reduction, totalCashout represents the *original* cashout.
        // We normally DO NOT add incomingTotalCashout (because UI sends "pending").
        if (!existing.totalCashout || existing.totalCashout === 0) {
          // Only set once if it's empty.
          existing.totalCashout = incomingTotalCashout;
        }

        // Extra money accumulates
        existing.extraMoney =
          toNumber(existing.extraMoney, 0) + incomingExtraMoney;

        // Optional fields: only overwrite if new values are provided
        if (playerName !== undefined) {
          existing.playerName = playerName || "";
        }
        if (note !== undefined) {
          existing.note = note || "";
        }
        if (date !== undefined) {
          existing.date = normalizeDateString(date);
        }

        // 🔸 Recalculate reduction from merged totals:
        //     reduction = max(totalCashout - totalDeposit, 0)
        const totalDepositMerged = toNumber(existing.amountFinal, 0);
        const totalCashoutMerged = toNumber(existing.totalCashout, 0);
        const recalculatedReduction = totalCashoutMerged - totalDepositMerged;

        existing.reduction =
          recalculatedReduction > 0 ? recalculatedReduction : 0;

        // ⭐ If reduction reached 0 → auto clear pending flag
        existing.isPending = existing.reduction > 0;

        await existing.save();
        await recordHistory(existing, "update-merge");

        // ⭐ Adjust Game.totalCoins by the difference only
        const oldDelta = coinEffect(oldType, oldAmtFinal);
        const newDelta = coinEffect(existing.type, existing.amountFinal);
        const diffDelta = newDelta - oldDelta;
        if (diffDelta !== 0) {
          await applyGameDelta(existing.gameName, diffDelta);
        }

        return res.status(200).json(existing);
      }
    }

    // 🔹 DEFAULT: create new entry
    const doc = await GameEntry.create({
      username: cleanUsername,
      createdBy: cleanCreatedBy,
      type,
      method: method || undefined,

      playerName: playerName || "",
      playerTag: cleanPlayerTag,
      gameName: cleanGameName,

      amountBase: base,
      amount: incomingAmount,
      bonusRate: toNumber(bonusRate, 0),
      bonusAmount: toNumber(bonusAmount, 0),
      amountFinal: final,

      date: normalizeDateString(date),
      note: note || "",

      totalPaid: toNumber(totalPaid, 0),
      totalCashout: incomingTotalCashout,
      remainingPay: toNumber(remainingPay, 0),
      extraMoney: incomingExtraMoney,
      reduction: numericReduction,
      isPending: Boolean(isPending),
    });

    await recordHistory(doc, "create");

    // ⭐ Update Game.totalCoins using type and amountFinal
    const delta = coinEffect(doc.type, doc.amountFinal);
    if (delta !== 0) {
      await applyGameDelta(doc.gameName, delta);
    }

    res.status(201).json(doc);
  } catch (err) {
    console.error("❌ POST /api/game-entries error:", err);
    res.status(500).json({ message: "Failed to create game entry" });
  }
});

/**
 * 🔹 GET /api/game-entries/pending
 * Shows only the LATEST pending row per (username + playerTag):
 *   - redeem (our tag) with isPending = true
 *   - deposit (player tag) with reduction > 0
 */
/**
 * 🔹 GET /api/game-entries/pending
 * For each (username + playerTag), show a single "current" pending record:
 *   - If there's a deposit for that tag → use its `reduction` as pending.
 *   - Else if there's a redeem with isPending = true → use its remainingPay.
 *   - If computed pending <= 0 → do NOT include it.
 *
 * This means: once a player-tag deposit has reduction = 0, that tag will
 * no longer appear in this list (even if old redeem rows had remainingPay).
 */
router.get("/pending", async (req, res) => {
  try {
    const { username } = req.query;

    const match = {
      $or: [{ type: "redeem" }, { type: "deposit" }],
    };

    if (username && String(username).trim()) {
      match.username = String(username).trim();
    }

    // Get ALL redeem + deposit rows (for that user, if provided)
    // Oldest → newest so "last" is the latest
    const docs = await GameEntry.find(match).sort({ createdAt: 1 }).lean();

    // Map of key -> { lastRedeem, lastDeposit }
    const tagMap = new Map();

    for (const e of docs) {
      const key = `${e.username}::${e.playerTag || ""}`;
      let group = tagMap.get(key);
      if (!group) {
        group = { lastRedeem: null, lastDeposit: null };
        tagMap.set(key, group);
      }

      if (e.type === "redeem") {
        // keep the latest redeem (regardless of isPending; we'll check later)
        group.lastRedeem = e;
      } else if (e.type === "deposit") {
        // keep the latest deposit (even if reduction = 0)
        group.lastDeposit = e;
      }
    }

    const result = [];

    for (const [, group] of tagMap.entries()) {
      const { lastRedeem, lastDeposit } = group;

      let pendingReduction = 0;
      let pendingRedeem = 0;
      let totalPending = 0;
      let baseDoc = null;

      // 1️⃣ If there is a deposit, it is the source of truth
      if (lastDeposit) {
        pendingReduction = toNumber(lastDeposit.reduction, 0);
        totalPending = pendingReduction;
        baseDoc = lastDeposit;
      } else if (lastRedeem && lastRedeem.isPending) {
        // 2️⃣ If no deposit, fall back to redeem pending
        const totalPaid = toNumber(lastRedeem.totalPaid ?? 0, 0);
        const totalCashout = toNumber(
          lastRedeem.totalCashout ?? lastRedeem.amountFinal ?? 0,
          0
        );

        pendingRedeem = toNumber(
          lastRedeem.remainingPay ?? totalCashout - totalPaid,
          0
        );

        totalPending = pendingRedeem;
        baseDoc = lastRedeem;
      }

      // If nothing pending for this tag → skip
      if (!baseDoc || totalPending <= 0) {
        continue;
      }

      // Build response row (remainingPay carries the combined "current" pending)
      const totalPaid = toNumber(baseDoc.totalPaid ?? 0, 0);
      const totalCashout = toNumber(
        baseDoc.totalCashout ?? baseDoc.amountFinal ?? 0,
        0
      );

      result.push({
        _id: String(baseDoc._id),
        type: baseDoc.type,
        username: baseDoc.username,
        playerName: baseDoc.playerName || "",
        playerTag: baseDoc.playerTag || "",
        gameName: baseDoc.gameName,
        method: baseDoc.method || "",
        totalPaid,
        totalCashout,
        remainingPay: totalPending, // ← this is what the frontend uses
        reduction: pendingReduction,
        date:
          baseDoc.date ||
          (baseDoc.createdAt
            ? new Date(baseDoc.createdAt).toISOString().slice(0, 10)
            : undefined),
        createdAt: baseDoc.createdAt
          ? new Date(baseDoc.createdAt).toISOString()
          : undefined,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error("❌ GET /api/game-entries/pending error:", err);
    return res
      .status(500)
      .json({ message: "Failed to load pending game entries" });
  }
});

/**
 * 🔹 GET /api/game-entries/pending-by-tag
 * Unified/latest pending for a tag:
 *   - if latest is deposit with reduction > 0 → use that reduction
 *   - else if latest is redeem with isPending = true → use remainingPay
 */
router.get("/pending-by-tag", async (req, res) => {
  try {
    const { playerTag, username } = req.query;

    const cleanTag = String(playerTag || "").trim();
    const cleanUser = String(username || "").trim();

    if (!cleanTag || !cleanUser) {
      return res
        .status(400)
        .json({ message: "playerTag and username are required" });
    }

    const match = {
      username: cleanUser,
      playerTag: cleanTag,
      $or: [
        { type: "redeem", isPending: true },
        { type: "deposit", reduction: { $gt: 0 } },
      ],
    };

    const docs = await GameEntry.find(match).sort({ createdAt: 1 }).lean();
    if (!docs.length) {
      return res.status(404).json({ message: "No pending for this tag" });
    }

    let lastRedeem = null;
    let lastDeposit = null;

    for (const e of docs) {
      if (e.type === "deposit" && toNumber(e.reduction, 0) > 0) {
        lastDeposit = e;
      } else if (e.type === "redeem" && e.isPending) {
        lastRedeem = e;
      }
    }

    let totalPending = 0;
    let pendingRedeem = 0;
    let pendingReduction = 0;
    let source = null;

    if (lastDeposit) {
      pendingReduction = toNumber(lastDeposit.reduction, 0);
      totalPending = pendingReduction;
      source = lastDeposit;
    } else if (lastRedeem) {
      const cashout = toNumber(lastRedeem.totalCashout ?? 0, 0);
      const paid = toNumber(lastRedeem.totalPaid ?? 0, 0);
      pendingRedeem = toNumber(lastRedeem.remainingPay ?? cashout - paid, 0);
      totalPending = pendingRedeem;
      source = lastRedeem;
    }

    if (!source || totalPending <= 0) {
      return res.status(404).json({ message: "No pending for this tag" });
    }

    return res.json({
      playerTag: cleanTag,
      totalPending, // latest pending for this tag
      pendingRedeem, // from redeem (if any)
      pendingReduction, // from latest reduction (if any)
      totalCashout: toNumber(source.totalCashout ?? 0, 0),
      totalPaid: toNumber(source.totalPaid ?? 0, 0),
    });
  } catch (err) {
    console.error("❌ GET /api/game-entries/pending-by-tag error:", err);
    return res
      .status(500)
      .json({ message: "Failed to load pending info for this tag" });
  }
});

/**
 * 🔹 PATCH /api/game-entries/:id/clear-pending
 * Clear any pending amount for this entry:
 *  - redeem  → remainingPay = 0, isPending = false
 *  - deposit → reduction = 0 (and isPending = false just in case)
 */
router.patch("/:id/clear-pending", async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await GameEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ message: "Game entry not found" });
    }

    // We only clear pending fields, we do NOT touch amountFinal
    // so Game.totalCoins does NOT change here.
    if (entry.type === "redeem") {
      // our-tag redeem pending
      entry.remainingPay = 0;
      entry.isPending = false;
    } else if (entry.type === "deposit") {
      // player-tag reduction pending
      entry.reduction = 0;
      entry.isPending = false;
    } else {
      // fallback: clear both fields for any other type, just in case
      entry.remainingPay = 0;
      entry.reduction = 0;
      entry.isPending = false;
    }

    await entry.save();
    await recordHistory(entry, "clear-pending");

    return res.json(entry);
  } catch (err) {
    console.error("❌ PATCH /api/game-entries/:id/clear-pending error:", err);
    return res
      .status(500)
      .json({ message: "Failed to clear pending for this entry" });
  }
});

/**
 * 🔹 GET /api/game-entries/summary
 * Global totals + deposit revenue split by payment method
 * Supports:
 *   - /api/game-entries/summary
 *   - /api/game-entries/summary?year=2024&month=8
 *   - /api/game-entries/summary?year=2024&month=8&day=15
 */
/**
 * 🔹 GET /api/game-entries/summary
 *
 * Supports:
 *   - /api/game-entries/summary?period=day|week|month
 *   - /api/game-entries/summary?period=day|week|month&username=...
 *   - /api/game-entries/summary?year=2024&month=8
 *   - /api/game-entries/summary?year=2024&month=8&day=15
 *   - (optionally combined with username=...)
 */
router.get("/summary", async (req, res) => {
  try {
    const { username, period } = req.query;

    // Base match object used for all aggregations
    const match = {};

    // Optional username filter
    if (username && String(username).trim()) {
      match.username = String(username).trim();
    }

    // ─────────────────────────────────────────────
    // 1) Date filtering
    //    a) If period=day|week|month → use createdAt range
    //    b) Else, fallback to legacy year/month/day on "date" string
    // ─────────────────────────────────────────────
    const now = new Date();

    if (period === "day" || period === "week" || period === "month") {
      let start;
      let end;

      if (period === "day") {
        // Today 00:00 → tomorrow 00:00
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 1);
      } else if (period === "week") {
        // This week (Mon–Sun) based on server local time
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const dayOfWeek = start.getDay(); // 0=Sun,1=Mon,...6=Sat
        const diffToMonday = (dayOfWeek + 6) % 7; // convert so Mon=0
        start.setDate(start.getDate() - diffToMonday);

        end = new Date(start);
        end.setDate(start.getDate() + 7);
      } else {
        // period === "month" → first day of this month to first of next
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      match.createdAt = { $gte: start, $lt: end };
    } else {
      // Legacy: year/month/day query on the "date" string field (YYYY-MM-DD)
      const year = parseInt(req.query.year, 10);
      const month = parseInt(req.query.month, 10); // 1–12
      const day = req.query.day ? parseInt(req.query.day, 10) : NaN; // 1–31 (optional)

      let dateFilter = {};
      if (
        !Number.isNaN(year) &&
        !Number.isNaN(month) &&
        month >= 1 &&
        month <= 12
      ) {
        const mm = String(month).padStart(2, "0");

        if (!Number.isNaN(day) && day >= 1 && day <= 31) {
          // Specific day: YYYY-MM-DD
          const dd = String(day).padStart(2, "0");
          const targetDate = `${year}-${mm}-${dd}`;
          dateFilter = { date: targetDate };
        } else {
          // Entire month: date starts with "YYYY-MM"
          const prefix = `${year}-${mm}`;
          dateFilter = { date: { $regex: `^${prefix}` } };
        }
      }

      Object.assign(match, dateFilter);
    }

    console.log("SUMMARY query:", req.query);
    console.log("SUMMARY match:", JSON.stringify(match));

    // ─────────────────────────────────────────────
    // 2) Totals by type (coins)
    // ─────────────────────────────────────────────
    const byType = await GameEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$type",
          totalAmount: {
            $sum: {
              $cond: [
                // deposit uses amountFinal
                { $eq: ["$type", "deposit"] },
                { $ifNull: ["$amountFinal", 0] },

                // others (freeplay, redeem, playedgame, etc.) use amountFinal/amount
                {
                  $ifNull: ["$amountFinal", { $ifNull: ["$amount", 0] }],
                },
              ],
            },
          },
        },
      },
    ]);

    let totalFreeplay = 0;
    let totalPlayedGame = 0;
    let totalDeposit = 0;
    let totalRedeem = 0;

    for (const t of byType) {
      if (t._id === "freeplay") totalFreeplay = t.totalAmount || 0;
      if (t._id === "playedgame") totalPlayedGame = t.totalAmount || 0;
      if (t._id === "deposit") totalDeposit = t.totalAmount || 0;
      if (t._id === "redeem") totalRedeem = t.totalAmount || 0;
    }

    // redeem adds, freeplay + playedgame + deposit subtract
    const totalCoin =
      totalRedeem - (totalFreeplay + totalPlayedGame + totalDeposit);

    // ─────────────────────────────────────────────
    // 3) Pending (UNIFIED, same logic as /pending)
    //    - For each (username + playerTag):
    //       * if latest deposit has reduction > 0 → use that as pending
    //       * else if latest redeem isPending → use its remainingPay (or cashout - paid)
    //    In addition to totals, we also build pendingEntries[]
    // ─────────────────────────────────────────────
    let totalPendingRemainingPay = 0;
    let totalPendingCount = 0;
    const pendingEntries = [];

    const pendingMatch = {
      ...match,
      $or: [{ type: "redeem" }, { type: "deposit" }],
    };

    const pendingDocs = await GameEntry.find(pendingMatch)
      .sort({ createdAt: 1 })
      .lean();

    const tagMap = new Map();

    for (const e of pendingDocs) {
      const key = `${e.username}::${e.playerTag || ""}`;
      let group = tagMap.get(key);
      if (!group) {
        group = { lastRedeem: null, lastDeposit: null };
        tagMap.set(key, group);
      }

      if (e.type === "redeem") {
        group.lastRedeem = e;
      } else if (e.type === "deposit") {
        group.lastDeposit = e;
      }
    }

    for (const [, group] of tagMap.entries()) {
      const { lastRedeem, lastDeposit } = group;

      let pendingReduction = 0;
      let pendingRedeem = 0;
      let totalPending = 0;
      let baseDoc = null;

      // 1️⃣ If there is a deposit, it is the source of truth
      if (lastDeposit) {
        pendingReduction = toNumber(lastDeposit.reduction, 0);
        totalPending = pendingReduction;
        baseDoc = lastDeposit;
      } else if (lastRedeem && lastRedeem.isPending) {
        // 2️⃣ If no deposit, fall back to redeem pending
        const totalPaid = toNumber(lastRedeem.totalPaid ?? 0, 0);
        const totalCashout = toNumber(
          lastRedeem.totalCashout ?? lastRedeem.amountFinal ?? 0,
          0
        );

        pendingRedeem = toNumber(
          lastRedeem.remainingPay ?? totalCashout - totalPaid,
          0
        );

        totalPending = pendingRedeem;
        baseDoc = lastRedeem;
      }

      if (baseDoc && totalPending > 0) {
        totalPendingRemainingPay += totalPending;
        totalPendingCount += 1;

        const totalPaid = toNumber(baseDoc.totalPaid ?? 0, 0);
        const totalCashout = toNumber(
          baseDoc.totalCashout ?? baseDoc.amountFinal ?? 0,
          0
        );

        pendingEntries.push({
          _id: String(baseDoc._id),
          type: baseDoc.type,
          username: baseDoc.username,
          playerName: baseDoc.playerName || "",
          playerTag: baseDoc.playerTag || "",
          gameName: baseDoc.gameName,
          method: baseDoc.method || "",
          totalPaid,
          totalCashout,
          remainingPay: totalPending,
          reduction: pendingReduction,
          date:
            baseDoc.date ||
            (baseDoc.createdAt
              ? new Date(baseDoc.createdAt).toISOString().slice(0, 10)
              : undefined),
          createdAt: baseDoc.createdAt
            ? new Date(baseDoc.createdAt).toISOString()
            : undefined,
        });
      }
    }

    // ─────────────────────────────────────────────
    // 4) Reduction + extra money
    // ─────────────────────────────────────────────
    const [extraAgg] = await GameEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalReduction: { $sum: { $ifNull: ["$reduction", 0] } },
          totalExtraMoney: { $sum: { $ifNull: ["$extraMoney", 0] } },
        },
      },
    ]);

    // ─────────────────────────────────────────────
    // 5) Real-money revenue per deposit method
    // ─────────────────────────────────────────────
    const depositByMethod = await GameEntry.aggregate([
      {
        $match: {
          type: "deposit",
          ...match,
        },
      },
      {
        $group: {
          _id: "$method",
          totalAmount: { $sum: { $ifNull: ["$amountBase", 0] } },
        },
      },
    ]);

    let revenueCashApp = 0,
      revenuePayPal = 0,
      revenueChime = 0,
      revenueVenmo = 0;

    for (const row of depositByMethod) {
      if (row._id === "cashapp") revenueCashApp = row.totalAmount || 0;
      if (row._id === "paypal") revenuePayPal = row.totalAmount || 0;
      if (row._id === "chime") revenueChime = row.totalAmount || 0;
      if (row._id === "venmo") revenueVenmo = row.totalAmount || 0;
    }

    const totalRevenue =
      revenueCashApp + revenuePayPal + revenueChime + revenueVenmo;

    // ─────────────────────────────────────────────
    // 6) Response
    // ─────────────────────────────────────────────
    res.json({
      totalFreeplay,
      totalPlayedGame,
      totalDeposit,
      totalRedeem,
      totalCoin,
      totalPendingRemainingPay,
      totalPendingCount,
      pendingEntries, // <-- list of pending items (same shape as /pending)
      totalReduction: extraAgg?.totalReduction || 0,
      totalExtraMoney: extraAgg?.totalExtraMoney || 0,
      revenueCashApp,
      revenuePayPal,
      revenueChime,
      revenueVenmo,
      totalRevenue,
    });
  } catch (err) {
    console.error("❌ GET /api/game-entries/summary error:", err);
    res.status(500).json({ message: "Failed to load summary" });
  }
});

/**
 * 🔹 GET /api/game-entries/summary-by-game
 *    → supports ?year=YYYY&month=MM (monthly per-game summary)
 */
router.get("/summary-by-game", async (req, res) => {
  try {
    const { username, year, month } = req.query;

    const match = {};
    if (username && String(username).trim()) {
      match.username = String(username).trim();
    }

    const createdAtFilter = buildMonthFilter(year, month);

    console.log("📊 /summary-by-game params:", req.query);
    console.log("📊 /summary-by-game createdAtFilter:", createdAtFilter);

    const agg = await GameEntry.aggregate([
      {
        $match: {
          ...match,
          ...createdAtFilter,
          gameName: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$gameName",
          totalFreeplay: {
            $sum: {
              $cond: [{ $eq: ["$type", "freeplay"] }, COIN_AMOUNT_EXPR, 0],
            },
          },
          totalPlayedGame: {
            $sum: {
              $cond: [{ $eq: ["$type", "playedgame"] }, COIN_AMOUNT_EXPR, 0],
            },
          },
          totalDeposit: {
            $sum: {
              $cond: [{ $eq: ["$type", "deposit"] }, COIN_AMOUNT_EXPR, 0],
            },
          },
          totalRedeem: {
            $sum: {
              $cond: [{ $eq: ["$type", "redeem"] }, COIN_AMOUNT_EXPR, 0],
            },
          },
        },
      },
      {
        $addFields: {
          // per-game net coins: redeem − (freeplay + playedgame + deposit)
          totalCoins: {
            $subtract: [
              "$totalRedeem",
              {
                $add: ["$totalFreeplay", "$totalPlayedGame", "$totalDeposit"],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          gameName: "$_id",
          totalFreeplay: 1,
          totalPlayedGame: 1,
          totalDeposit: 1,
          totalRedeem: 1,
          totalCoins: 1,
        },
      },
      { $sort: { gameName: 1 } },
    ]);

    res.json(agg);
  } catch (err) {
    console.error("❌ GET /api/game-entries/summary-by-game error:", err);
    res.status(500).json({ message: "Failed to load per-game entry summary" });
  }
});

/**
 * 🔹 GET /api/game-entries/:id/history
 */
router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params;

    const docs = await GameEntryHistory.find({ entryId: id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(docs);
  } catch (err) {
    console.error("❌ GET /api/game-entries/:id/history error:", err);
    res.status(500).json({ message: "Failed to load entry history" });
  }
});

/**
 * 🔹 PUT /api/game-entries/:id
 * (also keeps Game.totalCoins correct)
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await GameEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ message: "Game entry not found" });
    }

    const payload = req.body;

    // snapshot old values for coin delta
    const oldType = entry.type;
    const oldAmtFinal = entry.amountFinal;
    const oldGameName = entry.gameName;

    if (payload.type && !ALLOWED_TYPES.includes(payload.type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    if (payload.method && !ALLOWED_METHODS.includes(payload.method)) {
      return res.status(400).json({ message: "Invalid method" });
    }

    if (payload.amountBase !== undefined) {
      const base = toNumber(payload.amountBase, NaN);
      if (!Number.isFinite(base) || base < 0) {
        return res.status(400).json({ message: "Invalid amountBase" });
      }
      entry.amountBase = base;
    }

    if (payload.amountFinal !== undefined) {
      const final = toNumber(payload.amountFinal, NaN);
      if (!Number.isFinite(final) || final < 0) {
        return res.status(400).json({ message: "Invalid amountFinal" });
      }
      entry.amountFinal = final;
    }

    const simpleFields = [
      "username",
      "createdBy",
      "type",
      "method",
      "playerName",
      "playerTag",
      "gameName",
      "amount",
      "bonusRate",
      "bonusAmount",
      "note",
      "totalPaid",
      "totalCashout",
      "remainingPay",
      "extraMoney",
      "reduction",
      "isPending",
    ];

    for (const field of simpleFields) {
      if (payload[field] !== undefined) {
        if (
          [
            "amount",
            "bonusRate",
            "bonusAmount",
            "totalPaid",
            "totalCashout",
            "remainingPay",
            "extraMoney",
            "reduction",
          ].includes(field)
        ) {
          entry[field] = toNumber(payload[field], 0);
        } else {
          entry[field] = payload[field];
        }
      }
    }

    if (payload.date !== undefined) {
      entry.date = normalizeDateString(payload.date);
    }

    await entry.save();
    await recordHistory(entry, "update");

    // ⭐ adjust Game.totalCoins for update
    // 1) remove old effect
    const oldDelta = coinEffect(oldType, oldAmtFinal);
    if (oldDelta !== 0) {
      await applyGameDelta(oldGameName, -oldDelta);
    }
    // 2) apply new effect
    const newDelta = coinEffect(entry.type, entry.amountFinal);
    if (newDelta !== 0) {
      await applyGameDelta(entry.gameName, newDelta);
    }

    res.json(entry);
  } catch (err) {
    console.error("❌ PUT /api/game-entries/:id error:", err);
    res.status(500).json({ message: "Failed to update game entry" });
  }
});

/**
 * 🔹 DELETE /api/game-entries/:id
 * (also reverses its effect from Game.totalCoins)
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await GameEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ message: "Game entry not found" });
    }

    // ⭐ reverse its effect from totalCoins before delete
    const delta = coinEffect(entry.type, entry.amountFinal);
    if (delta !== 0) {
      await applyGameDelta(entry.gameName, -delta);
    }

    await recordHistory(entry, "delete");
    await entry.deleteOne();

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ DELETE /api/game-entries/:id error:", err);
    res.status(500).json({ message: "Failed to delete game entry" });
  }
});

export default router;
