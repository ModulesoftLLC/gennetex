import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import {
  Card,
  Button,
  Field,
  Badge,
  ScreenHeader,
  HeaderButton,
  EmptyState,
  formatMNT,
} from '../components/ui';
import InventoryThumb from '../components/InventoryThumb';
import BarcodeScanner from '../components/BarcodeScanner';
import * as invApi from '../services/inventoryService';
import { colors, spacing, radius } from '../theme';

const EMPTY_FORM = { name: '', unit: 'ширхэг', quantity: '', price: '', barcode: '', category: 'material'};

const CAT_META = {
  material: { label: 'Бараа материал', empty: 'Бараа материал бүртгэгдээгүй байна.'},
  tool: { label: 'Багаж', empty: 'Багаж бүртгэгдээгүй байна.'},
};

export default function InventoryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const category = route.params?.category === 'tool' ? 'tool' : 'material';
  const meta = CAT_META[category];
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    adjustQuantity,
    removeInventoryItem,
    withdrawItem,
    getItemByBarcode,
    isCloud,
    isAdmin,
    refreshInventory,
  } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [scanMode, setScanMode] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [takeItem, setTakeItem] = useState(null);
  const [takeQty, setTakeQty] = useState('1');
  const [pendingAdd, setPendingAdd] = useState(false);

  const filtered = useMemo(
    () => inventory.filter((it) => (it.category || 'material') === category),
    [inventory, category]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshInventory();
    setRefreshing(false);
  };

  const totalValue = useMemo(
    () =>
      category === 'tool'
        ? filtered.reduce((sum, it) => sum + it.quantity * it.price, 0)
        : 0,
    [filtered, category]
  );

  const showPrice = category === 'tool';
  const screenTitle =
    !isAdmin && category === 'material'
      ? 'Бараа авах'
      : !isAdmin && category === 'tool'
        ? 'Багаж авах'
        : meta.label;

  const closeFormModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      unit: form.unit.trim() || 'ширхэг',
      quantity: Number(form.quantity) || 0,
      price: showPrice ? Number(form.price) || 0 : 0,
      barcode: form.barcode.trim() || null,
      category,
    };
    if (editingId) {
      await updateInventoryItem(editingId, payload);
      Alert.alert('Хадгалагдлаа', `${payload.name} шинэчлэгдлээ.`);
    } else {
      await addInventoryItem(payload);
    }
    closeFormModal();
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, category });
    if (isAdmin) {
      setPendingAdd(true);
      setScanMode('form');
    } else {
      setModalVisible(true);
    }
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      unit: item.unit || 'ширхэг',
      quantity: String(item.quantity ?? ''),
      price: String(item.price ?? ''),
      barcode: item.barcode || '',
      category: item.category || category,
    });
    setModalVisible(true);
  };

  const handleQuickScan = (data) => {
    setScanMode(null);
    const existing = getItemByBarcode(data);
    if (existing) {
      adjustQuantity(existing.id, 1);
      Alert.alert('Бүртгэгдлээ', `${existing.name}\nТоо хэмжээ +1 (нийт ${existing.quantity + 1} ${existing.unit})`);
    } else {
      setForm({ ...EMPTY_FORM, barcode: data, category });
      setModalVisible(true);
      Alert.alert('Шинэ бараа', `Код: ${data}\nМэдээллийг бөглөж хадгална уу.`);
    }
  };

  const handleFormScan = (data) => {
    setScanMode(null);
    const code = String(data || '').trim();
    setForm((f) => ({ ...f, barcode: code }));
    setModalVisible(true);
    setPendingAdd(false);
  };

  const closeScanner = () => {
    if (pendingAdd) {
      setModalVisible(true);
      setPendingAdd(false);
    }
    setScanMode(null);
  };

  const handleTakeScan = async (data) => {
    setScanMode(null);
    let item = getItemByBarcode(data);
    if (!item && isCloud) {
      try {
        item = await invApi.fetchItemByBarcode(data);
        if (item) await refreshInventory();
      } catch (e) {}
    }
    if (!item) {
      Alert.alert('Олдсонгүй', `"${data}"кодтой бараа бүртгэлд алга.`);
      return;
    }
    if (!item.barcode) {
      Alert.alert('Бар кодгүй', 'Энэ бараанд бар код бүртгэгдээгүй байна. Админд хэлнэ үү.');
      return;
    }
    const itemCat = item.category || 'material';
    if (itemCat !== category) {
      const where = itemCat === 'tool' ? 'Багаж' : 'Бараа материал';
      Alert.alert('Буруу ангилал', `Энэ код "${where}"хэсэгт бүртгэгдсэн.`);
      return;
    }
    openTake(item);
  };

  const handleScanned = (data) => {
    if (scanMode === 'quick') handleQuickScan(data);
    else if (scanMode === 'form') handleFormScan(data);
    else if (scanMode === 'take') handleTakeScan(data);
  };

  const openScan = () => {
    if (isAdmin) return;
    setScanMode('take');
  };

  const employeeScanHeader = (
    <View style={styles.scanBanner}>
      <Text style={styles.scanBannerTitle}>Бар код уншуулж авна</Text>
      <Text style={styles.scanBannerText}>
        {category === 'tool'
          ? 'Багаж авахын тулд заавал шошгоны бар кодыг уншуулна уу.'
          : 'Бараа материал авахын тулд заавал шошгоны бар кодыг уншуулна уу.'}
      </Text>
      <Button title="Бар код унших" variant="success" onPress={openScan} />
    </View>
  );

  const openTake = (item) => {
    setTakeItem(item);
    setTakeQty('1');
  };

  const confirmTake = async () => {
    const q = Number(takeQty) || 0;
    if (!takeItem || q <= 0) return;
    if (q > takeItem.quantity) {
      Alert.alert('Хүрэлцэхгүй', `Агуулахад ${takeItem.quantity} ${takeItem.unit} л байна.`);
      return;
    }
    const item = takeItem;
    setTakeItem(null);
    await withdrawItem(item, q);
    Alert.alert('Олгогдлоо', `${item.name}\n${q} ${item.unit} авлаа. Үлдэгдэл: ${item.quantity - q} ${item.unit}`);
  };

  const renderItem = ({ item }) => (
    <Card style={styles.itemCard}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <InventoryThumb name={item.name} category={item.category || category} size={46} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.name}</Text>
          {showPrice ? (
            <Text style={styles.itemSub}>
              {formatMNT(item.price)} / {item.unit}
            </Text>
          ) : (
            <Text style={styles.itemSub}>{item.unit}</Text>
          )}
          {item.barcode ? (
            <Text style={styles.itemBarcode}>▮▯▮ {item.barcode}</Text>
          ) : null}
        </View>
        <View style={styles.qtyPill}>
          <Text style={styles.qtyNum}>{item.quantity}</Text>
          <Text style={styles.qtyUnit}>{item.unit}</Text>
        </View>
      </View>

      <View style={styles.itemFooter}>
        {showPrice ? (
          <Text style={styles.itemValue}>{formatMNT(item.quantity * item.price)}</Text>
        ) : (
          <View />
        )}
        {isAdmin ? (
          <View style={styles.adminActions}>
            <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8}>
              <Text style={styles.edit}>Засах</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeInventoryItem(item.id)} hitSlop={8}>
              <Text style={styles.delete}>Устгах</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Авах — зөвхөн бар код уншуулсны дараа (ажилтан) */}
      {isAdmin ? (
        <Button
          title="Бараа авах" variant="success"
          size="sm"
          style={{ marginTop: spacing.md }}
          onPress={() => openTake(item)}
        />
      ) : null}

      {/* Тоо тохируулах — зөвхөн админ */}
      {isAdmin ? (
        <View style={styles.stepper}>
          <Button title="−10" variant="ghost" size="sm" style={styles.stepBtn} onPress={() => adjustQuantity(item.id, -10)} />
          <Button title="−1" variant="ghost" size="sm" style={styles.stepBtn} onPress={() => adjustQuantity(item.id, -1)} />
          <Button title="+1" size="sm" style={styles.stepBtn} onPress={() => adjustQuantity(item.id, 1)} />
          <Button title="+10" size="sm" style={styles.stepBtn} onPress={() => adjustQuantity(item.id, 10)} />
        </View>
      ) : null}
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={screenTitle}
        subtitle={`${filtered.length} нэр төрөл`}
        right={
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {!isAdmin ? (
              <>
                <HeaderButton
                  title="Үлдэгдэл"
                  onPress={() => navigation.navigate(category === 'tool' ? 'MyTools' : 'MyStock')}
                />
                <HeaderButton title="Унших" onPress={openScan} />
              </>
            ) : (
              <>
                <HeaderButton
                  title="Хэн авсан"
                  onPress={() => navigation.navigate('ToolAllocation', { category })}
                />
                <HeaderButton title="Нэмэх" onPress={openAdd} />
              </>
            )}
          </View>
        }
      />

      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ListHeaderComponent={
          isAdmin ? (
            showPrice ? (
              <View style={styles.summaryRow}>
                <View style={styles.summaryMain}>
                  <Text style={styles.summaryLabel}>Нийт үнэлгээ {isCloud ? '' : ''}</Text>
                  <Text style={styles.summaryValue}>{formatMNT(totalValue)}</Text>
                </View>
              </View>
            ) : null
          ) : (
            employeeScanHeader
          )
        }
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        refreshControl={
          isCloud ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }
        ListEmptyComponent={<EmptyState text={meta.empty} />}
      />

      <Modal visible={modalVisible && scanMode !== 'form'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingId ? `${meta.label} засах` : `${meta.label} нэмэх`}
              </Text>
              <View style={styles.barcodeRow}>
                <Field
                  label="Зураасан код (barcode)"
                  placeholder="Скан хийх эсвэл гараар"
                  value={form.barcode}
                  onChangeText={(t) => setForm({ ...form, barcode: t })}
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <Button title="Скан" variant="success" style={styles.scanBtn} onPress={() => setScanMode('form')} />
              </View>
              <Field
                label="Барааны нэр"
                placeholder="Ж: Цахилгаан кабель"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />
              <Field
                label="Хэмжих нэгж"
                placeholder="ширхэг / метр / кг"
                value={form.unit}
                onChangeText={(t) => setForm({ ...form, unit: t })}
              />
              <Field
                label="Тоо хэмжээ"
                placeholder="0"
                keyboardType="numeric"
                value={form.quantity}
                onChangeText={(t) => setForm({ ...form, quantity: t })}
              />
              {showPrice ? (
                <Field
                  label="Нэгж үнэ (₮)"
                  placeholder="0"
                  keyboardType="numeric"
                  value={form.price}
                  onChangeText={(t) => setForm({ ...form, price: t })}
                />
              ) : null}
              <View style={styles.modalActions}>
                <Button title="Болих" variant="ghost" style={{ flex: 1 }} onPress={closeFormModal} />
                <Button title={editingId ? 'Хадгалах' : 'Нэмэх'} style={{ flex: 1 }} onPress={handleSave} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={takeItem !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Бараа авах</Text>
            {takeItem ? (
              <>
                <Text style={styles.takeName}>{takeItem.name}</Text>
                <Text style={styles.takeSub}>Агуулахын үлдэгдэл: {takeItem.quantity} {takeItem.unit}</Text>
                <Field
                  label={`Авах тоо (${takeItem.unit})`}
                  placeholder="1"
                  keyboardType="numeric"
                  value={takeQty}
                  onChangeText={setTakeQty}
                />
                <View style={styles.modalActions}>
                  <Button title="Болих" variant="ghost" style={{ flex: 1 }} onPress={() => setTakeItem(null)} />
                  <Button title="Авах" variant="success" style={{ flex: 1 }} onPress={confirmTake} />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <BarcodeScanner
        visible={scanMode !== null}
        onClose={closeScanner}
        onScanned={handleScanned}
        title={
          scanMode === 'take'
            ? category === 'tool'
              ? 'Багажийн бар код'
              : 'Барааны бар код'
            : scanMode === 'form'
              ? pendingAdd
                ? 'Бараа нэмэх — бар код'
                : 'Бар код унших'
              : 'Бар код унших'
        }
        hint={
          scanMode === 'take'
            ? 'Барааны зураасан кодыг уншуулна уу'
            : pendingAdd
              ? 'Эхлээд барааны шошгоны кодыг уншуулна уу'
              : 'QR эсвэл EAN/Code128 зураасан код'
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  summaryMain: { flex: 1 },
  summaryLabel: { color: colors.textMuted, fontSize: 13 },
  summaryValue: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 },
  scanBanner: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  scanBannerTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: spacing.xs },
  scanBannerText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  itemCard: { paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  itemName: { color: colors.text, fontSize: 16, fontWeight: '800'},
  itemSub: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  itemBarcode: { color: colors.primary, marginTop: 3, fontSize: 11, letterSpacing: 1 },
  qtyPill: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 58,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyNum: { color: colors.text, fontSize: 18, fontWeight: '900'},
  qtyUnit: { color: colors.textMuted, fontSize: 10 },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemValue: { color: colors.success, fontWeight: '800', fontSize: 15 },
  adminActions: { flexDirection: 'row', gap: spacing.md },
  edit: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  delete: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  stepper: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  stepBtn: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end'},
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '88%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderHi,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.lg },
  takeName: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 2 },
  takeSub: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  barcodeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md },
  scanBtn: { paddingVertical: spacing.md },
});
