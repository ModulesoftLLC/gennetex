import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { MOVEMENT_TYPES, computeBalances, movementDelta } from '../lib/stockBalance';
import { firebaseUploadFile, firebaseList, firebaseGetOne, firebaseCreate, firebaseUpdate, firebaseDelete, firebaseSet } from '../lib/firebaseAdapter';

const TABLE = 'inventory';
const BUCKET = 'inventory';

async function uploadImage(uri, folder) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const bytes = decode(base64);
  return firebaseUploadFile(path, bytes, 'image/jpeg');
}

export async function uploadInventoryImage(uri) {
  return uploadImage(uri, 'items');
}

export async function uploadMovementPhoto(uri) {
  return uploadImage(uri, 'movements');
}

export async function fetchInventory() {
  const data = await firebaseList(TABLE, { order: { field: 'createdAt', direction: 'desc' } });
  return (data || []).map(normalize);
}

export async function fetchItemByBarcode(barcode) {
  const code = String(barcode || '').trim();
  if (!code) return null;
  const data = await firebaseList(TABLE, { whereClauses: [{ field: 'barcode', op: '==', value: code }] });
  return data && data[0] ? normalize(data[0]) : null;
}

export async function insertInventory(item) {
  const data = await firebaseCreate(TABLE, {
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    price: item.price,
    barcode: item.barcode || null,
    image_url: item.image_url || null,
    category: item.category || 'material',
  });
  return normalize(data);
}

export async function updateInventory(id, patch) {
  const data = await firebaseUpdate(TABLE, id, patch);
  return normalize(data);
}

export async function deleteInventory(id) {
  await firebaseDelete(TABLE, id);
}

// Бараа олгох: тоо хасаад олголтын лог үүсгэнэ
export async function withdrawInventory({ item, userId, userName, qty, photoUrl }) {
  const newQty = Math.max(0, (Number(item.quantity) || 0) - qty);
  await updateInventory(item.id, { quantity: newQty });
  await firebaseCreate('stock_movements', {
    item_id: item.id,
    item_name: item.name,
    unit: item.unit,
    user_id: userId || null,
    user_name: userName,
    quantity: qty,
    movement_type: MOVEMENT_TYPES.WITHDRAW,
    photo_url: photoUrl || null,
  });
  return newQty;
}

/** Ажилтны үлдэгдлээс хэрэглэх */
export async function consumeInventory({ item, userId, userName, qty }) {
  const q = Math.max(1, Number(qty) || 0);
  const movements = await fetchMyMovements(userId, 500);
  const balances = computeBalances(movements, { userId, itemId: item.id });
  const balance = balances[0]?.quantity || 0;
  if (q > balance) {
    throw new Error(`Үлдэгдэл хүрэлцэхгүй (${balance} ${item.unit || 'ширхэг'})`);
  }
  await firebaseCreate('stock_movements', {
    item_id: item.id,
    item_name: item.name,
    unit: item.unit,
    user_id: userId || null,
    user_name: userName,
    quantity: q,
    movement_type: MOVEMENT_TYPES.CONSUME,
  });
  return balance - q;
}

export async function fetchMovements(limit = 300) {
  return firebaseList('stock_movements', { order: { field: 'createdAt', direction: 'desc' }, limitCount: limit });
}

export async function fetchMyMovements(userId, limit = 300) {
  return firebaseList('stock_movements', {
    whereClauses: [{ field: 'user_id', op: '==', value: userId }],
    order: { field: 'createdAt', direction: 'desc' },
    limitCount: limit,
  });
}

export async function fetchMyBalances(userId, inventory = []) {
  const movements = await fetchMyMovements(userId, 500);
  const inventoryById = {};
  inventory.forEach((it) => {
    inventoryById[it.id] = it;
  });
  return computeBalances(movements, { userId, inventoryById });
}

function normalize(row) {
  return {
    ...row,
    quantity: Number(row.quantity) || 0,
    price: Number(row.price) || 0,
    category: row.category || 'material',
  };
}
