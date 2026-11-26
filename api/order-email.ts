import type { VercelRequest, VercelResponse } from "@vercel/node";

// Client-supplied order details are not payment evidence. Receipt delivery must
// originate from an authenticated, verified order on the fulfillment backend.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(410).json({
    ok: false,
    error: "This checkout no longer sends order emails. Open the Shop to view available checkout options.",
  });
}
