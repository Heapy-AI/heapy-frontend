// 작성자: 김진우 — APK 호출 계약과 EC2 공개 API 명세를 대조하여 복원한다.
import { apiClient } from '../../shared/api/client';

export type ShopItem = {
  itemId: string;
  name: string;
  slot: string;
  price: number;
  assetKey: string;
  owned?: boolean;
  equipped?: boolean;
};
export type Wallet = { balance: number; missionReward: number };
export type Wardrobe = { items: ShopItem[]; equippedItemId: string | null };
export type Purchase = {
  purchaseId: string;
  itemId: string;
  purchasedAt: string;
  cancelUntil: string;
  cancelledAt: string | null;
  spentCoins: number;
};
export type PurchaseResult = { purchase: Purchase; balance: number };
export const shopKeys = ['mission-shop'] as const;
export const shopApi = {
  wallet: async () => (await apiClient.get<Wallet>('/api/coins')).data,
  items: async () => (await apiClient.get<ShopItem[]>('/api/shop/items')).data,
  wardrobe: async () => (await apiClient.get<Wardrobe>('/api/wardrobe')).data,
  purchases: async (offset = 0) =>
    (
      await apiClient.get<Purchase[]>('/api/shop/purchases', {
        params: { limit: 20, offset },
      })
    ).data,
  buy: async (itemId: string, key: string) =>
    (
      await apiClient.post<PurchaseResult>(
        '/api/shop/purchases',
        { itemId },
        { headers: { 'Idempotency-Key': key } },
      )
    ).data,
  equip: async (itemId: string) =>
    (await apiClient.put<Wardrobe>('/api/wardrobe/equipped', { itemId })).data,
  unequip: async () =>
    (await apiClient.delete<Wardrobe>('/api/wardrobe/equipped')).data,
  cancel: async (purchaseId: string) =>
    (
      await apiClient.post<PurchaseResult>(
        `/api/shop/purchases/${encodeURIComponent(purchaseId)}/cancel`,
      )
    ).data,
};
