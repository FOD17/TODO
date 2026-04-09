"use strict";(()=>{var e={};e.id=110,e.ids=[110],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8678:e=>{e.exports=import("pg")},191:(e,t,a)=>{a.a(e,async(e,o)=>{try{a.r(t),a.d(t,{originalPathname:()=>y,patchFetch:()=>E,requestAsyncStorage:()=>p,routeModule:()=>d,serverHooks:()=>u,staticGenerationAsyncStorage:()=>T});var r=a(9303),n=a(8716),s=a(670),c=a(4253),i=e([c]);c=(i.then?(await i)():i)[0];let d=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/todos/[id]/route",pathname:"/api/todos/[id]",filename:"route",bundlePath:"app/api/todos/[id]/route"},resolvedPagePath:"/Users/markwilliams/Documents/Developer-Projects/TODO-Tracker/app/api/todos/[id]/route.js",nextConfigOutput:"",userland:c}),{requestAsyncStorage:p,staticGenerationAsyncStorage:T,serverHooks:u}=d,y="/api/todos/[id]/route";function E(){return(0,s.patchFetch)({serverHooks:u,staticGenerationAsyncStorage:T})}o()}catch(e){o(e)}})},4253:(e,t,a)=>{a.a(e,async(e,o)=>{try{a.r(t),a.d(t,{DELETE:()=>i,PATCH:()=>c});var r=a(7070),n=a(6385),s=e([n]);async function c(e,{params:t}){try{let{id:a}=t,{action:o,...s}=await e.json();if("complete"===o)return await n.db.completeTodo(a),r.NextResponse.json({ok:!0});if("uncomplete"===o)return await n.db.uncompleteTodo(a),r.NextResponse.json({ok:!0});let c=await n.db.updateTodo(a,s);return r.NextResponse.json(c)}catch(e){return console.error("[API /todos/[id] PATCH]",e.message),r.NextResponse.json({error:e.message},{status:500})}}async function i(e,{params:t}){try{return await n.db.deleteTodo(t.id),r.NextResponse.json({ok:!0})}catch(e){return console.error("[API /todos/[id] DELETE]",e.message),r.NextResponse.json({error:e.message},{status:500})}}n=(s.then?(await s)():s)[0],o()}catch(e){o(e)}})},6385:(e,t,a)=>{a.a(e,async(e,o)=>{try{let E;a.d(t,{db:()=>p});var r=a(8678),n=e([r]);function s(){return E||(E=new r.Pool({connectionString:process.env.DATABASE_URL||"postgresql://localhost:5431/postgres",ssl:"require"===process.env.DATABASE_SSL&&{rejectUnauthorized:!1}})).on("error",e=>{console.error("[DB] Unexpected pool error:",e.message)}),E}function c(e){if(!e)return e;let t=e.names;return t&&""!==t&&"{}"!==t?"string"==typeof t?t=t.replace(/^\{|\}$/g,"").split(",").map(e=>e.trim()).filter(Boolean):Array.isArray(t)||(t=[]):t=[],{...e,names:t,subtasks:e.subtasks||[],notes:e.notes||[],labels:e.labels||[]}}function i(e){return e?Array.isArray(e)?e.join(","):String(e):""}r=(n.then?(await n)():n)[0];let d=`
  SELECT id, message, date, company, names,
    accountrep AS "accountRep", completed, description,
    createdat AS "createdAt", updatedat AS "updatedAt"
  FROM todos
`,p={async getTodos(){let e=s(),[t,a]=await Promise.all([e.query(`${d} WHERE completed = false ORDER BY date DESC`),e.query(`${d} WHERE completed = true ORDER BY date DESC`)]);return{active:t.rows.map(c),completed:a.rows.map(c)}},async addTodo(e){let t=s(),a=e.id||Date.now().toString();await t.query(`INSERT INTO todos (id, message, date, company, names, accountrep, completed, description)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,[a,e.message,e.date,e.company||"",i(e.names),e.accountRep||"",e.description||""]);let o=await t.query(`${d} WHERE id = $1`,[a]);return c(o.rows[0])},async updateTodo(e,t){let a=s(),o={message:"message",date:"date",company:"company",names:"names",accountRep:"accountrep",description:"description"},r=Object.keys(t).filter(e=>o[e]);if(r.length>0){let n=r.map((e,t)=>`${o[e]} = $${t+1}`).join(", "),s=r.map(e=>"names"===e?i(t[e]):t[e]);s.push(e),await a.query(`UPDATE todos SET ${n}, updatedat = CURRENT_TIMESTAMP WHERE id = $${s.length}`,s)}let n=await a.query(`${d} WHERE id = $1`,[e]);return c(n.rows[0])},async deleteTodo(e){let t=s();await t.query("DELETE FROM todos WHERE id = $1",[e])},async completeTodo(e){let t=s();await t.query("UPDATE todos SET completed = true, updatedat = CURRENT_TIMESTAMP WHERE id = $1",[e])},async uncompleteTodo(e){let t=s();await t.query("UPDATE todos SET completed = false, updatedat = CURRENT_TIMESTAMP WHERE id = $1",[e])},async saveTodos(e){let t=s(),a=e.active||[],o=e.completed||[],r=new Date().toISOString(),n=`
      INSERT INTO todos (id, message, date, company, names, accountrep, completed, description, createdat, updatedat)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,c=await t.connect();try{for(let e of(await c.query("BEGIN"),await c.query("DELETE FROM todos"),[...a,...o]))await c.query(n,[e.id,e.message,e.date,e.company||"",i(e.names),e.accountRep||e.accountrep||"",e.completed||!1,e.description||"",e.createdAt||e.createdat||r,e.updatedAt||e.updatedat||r]);await c.query("COMMIT")}catch(e){throw await c.query("ROLLBACK"),e}finally{c.release()}return e},async getTags(){let e=s(),t=await e.query("SELECT value FROM config WHERE key = 'tags_blob'");if(t.rows.length>0)try{return JSON.parse(t.rows[0].value)}catch{}let a=(await e.query("SELECT company, tagname FROM tags ORDER BY company, tagname")).rows;return{companies:[...new Set(a.map(e=>e.company).filter(Boolean))],accountExecutives:[],companyAssignments:{},companyTypes:{},labels:[]}},async saveTags(e){let t=s(),a=JSON.stringify(e);return(await t.query("SELECT key FROM config WHERE key = 'tags_blob'")).rows.length>0?await t.query("UPDATE config SET value = $1, updatedat = CURRENT_TIMESTAMP WHERE key = 'tags_blob'",[a]):await t.query("INSERT INTO config (key, value) VALUES ('tags_blob', $1)",[a]),e},async getContacts(){let e=s(),t=await e.query(`
      SELECT id, company, name, type, email, phone, notes,
        createdat AS "createdAt", updatedat AS "updatedAt"
      FROM contacts ORDER BY company, name
    `),a={};return t.rows.forEach(e=>{a[e.company]||(a[e.company]={}),a[e.company][e.name]||(a[e.company][e.name]=[]);let{company:t,name:o,...r}=e;a[t][o].push(r)}),a},async saveContacts(e){let t=s(),a=new Date().toISOString(),o=`
      INSERT INTO contacts (id, company, name, type, email, phone, notes, createdat, updatedat)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;if(await t.query("DELETE FROM contacts"),e&&e.companies)for(let[r,n]of Object.entries(e.companies))for(let e of n.contacts||[])await t.query(o,[e.id||`contact-${Date.now()}`,r,e.name,e.type||"person",e.email||"",e.phone||"",e.notes||"",e.createdAt||a,e.updatedAt||a]);else if(e){for(let[r,n]of Object.entries(e))if(!("object"!=typeof n||Array.isArray(n))){for(let[e,s]of Object.entries(n))if(Array.isArray(s))for(let n of s)await t.query(o,[n.id||`contact-${Date.now()}`,r,e,n.type||"person",n.email||"",n.phone||"",n.notes||"",n.createdAt||a,n.updatedAt||a])}}return e},async addContact(e,t){let a=s(),o=t.id||`contact-${Date.now()}`;return await a.query("INSERT INTO contacts (id, company, name, type, email, phone, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)",[o,e,t.name,t.type||"person",t.email||"",t.phone||"",t.notes||""]),{id:o,...t}},async updateContact(e,t,a){let o=s(),r=["name","type","email","phone","notes"],n=Object.keys(a).filter(e=>r.includes(e));if(n.length>0){let e=n.map((e,t)=>`${e} = $${t+1}`).join(", "),r=[...n.map(e=>a[e]),t];await o.query(`UPDATE contacts SET ${e}, updatedat = CURRENT_TIMESTAMP WHERE id = $${r.length}`,r)}return(await o.query("SELECT * FROM contacts WHERE id = $1",[t])).rows[0]},async deleteContact(e,t){let a=s();await a.query("DELETE FROM contacts WHERE id = $1 AND company = $2",[t,e])},async getConfig(){let e=s(),t=await e.query("SELECT key, value FROM config"),a={};return t.rows.forEach(e=>{try{a[e.key]=JSON.parse(e.value)}catch{a[e.key]=e.value}}),a},async updateConfig(e){let t=s();for(let[a,o]of Object.entries(e)){let e="string"==typeof o?o:JSON.stringify(o);(await t.query("SELECT key FROM config WHERE key = $1",[a])).rows.length>0?await t.query("UPDATE config SET value = $1, updatedat = CURRENT_TIMESTAMP WHERE key = $2",[e,a]):await t.query("INSERT INTO config (key, value) VALUES ($1, $2)",[a,e])}return this.getConfig()},async exportBackup(){let e=s(),[t,a,o,r]=await Promise.all([e.query("SELECT * FROM todos"),e.query("SELECT * FROM tags"),e.query("SELECT * FROM contacts"),this.getConfig()]);return{version:1,exportedAt:new Date().toISOString(),todos:t.rows,tags:a.rows,contacts:o.rows,config:r}},async importBackup(e){let t=s(),a=await t.connect();try{await a.query("BEGIN"),await a.query("DELETE FROM todos"),await a.query("DELETE FROM tags"),await a.query("DELETE FROM contacts"),await a.query("DELETE FROM config");let t=new Date().toISOString();if(Array.isArray(e.todos))for(let o of e.todos)await a.query(`INSERT INTO todos (id, message, date, company, names, accountrep, completed, description, createdat, updatedat)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[o.id,o.message,o.date,o.company||"",o.names||"",o.accountRep||o.accountrep||"",o.completed||!1,o.description||"",o.createdAt||t,o.updatedAt||t]);if(Array.isArray(e.contacts))for(let o of e.contacts)await a.query(`INSERT INTO contacts (id, company, name, type, email, phone, notes, createdat, updatedat)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[o.id,o.company,o.name,o.type||"person",o.email||"",o.phone||"",o.notes||"",o.createdAt||t,o.updatedAt||t]);if(e.config&&"object"==typeof e.config)for(let[t,o]of Object.entries(e.config)){let e="string"==typeof o?o:JSON.stringify(o);await a.query("INSERT INTO config (key, value) VALUES ($1, $2)",[t,e])}await a.query("COMMIT")}catch(e){throw await a.query("ROLLBACK"),e}finally{a.release()}return{status:"success",message:"Backup imported successfully"}},async ping(){let e=s();return await e.query("SELECT 1 FROM todos LIMIT 1"),{ok:!0,timestamp:Date.now()}},async initializeTables(){let e=s();await e.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        date TEXT NOT NULL,
        company TEXT,
        names TEXT,
        accountrep TEXT,
        completed BOOLEAN DEFAULT FALSE,
        description TEXT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),await e.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        tagname TEXT NOT NULL,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company, tagname)
      )
    `),await e.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        email TEXT,
        phone TEXT,
        notes TEXT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),await e.query(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);try{await e.query("ALTER TABLE todos ADD COLUMN IF NOT EXISTS description TEXT")}catch{}console.log("[DB] Tables ready")}};o()}catch(e){o(e)}})}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),o=t.X(0,[276,972],()=>a(191));module.exports=o})();