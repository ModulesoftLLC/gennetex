<<<<<<< HEAD
<<<<<<< HEAD
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
=======
>>>>>>> c08b25b (first commit)
=======
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
>>>>>>> f012230 (v0.4.8: Public site, careers, contracts, device gate, and custom ringtone)
import { supabase } from '../lib/supabase';
import { MOVEMENT_TYPES, computeBalances, movementDelta } from '../lib/stockBalance';

const TABLE = 'inventory';
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> f012230 (v0.4.8: Public site, careers, contracts, device gate, and custom ringtone)
const BUCKET = 'inventory';

async function uploadImage(uri, folder) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadInventoryImage(uri) {
  return uploadImage(uri, 'items');
}

export async function uploadMovementPhoto(uri) {
  return uploadImage(uri, 'movements');
}
<<<<<<< HEAD
=======
>>>>>>> c08b25b (first commit)
=======
>>>>>>> f012230 (v0.4.8: Public site, careers, contracts, device gate, and custom ringtone)

export async function fetchInventory() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalize);
}

export async function fetchItemByBarcode(barcode) {
  const code = String(barcode || '').trim();
  if (!code) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('barcode', code)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data) : null;
}

export async function insertInventory(item) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      barcode: item.barcode || null,
<<<<<<< HEAD
<<<<<<< HEAD
      image_url: item.image_url || null,
=======
>>>>>>> c08b25b (first commit)
=======
      image_url: item.image_url || null,
>>>>>>> f012230 (v0.4.8: Public site, careers, contracts, device gate, and custom ringtone)
      category: item.category || 'material',
    })
    .select()
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateInventory(id, patch) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteInventory(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

// Бараа олгох: тоо хасаад олголтын лог үүсгэнэ
<<<<<<< HEAD
<<<<<<< HEAD
export async function withdrawInventory({ item, userId, userName, qty, photoUrl }) {
=======
export async function withdrawInventory({ item, userId, userName, qty }) {
>>>>>>> c08b25b (first commit)
=======
export async function withdrawInventory({ item, userId, userName, qty, photoUrl }) {
>>>>>>> f012230 (v0.4.8: Public site, careers, contracts, device gate, and custom ringtone)
  const newQty = Math.max(0, (Number(item.quantity) || 0) - qty);
  await updateInventory(item.id, { quantity: newQty });
  const { error } = await supabase.from('stock_movements').insert({
    item_id: item.id,
    item_name: item.name,
    unit: item.unit,
    user_id: userId || null,
    user_name: userName,
    quantity: qty,
    movement_type: MOVEMENT_TYPES.WITHDRAW,
<<<<<<< HEAD
<<<<<<< HEAD
    photo_url: photoUrl || null,
=======
>>>>>>> c08b25b (first commit)
=======
    photo_url: photoUrl || null,
>>>>>>> f012230 (v0.4.8: Public site, careers, contracts, device gate, and custom ringtone)
  });
  if (error) throw error;
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
  const { error } = await supabase.from('stock_movements').insert({
    item_id: item.id,
    item_name: item.name,
    unit: item.unit,
    user_id: userId || null,
    user_name: userName,
    quantity: q,
    movement_type: MOVEMENT_TYPES.CONSUME,
  });
  if (error) throw error;
  return balance - q;
}

export async function fetchMovements(limit = 300) {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchMyMovements(userId, limit = 300) {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
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
