import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseConfigured, firebaseAuth } from './firebase';
import {
  firebaseSignIn,
  firebaseLogout,
  firebaseResetPassword,
  firebaseChangePassword,
  firebaseGetOne,
  firebaseList,
  firebaseCreate,
  firebaseUpdate,
  firebaseDelete,
  firebaseUploadFile,
  firebaseDeleteFile,
  firebaseWatchAuth,
} from './firebaseAdapter';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseApiConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const isSupabaseConfigured = isSupabaseApiConfigured || isFirebaseConfigured;
export const isFirebaseOnly = isFirebaseConfigured && !isSupabaseApiConfigured;

function snakeToCamel(field) {
  if (typeof field !== 'string') return field;
  return field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(field) {
  if (typeof field !== 'string') return field;
  return field.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function normalizeQueryField(field) {
  if (typeof field !== 'string') return field;
  if (field.includes('_')) {
    return snakeToCamel(field);
  }
  return field;
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const result = { ...row };
  Object.keys(row).forEach((key) => {
    if (key === 'createdAt' && result.created_at === undefined) {
      result.created_at = row[key];
    }
    if (key === 'updatedAt' && result.updated_at === undefined) {
      result.updated_at = row[key];
    }
    if (/[A-Z]/.test(key)) {
      const snake = camelToSnake(key);
      if (result[snake] === undefined) {
        result[snake] = row[key];
      }
    }
  });
  return result;
}

function parseSupabaseInString(value) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('(') || !raw.endsWith(')')) return [value];
  const inner = raw.slice(1, -1);
  return inner
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter((item) => item !== '');
}

function normalizeWhereClause(clause) {
  const normalized = { ...clause };
  normalized.field = normalizeQueryField(clause.field);
  if (clause.op === 'ilike' || clause.op === 'like') {
    normalized.op = '==';
    normalized.value = String(clause.value || '').replace(/%/g, '');
  }
  if (clause.op === 'not' || clause.op === '!=' || clause.op === '<>') {
    normalized.op = '!=';
  }
  if (clause.op === 'not-in' || (clause.op === 'in' && clause.not)) {
    normalized.op = 'not-in';
  }
  if (clause.op === 'in' && typeof clause.value === 'string') {
    normalized.value = parseSupabaseInString(clause.value);
  }
  return normalized;
}

class SupabaseCompatBuilder {
  constructor(table) {
    this.table = table;
    this.whereClauses = [];
    this.orderConfig = null;
    this.limitCount = null;
    this.selectMode = false;
    this.countOptions = null;
    this.operation = 'select';
    this.payload = null;
    this.result = null;
  }

  select(columns = '*', options = {}) {
    this.selectMode = true;
    if (options && options.count) {
      this.countOptions = options;
    }
    return this;
  }

  eq(field, value) {
    this.whereClauses.push({ field, op: '==', value });
    return this;
  }

  gte(field, value) {
    this.whereClauses.push({ field, op: '>=', value });
    return this;
  }

  lte(field, value) {
    this.whereClauses.push({ field, op: '<=', value });
    return this;
  }

  neq(field, value) {
    this.whereClauses.push({ field, op: '!=', value });
    return this;
  }

  in(field, values) {
    this.whereClauses.push({ field, op: 'in', value: values });
    return this;
  }

  like(field, value) {
    this.whereClauses.push({ field, op: 'like', value });
    return this;
  }

  ilike(field, value) {
    this.whereClauses.push({ field, op: 'ilike', value });
    return this;
  }

  not(field, op, value) {
    const normalizedOp = String(op || '').toLowerCase();
    if (normalizedOp === 'in') {
      this.whereClauses.push({ field, op: 'not-in', value });
    } else if (normalizedOp === 'is' && value === null) {
      this.whereClauses.push({ field, op: '!=', value: null });
    } else {
      this.whereClauses.push({ field, op: '!=', value });
    }
    return this;
  }

  order(field, opts = {}) {
    this.orderConfig = { field, direction: opts.ascending === false ? 'desc' : 'asc' };
    return this;
  }

  limit(count) {
    this.limitCount = Number(count) || null;
    return this;
  }

  maybeSingle() {
    return this._execute(true);
  }

  single() {
    return this._execute(true);
  }

  insert(payload) {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  async _execute(maybeSingle) {
    try {
      if (this.operation === 'insert') {
        this.result = await firebaseCreate(this.table, this.payload || {});
        return { data: normalizeRow(this.result), error: null };
      }

      if (this.operation === 'update') {
        const idFilter = this.whereClauses.find((w) => w.field === 'id' && w.op === '==');
        if (idFilter) {
          this.result = await firebaseUpdate(this.table, idFilter.value, this.payload || {});
          return { data: normalizeRow(this.result), error: null };
        }
        const rows = await firebaseList(this.table, {
          whereClauses: this.whereClauses.map(normalizeWhereClause),
          order: this.orderConfig,
          limitCount: this.limitCount,
        });
        const updates = await Promise.all(rows.map((row) => firebaseUpdate(this.table, row.id, this.payload || {})));
        return { data: updates.map(normalizeRow), error: null };
      }

      if (this.operation === 'delete') {
        const idFilter = this.whereClauses.find((w) => w.field === 'id' && w.op === '==');
        if (idFilter) {
          await firebaseDelete(this.table, idFilter.value);
          return { data: null, error: null };
        }
        const rows = await firebaseList(this.table, {
          whereClauses: this.whereClauses.map(normalizeWhereClause),
          order: this.orderConfig,
          limitCount: this.limitCount,
        });
        await Promise.all(rows.map((row) => firebaseDelete(this.table, row.id)));
        return { data: null, error: null };
      }

      const rows = await firebaseList(this.table, {
        whereClauses: this.whereClauses.map(normalizeWhereClause),
        order: this.orderConfig ? { field: normalizeQueryField(this.orderConfig.field), direction: this.orderConfig.direction } : null,
        limitCount: this.limitCount,
      });
      const normalizedRows = (rows || []).map(normalizeRow);
      const data = maybeSingle ? normalizedRows[0] || null : normalizedRows;
      if (this.countOptions) {
        return { data: this.countOptions.head ? null : normalizedRows, count: normalizedRows.length, error: null };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

function createSupabaseCompat() {
  const auth = {
    async signInWithPassword({ email, password }) {
      try {
        const user = await firebaseSignIn(email, password);
        return { data: { user }, error: null };
      } catch (error) {
        return { data: { user: null }, error };
      }
    },
    async signOut() {
      try {
        await firebaseLogout();
        return { error: null };
      } catch (error) {
        return { error };
      }
    },
    async updateUser({ password }) {
      try {
        await firebaseChangePassword(password);
        return { data: { user: firebaseAuth?.currentUser || null }, error: null };
      } catch (error) {
        return { data: { user: null }, error };
      }
    },
    async getUser() {
      return { data: { user: firebaseAuth?.currentUser || null }, error: null };
    },
    async getSession() {
      return { data: { session: firebaseAuth?.currentUser ? { user: firebaseAuth.currentUser } : null }, error: null };
    },
    onAuthStateChange(callback) {
      const unsubscribe = firebaseWatchAuth(callback);
      return { data: { subscription: { unsubscribe } } };
    },
  };

  return {
    auth,
    from(table) {
      return new SupabaseCompatBuilder(table);
    },
    storage: {
      from(bucket) {
        return {
          async upload(path, file, options = {}) {
            try {
              await firebaseUploadFile(path, file, options.contentType || 'application/octet-stream');
              return { data: { path }, error: null };
            } catch (error) {
              return { data: null, error };
            }
          },
          getPublicUrl(path) {
            return { data: { publicUrl: path }, error: null };
          },
          async remove(path) {
            try {
              await firebaseDeleteFile(path);
              return { data: null, error: null };
            } catch (error) {
              return { data: null, error };
            }
          },
        };
      },
    },
    functions: {
      async invoke(name, options = {}) {
        return { data: { name, options }, error: null };
      },
    },
    rpc(name, params) {
      return Promise.resolve({ data: null, error: null });
    },
    channel() {
      return {
        on() { return this; },
        subscribe() { return this; },
      };
    },
    removeChannel() {},
    createClient() {
      return this;
    },
  };
}

export const supabase = createSupabaseCompat();
export const createClient = () => supabase;
