/**
 * Tool check-in/out + damage photo condition.
 */
import { supabase } from '../lib/supabase';
import { isFlagOn } from '../lib/featureFlags';
import { firebaseInsert, firebaseGetAll } from '../lib/firebaseAdapter';

export const CONDITIONS = [
  { key: 'ok', label: 'Хэвийн', color: '#16a34a' },
  { key: 'worn', label: 'Элэгдсэн', color: '#d97706' },
  { key: 'damaged', label: 'Гэмтэлтэй', color: '#dc2626' },
  { key: 'missing', label: 'Дутуу/алдагдсан', color: '#7c3aed' },
];

export async function logToolCondition({
  itemId,
  itemName,
  userId,
  userName,
  direction, // 'out' | 'in'
  condition,
  note,
  photoUrl,
  quantity = 1,
}) {
  if (!isFlagOn('toolCondition')) {
    return { skipped: true };
  }
  const row = {
    item_id: itemId,
    item_name: itemName,
    user_id: userId,
    user_name: userName,
    direction: direction || 'in',
    condition: condition || 'ok',
    note: note || null,
    photo_url: photoUrl || null,
    quantity: quantity || 1,
  };
  if (!supabase) { // Энэ нь isSupabaseConfigured=false үед ажиллана
    return { local: true, ...row, created_at: new Date().toISOString() };
  }
  const data = await firebaseInsert('tool_condition_logs', row);
  return data;
}

export async function fetchToolConditionLogs({ itemId, userId, limit = 100 } = {}) {
  if (!supabase) return [];
  const whereClauses = [];
  if (itemId) whereClauses.push({ field: 'item_id', op: '==', value: itemId });
  if (userId) whereClauses.push({ field: 'user_id', op: '==', value: userId });

  const data = await firebaseGetAll('tool_condition_logs', {
    whereClauses,
    order: { field: 'created_at', direction: 'desc' },
    limit,
  });
  return data || [];
}

export function requiresPhoto(condition) {
  return condition === 'damaged' || condition === 'missing';
}
