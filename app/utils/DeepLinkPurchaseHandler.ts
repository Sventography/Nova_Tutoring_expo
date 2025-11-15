import { usePurchases } from "../context/PurchasesContext";
import { canonNs } from "../utils/canonId";

// ...
const { grant } = usePurchases();
// assume you have purchased.kind ('theme'|'cursor') and purchased.id
await grant(canonNs(purchased.kind, purchased.id));

