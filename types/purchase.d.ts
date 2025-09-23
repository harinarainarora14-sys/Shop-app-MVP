interface PurchaseStats {
  totalAmount: number;
  count: number;
  averageAmount: number;
}

interface PurchasesByPeriod {
  [key: string]: {
    purchases: Purchase[];
    stats: PurchaseStats;
  };
}