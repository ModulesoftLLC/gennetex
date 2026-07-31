export type Role='employee'|'admin'|'superadmin';
export type Profile={id:string;name?:string;email?:string;phone?:string;position?:string;role?:Role;avatar_url?:string};
export type WorkspacePage='dashboard'|'calls'|'employees'|'attendance'|'inventory'|'analytics'|'system';
export type ErpRecord=Record<string,unknown>&{id:string;created_at?:string;createdAt?:string|{toDate?:()=>Date}};
