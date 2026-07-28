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

class SupabaseCompatBuilder {
  constructor(table) {
    this.table = table;
    this.whereClauses = [];
    this.orderConfig = null;
    this.limitCount = null;
    this.selectMode = false;
    this.operation = 'select';
    this.payload = null;
    this.result = null;
  }

  select() {
    this.selectMode = true;
    return this;
  }

  eq(field, value) {
    this.whereClauses.push({ field, op: '==', value });
    return this;
  }

  in(field, values) {
    this.whereClauses.push({ field, op: 'in', value: values });
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
    return this._execute(false);
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
        return { data: this.result, error: null };
      }

      if (this.operation === 'update') {
        const idFilter = this.whereClauses.find((w) => w.field === 'id' && w.op === '==');
        if (idFilter) {
          this.result = await firebaseUpdate(this.table, idFilter.value, this.payload || {});
          return { data: this.result, error: null };
        }
        const rows = await firebaseList(this.table, {
          whereClauses: this.whereClauses,
          order: this.orderConfig,
          limitCount: this.limitCount,
        });
        const updates = await Promise.all(rows.map((row) => firebaseUpdate(this.table, row.id, this.payload || {})));
        return { data: updates, error: null };
      }

      if (this.operation === 'delete') {
        const idFilter = this.whereClauses.find((w) => w.field === 'id' && w.op === '==');
        if (idFilter) {
          await firebaseDelete(this.table, idFilter.value);
          return { data: null, error: null };
        }
        const rows = await firebaseList(this.table, {
          whereClauses: this.whereClauses,
          order: this.orderConfig,
          limitCount: this.limitCount,
        });
        await Promise.all(rows.map((row) => firebaseDelete(this.table, row.id)));
        return { data: null, error: null };
      }

      const rows = await firebaseList(this.table, {
        whereClauses: this.whereClauses,
        order: this.orderConfig,
        limitCount: this.limitCount,
      });
      const data = maybeSingle ? rows[0] || null : rows;
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
