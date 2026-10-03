// app/context/DailyDealContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AppState,
} from "react-native";

import {
  catalog,
  type CatalogItem,
} from "../_lib/catalog";
import {
  usePurchases,
} from "./PurchasesContext";

const DAILY_DEAL_DISCOUNT_PERCENT = 25;

export type DailyDeal = {
  dateKey: string;
  itemId: string;
  title: string;
  discountPercent: number;
  originalCoinPrice: number;
  discountedCoinPrice: number;
};

type DailyDealContextValue = {
  ready: boolean;
  deal: DailyDeal | null;
};

const DailyDealContext =
  createContext<DailyDealContextValue | null>(null);

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function isEligibleDailyDealItem(
  item: CatalogItem
): boolean {
  if (
    item.category !== "theme" &&
    item.category !== "cursor"
  ) {
    return false;
  }

  const price = Number(
    item.priceCoins || 0
  );

  return (
    Number.isFinite(price) &&
    price > 0
  );
}

function buildDailyDeal(
  dateKey: string,
  isOwned: (id: string) => boolean
): DailyDeal | null {
  const eligible = catalog
    .filter(isEligibleDailyDealItem)
    .sort((a, b) =>
      a.id.localeCompare(b.id)
    );

  const unowned =
    eligible.filter(
      (item) =>
        !isOwned(item.id)
    );

  const candidates =
    unowned.length
      ? unowned
      : eligible;

  if (!candidates.length) {
    return null;
  }

  const index =
    hashString(
      `nova-global-daily-deal:${dateKey}`
    ) % candidates.length;

  const item = candidates[index];

  const originalCoinPrice =
    Math.trunc(
      Number(item.priceCoins || 0)
    );

  return {
    dateKey,
    itemId: item.id,
    title: item.title,
    discountPercent:
      DAILY_DEAL_DISCOUNT_PERCENT,
    originalCoinPrice,
    discountedCoinPrice:
      Math.max(
        1,
        Math.round(
          originalCoinPrice *
            (
              1 -
              DAILY_DEAL_DISCOUNT_PERCENT /
                100
            )
        )
      ),
  };
}

function millisecondsUntilNextDay(): number {
  const now = new Date();

  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    1,
    0
  );

  return Math.max(
    1000,
    next.getTime() - now.getTime()
  );
}

export function DailyDealProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isOwned,
  } = usePurchases();

  const [dateKey, setDateKey] =
    useState(() => localDateKey());

  useEffect(() => {
    let timer:
      | ReturnType<typeof setTimeout>
      | null = null;

    const refreshDate = () => {
      setDateKey(
        localDateKey()
      );
    };

    const scheduleNextDay = () => {
      timer = setTimeout(() => {
        refreshDate();
        scheduleNextDay();
      }, millisecondsUntilNextDay());
    };

    scheduleNextDay();

    const appStateSub =
      AppState.addEventListener(
        "change",
        (nextState) => {
          if (
            nextState ===
            "active"
          ) {
            refreshDate();
          }
        }
      );

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      appStateSub.remove();
    };
  }, []);

  const deal =
    buildDailyDeal(
      dateKey,
      isOwned
    );

  return (
    <DailyDealContext.Provider
      value={{
        ready: true,
        deal,
      }}
    >
      {children}
    </DailyDealContext.Provider>
  );
}

export function useDailyDeal() {
  const context =
    useContext(DailyDealContext);

  if (!context) {
    throw new Error(
      "useDailyDeal must be used inside DailyDealProvider"
    );
  }

  return context;
}

export default DailyDealProvider;
