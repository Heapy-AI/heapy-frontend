import React, { useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createIdempotencyKey } from '../../shared/utils/idempotency';
import { Purchase, shopApi, shopKeys, Wallet } from './shopApi';
import { baseCat, shopAssets } from './shopAssets';
import { ms } from './missionStyles';
import { ss } from './shopStyles';

const tabs = [
  { id: 'shop', title: '코인샵' },
  { id: 'wardrobe', title: '내 옷장' },
  { id: 'history', title: '구매 내역' },
] as const;
type ShopTab = (typeof tabs)[number]['id'];

export function MissionShop({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ShopTab>('shop');
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState(0);
  const [cancelPurchase, setCancelPurchase] = useState<Purchase | null>(null);
  const pending = useRef(false);
  // 작성자: 김진우 — 응답을 받지 못한 구매는 같은 키로 재시도하여 중복 차감을 방지한다.
  const purchaseKeys = useRef<Record<string, string>>({});
  const wallet = useQuery({
    queryKey: [...shopKeys, 'wallet'],
    queryFn: shopApi.wallet,
    enabled: visible,
    retry: false,
  });
  const items = useQuery({
    queryKey: [...shopKeys, 'items'],
    queryFn: shopApi.items,
    enabled: visible,
    retry: false,
  });
  const wardrobe = useQuery({
    queryKey: [...shopKeys, 'wardrobe'],
    queryFn: shopApi.wardrobe,
    enabled: visible,
    retry: false,
  });
  const history = useQuery({
    queryKey: [...shopKeys, 'history', offset],
    queryFn: () => shopApi.purchases(offset),
    enabled: visible && tab === 'history',
    retry: false,
  });
  const ownedItems = wardrobe.data?.items ?? [];
  const equipped = ownedItems.find(
    item => item.itemId === wardrobe.data?.equippedItemId,
  );
  const products = tab === 'wardrobe' ? ownedItems : items.data ?? [];
  const selected =
    products.find(item => item.itemId === selectedId) ?? products[0];
  const owned =
    !!selected && ownedItems.some(item => item.itemId === selected.itemId);
  const wearing =
    !!selected && selected.itemId === wardrobe.data?.equippedItemId;
  const failed =
    wallet.isError ||
    items.isError ||
    wardrobe.isError ||
    (tab === 'history' && history.isError);
  const loading = wallet.isPending || items.isPending || wardrobe.isPending;
  const refresh = () => client.invalidateQueries({ queryKey: shopKeys });
  const changeTab = (next: ShopTab) => {
    if (pending.current) return;
    setTab(next);
    setSelectedId('');
    setCancelPurchase(null);
    setError('');
    setMessage('');
  };
  const updateBalance = (balance: number) =>
    client.setQueryData<Wallet>([...shopKeys, 'wallet'], previous =>
      previous ? { ...previous, balance } : undefined,
    );
  const run = async (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '요청을 완료하지 못했어요. 다시 시도해 주세요.',
      );
    } finally {
      try {
        await refresh();
      } finally {
        pending.current = false;
        setBusy(false);
      }
    }
  };
  const buyOrEquip = () =>
    run(async () => {
      if (!selected) return;
      if (owned) {
        const saved = wearing
          ? await shopApi.unequip()
          : await shopApi.equip(selected.itemId);
        client.setQueryData([...shopKeys, 'wardrobe'], saved);
        setMessage(
          wearing ? '기본 코디로 돌아왔어요.' : `${selected.name} 착용 완료!`,
        );
      } else {
        const key =
          purchaseKeys.current[selected.itemId] ?? createIdempotencyKey();
        purchaseKeys.current[selected.itemId] = key;
        const saved = await shopApi.buy(selected.itemId, key);
        delete purchaseKeys.current[selected.itemId];
        if (saved.purchase.cancelledAt) {
          throw new Error('이전 구매가 취소된 상태예요. 다시 구매해 주세요.');
        }
        updateBalance(saved.balance);
        setTab('wardrobe');
        setMessage(`${selected.name} 구매 완료! 옷장에서 착용해 보세요.`);
      }
    });
  const preview = tab === 'shop' ? selected : equipped;
  const actionDisabled =
    busy ||
    failed ||
    !wallet.data ||
    (!owned && (wallet.data?.balance ?? 0) < (selected?.price ?? 0));
  const actionText = busy
    ? '처리 중…'
    : owned
    ? wearing
      ? '착용 해제'
      : '착용하기'
    : (wallet.data?.balance ?? 0) >= (selected?.price ?? 0)
    ? `${selected?.price}코인으로 구매`
    : `${
        (selected?.price ?? 0) - (wallet.data?.balance ?? 0)
      }코인 더 모으면 구매할 수 있어요`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!pending.current) onClose();
      }}
    >
      <View style={[ss.root, { paddingTop: insets.top }]}>
        <View style={ss.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="코디샵 닫기"
            disabled={busy}
            onPress={onClose}
            style={ms.iconButton}
          >
            <Text style={ss.back}>‹</Text>
          </Pressable>
          <Text style={ms.heading}>히피 코디샵</Text>
          <View style={ss.coin}>
            <Text style={ss.coinText}>
              C {wallet.data?.balance.toLocaleString() ?? '—'}
            </Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={[
            ms.content,
            { paddingBottom: insets.bottom + 28 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={wallet.isFetching && !busy}
              onRefresh={refresh}
              tintColor="#20B894"
            />
          }
        >
          <View style={ss.tabs} accessibilityRole="tablist">
            {tabs.map(item => (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: item.id === tab }}
                disabled={busy}
                onPress={() => changeTab(item.id)}
                style={[ss.tab, item.id === tab && ss.selected]}
              >
                <Text style={item.id === tab ? ms.green : ms.muted}>
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </View>
          {!!message && (
            <Text accessibilityLiveRegion="polite" style={ms.green}>
              {message}
            </Text>
          )}
          {!!error && (
            <Text accessibilityLiveRegion="polite" style={ms.error}>
              {error}
            </Text>
          )}
          {failed && (
            <Pressable disabled={busy} onPress={refresh}>
              <Text style={ms.error}>
                상점 정보를 불러오지 못했어요. 다시 시도
              </Text>
            </Pressable>
          )}
          {loading && <Text style={ms.muted}>코디를 불러오고 있어요.</Text>}
          {!loading &&
            (tab === 'history' ? (
              <>
                {history.isPending && (
                  <Text style={ms.muted}>구매 내역을 불러오고 있어요.</Text>
                )}
                {history.data?.length === 0 && (
                  <View style={ms.card}>
                    <Text style={ms.text}>아직 구매 내역이 없어요.</Text>
                  </View>
                )}
                {history.data?.map(purchase => {
                  const product = items.data?.find(
                    item => item.itemId === purchase.itemId,
                  );
                  const cancellable =
                    !purchase.cancelledAt &&
                    new Date(purchase.cancelUntil).getTime() > Date.now();
                  return (
                    <View key={purchase.purchaseId} style={ms.card}>
                      <Text style={ms.text}>
                        {product?.name ?? purchase.itemId}
                      </Text>
                      <Text style={ms.muted}>
                        {new Date(purchase.purchasedAt).toLocaleDateString(
                          'ko-KR',
                        )}{' '}
                        · {purchase.spentCoins}코인
                      </Text>
                      {purchase.cancelledAt ? (
                        <Text style={ms.green}>취소 · 환불 완료</Text>
                      ) : cancellable ? (
                        <Pressable
                          disabled={busy}
                          onPress={() => setCancelPurchase(purchase)}
                        >
                          <Text style={ms.green}>구매 취소</Text>
                        </Pressable>
                      ) : (
                        <Text style={ms.muted}>취소 가능 기간이 지났어요.</Text>
                      )}
                      {cancelPurchase?.purchaseId === purchase.purchaseId && (
                        <View style={ss.confirm}>
                          <Text style={ms.text}>
                            {purchase.spentCoins}코인을 환불받을까요?
                          </Text>
                          <Text style={ms.muted}>
                            이 의상은 옷장에서 회수되고 착용도 해제돼요.
                          </Text>
                          <View style={ms.between}>
                            <Pressable
                              disabled={busy}
                              onPress={() => setCancelPurchase(null)}
                            >
                              <Text style={ms.muted}>돌아가기</Text>
                            </Pressable>
                            <Pressable
                              disabled={busy}
                              onPress={() =>
                                run(async () => {
                                  const saved = await shopApi.cancel(
                                    purchase.purchaseId,
                                  );
                                  delete purchaseKeys.current[purchase.itemId];
                                  updateBalance(saved.balance);
                                  setCancelPurchase(null);
                                  setMessage(
                                    '구매를 취소하고 코인을 돌려받았어요.',
                                  );
                                })
                              }
                            >
                              <Text style={ms.green}>
                                {busy ? '처리 중…' : '취소 확정'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
                <View style={ms.between}>
                  <Pressable
                    disabled={offset === 0 || busy || history.isFetching}
                    onPress={() => {
                      setOffset(value => Math.max(0, value - 20));
                      setCancelPurchase(null);
                    }}
                  >
                    <Text style={offset === 0 ? ms.muted : ms.green}>이전</Text>
                  </Pressable>
                  <Pressable
                    disabled={
                      history.data?.length !== 20 || busy || history.isFetching
                    }
                    onPress={() => {
                      setOffset(value => value + 20);
                      setCancelPurchase(null);
                    }}
                  >
                    <Text
                      style={history.data?.length === 20 ? ms.green : ms.muted}
                    >
                      다음
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <LinearGradient colors={['#E4F8EF', '#E8F0FF']} style={ss.hero}>
                  <Text style={ms.green}>
                    {tab === 'shop' ? '히피냥에게 작은 선물' : '나의 히피냥'}
                  </Text>
                  <Image
                    source={shopAssets[preview?.assetKey ?? '']?.cat ?? baseCat}
                    style={ss.cat}
                    resizeMode="contain"
                    accessibilityLabel={`${preview?.name ?? '기본 코디'} ${
                      tab === 'shop' ? '미리보기' : '착용 중'
                    }`}
                  />
                  <Text style={ms.text}>{preview?.name ?? '기본 코디'}</Text>
                  <Text style={ms.muted}>
                    {tab === 'shop'
                      ? '미션을 완료하고 10코인씩 모아 보세요.'
                      : '마음에 드는 의상을 골라 착용해 보세요.'}
                  </Text>
                  {tab === 'wardrobe' && equipped && (
                    <Pressable
                      disabled={busy}
                      onPress={() =>
                        run(async () => {
                          client.setQueryData(
                            [...shopKeys, 'wardrobe'],
                            await shopApi.unequip(),
                          );
                          setMessage('기본 코디로 돌아왔어요.');
                        })
                      }
                    >
                      <Text style={ms.green}>착용 해제</Text>
                    </Pressable>
                  )}
                </LinearGradient>
                {tab === 'wardrobe' && products.length === 0 && (
                  <View style={ms.card}>
                    <Text style={ms.text}>아직 보유한 의상이 없어요.</Text>
                    <Pressable onPress={() => changeTab('shop')}>
                      <Text style={ms.green}>코인샵 구경하기 ›</Text>
                    </Pressable>
                  </View>
                )}
                <View style={ss.grid}>
                  {products.map(item => {
                    const isOwned = ownedItems.some(
                      ownedItem => ownedItem.itemId === item.itemId,
                    );
                    const isEquipped =
                      wardrobe.data?.equippedItemId === item.itemId;
                    return (
                      <Pressable
                        key={item.itemId}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.name}, ${item.price}코인`}
                        accessibilityState={{
                          selected: selected?.itemId === item.itemId,
                        }}
                        disabled={busy}
                        onPress={() => setSelectedId(item.itemId)}
                        style={[
                          ss.product,
                          selected?.itemId === item.itemId &&
                            ss.productSelected,
                        ]}
                      >
                        <Image
                          source={shopAssets[item.assetKey]?.item ?? baseCat}
                          style={ss.productImage}
                          resizeMode="contain"
                        />
                        <Text style={ms.text}>{item.name}</Text>
                        <Text style={ms.muted}>
                          {isOwned
                            ? isEquipped
                              ? '착용 중'
                              : '보유 중'
                            : `${item.price}코인`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {selected && (
                  <Pressable
                    disabled={actionDisabled}
                    onPress={buyOrEquip}
                    style={actionDisabled && ss.disabled}
                  >
                    <LinearGradient
                      colors={['#1EB894', '#438DFC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={ss.action}
                    >
                      <Text style={ss.actionText}>{actionText}</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </>
            ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
