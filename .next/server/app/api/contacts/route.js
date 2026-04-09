"use strict";(()=>{var e={};e.id=428,e.ids=[428],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8678:e=>{e.exports=import("pg")},2379:(e,t,a)=>{a.a(e,async(e,o)=>{try{a.r(t),a.d(t,{originalPathname:()=>y,patchFetch:()=>E,requestAsyncStorage:()=>p,routeModule:()=>T,serverHooks:()=>u,staticGenerationAsyncStorage:()=>d});var n=a(9303),r=a(8716),s=a(670),c=a(870),i=e([c]);c=(i.then?(await i)():i)[0];let T=new n.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/contacts/route",pathname:"/api/contacts",filename:"route",bundlePath:"app/api/contacts/route"},resolvedPagePath:"/Users/markwilliams/Documents/Developer-Projects/TODO-Tracker/app/api/contacts/route.js",nextConfigOutput:"",userland:c}),{requestAsyncStorage:p,staticGenerationAsyncStorage:d,serverHooks:u}=T,y="/api/contacts/route";function E(){return(0,s.patchFetch)({serverHooks:u,staticGenerationAsyncStorage:d})}o()}catch(e){o(e)}})},870:(e,t,a)=>{a.a(e,async(e,o)=>{try{a.r(t),a.d(t,{GET:()=>c,POST:()=>E,PUT:()=>i});var n=a(7070),r=a(6385),s=e([r]);async function c(){try{let e=await r.db.getContacts();return n.NextResponse.json(e)}catch(e){return console.error("[API /contacts GET]",e.message),n.NextResponse.json({error:e.message},{status:500})}}async function i(e){try{let t=await e.json();return await r.db.saveContacts(t),n.NextResponse.json({ok:!0})}catch(e){return console.error("[API /contacts PUT]",e.message),n.NextResponse.json({error:e.message},{status:500})}}async function E(e){try{let{company:t,...a}=await e.json(),o=await r.db.addContact(t,a);return n.NextResponse.json(o)}catch(e){return console.error("[API /contacts POST]",e.message),n.NextResponse.json({error:e.message},{status:500})}}r=(s.then?(await s)():s)[0],o()}catch(e){o(e)}})},6385:(e,t,a)=>{a.a(e,async(e,o)=>{try{let E;a.d(t,{db:()=>p});var n=a(8678),r=e([n]);function s(){return E||(E=new n.Pool({connectionString:process.env.DATABASE_URL||"postgresql://localhost:5431/postgres",ssl:"require"===process.env.DATABASE_SSL&&{rejectUnauthorized:!1}})).on("error",e=>{console.error("[DB] Unexpected pool error:",e.message)}),E}function c(e){if(!e)return e;let t=e.names;return t&&""!==t&&"{}"!==t?"string"==typeof t?t=t.replace(/^\{|\}$/g,"").split(",").map(e=>e.trim()).filter(Boolean):Array.isArray(t)||(t=[]):t=[],{...e,names:t,subtasks:e.subtasks||[],notes:e.notes||[],labels:e.labels||[]}}function i(e){return e?Array.isArray(e)?e.join(","):String(e):""}n=(r.then?(await r)():r)[0];let T=`
  SELECT id, message, date, company, names,
    accountrep AS "accountRep", completed, description,
    createdat AS "createdAt", updatedat AS "updatedAt"
  FROM todos
`,p={async getTodos(){let e=s(),[t,a]=await Promise.all([e.query(`${T} WHERE completed = false ORDER BY date DESC`),e.query(`${T} WHERE completed = true ORDER BY date DESC`)]);return{active:t.rows.map(c),completed:a.rows.map(c)}},async addTodo(e){let t=s(),a=e.id||Date.now().toString();await t.query(`INSERT INTO todos (id, message, date, company, names, accountrep, completed, description)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,[a,e.message,e.date,e.company||"",i(e.names),e.accountRep||"",e.description||""]);let o=await t.query(`${T} WHERE id = $1`,[a]);return c(o.rows[0])},async updateTodo(e,t){let a=s(),o={message:"message",date:"date",company:"company",names:"names",accountRep:"accountrep",description:"description"},n=Object.keys(t).filter(e=>o[e]);if(n.length>0){let r=n.map((e,t)=>`${o[e]} = $${t+1}`).join(", "),s=n.map(e=>"names"===e?i(t[e]):t[e]);s.push(e),await a.query(`UPDATE todos SET ${r}, updatedat = CURRENT_TIMESTAMP WHERE id = $${s.length}`,s)}let r=await a.query(`${T} WHERE id = $1`,[e]);return c(r.rows[0])},async deleteTodo(e){let t=s();await t.query("DELETE FROM todos WHERE id = $1",[e])},async completeTodo(e){let t=s();await t.query("UPDATE todos SET completed = true, updatedat = CURRENT_TIMESTAMP WHERE id = $1",[e])},async uncompleteTodo(e){let t=s();await t.query("UPDATE todos SET completed = false, updatedat = CURRENT_TIMESTAMP WHERE id = $1",[e])},async saveTodos(e){let t=s(),a=e.active||[],o=e.completed||[],n=new Date().toISOString(),r=`
      INSERT INTO todos (id, message, date, company, names, accountrep, completed, description, createdat, updatedat)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,c=await t.connect();try{for(let e of(await c.query("BEGIN"),await c.query("DELETE FROM todos"),[...a,...o]))await c.query(r,[e.id,e.message,e.date,e.company||"",i(e.names),e.accountRep||e.accountrep||"",e.completed||!1,e.description||"",e.createdAt||e.createdat||n,e.updatedAt||e.updatedat||n]);await c.query("COMMIT")}catch(e){throw await c.query("ROLLBACK"),e}finally{c.release()}return e},async getTags(){let e=s(),t=await e.query("SELECT value FROM config WHERE key = 'tags_blob'");if(t.rows.length>0)try{return JSON.parse(t.rows[0].value)}catch{}let a=(await e.query("SELECT company, tagname FROM tags ORDER BY company, tagname")).rows;return{companies:[...new Set(a.map(e=>e.company).filter(Boolean))],accountExecutives:[],companyAssignments:{},companyTypes:{},labels:[]}},async saveTags(e){let t=s(),a=JSON.stringify(e);return(await t.query("SELECT key FROM config WHERE key = 'tags_blob'")).rows.length>0?await t.query("UPDATE config SET value = $1, updatedat = CURRENT_TIMESTAMP WHERE key = 'tags_blob'",[a]):await t.query("INSERT INTO config (key, value) VALUES ('tags_blob', $1)",[a]),e},async getContacts(){let e=s(),t=await e.query(`
      SELECT id, company, name, type, email, phone, notes,
        createdat AS "createdAt", updatedat AS "updatedAt"
      FROM contacts ORDER BY company, name
    `),a={};return t.rows.forEach(e=>{a[e.company]||(a[e.company]={}),a[e.company][e.name]||(a[e.company][e.name]=[]);let{company:t,name:o,...n}=e;a[t][o].push(n)}),a},async saveContacts(e){let t=s(),a=new Date().toISOString(),o=`
      INSERT INTO contacts (id, company, name, type, email, phone, notes, createdat, updatedat)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;if(await t.query("DELETE FROM contacts"),e&&e.companies)for(let[n,r]of Object.entries(e.companies))for(let e of r.contacts||[])await t.query(o,[e.id||`contact-${Date.now()}`,n,e.name,e.type||"person",e.email||"",e.phone||"",e.notes||"",e.createdAt||a,e.updatedAt||a]);else if(e){for(let[n,r]of Object.entries(e))if(!("object"!=typeof r||Array.isArray(r))){for(let[e,s]of Object.entries(r))if(Array.isArray(s))for(let r of s)await t.query(o,[r.id||`contact-${Date.now()}`,n,e,r.type||"person",r.email||"",r.phone||"",r.notes||"",r.createdAt||a,r.updatedAt||a])}}return e},async addContact(e,t){let a=s(),o=t.id||`contact-${Date.now()}`;return await a.query("INSERT INTO contacts (id, company, name, type, email, phone, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)",[o,e,t.name,t.type||"person",t.email||"",t.phone||"",t.notes||""]),{id:o,...t}},async updateContact(e,t,a){let o=s(),n=["name","type","email","phone","notes"],r=Object.keys(a).filter(e=>n.includes(e));if(r.length>0){let e=r.map((e,t)=>`${e} = $${t+1}`).join(", "),n=[...r.map(e=>a[e]),t];await o.query(`UPDATE contacts SET ${e}, updatedat = CURRENT_TIMESTAMP WHERE id = $${n.length}`,n)}return(await o.query("SELECT * FROM contacts WHERE id = $1",[t])).rows[0]},async deleteContact(e,t){let a=s();await a.query("DELETE FROM contacts WHERE id = $1 AND company = $2",[t,e])},async getConfig(){let e=s(),t=await e.query("SELECT key, value FROM config"),a={};return t.rows.forEach(e=>{try{a[e.key]=JSON.parse(e.value)}catch{a[e.key]=e.value}}),a},async updateConfig(e){let t=s();for(let[a,o]of Object.entries(e)){let e="string"==typeof o?o:JSON.stringify(o);(await t.query("SELECT key FROM config WHERE key = $1",[a])).rows.length>0?await t.query("UPDATE config SET value = $1, updatedat = CURRENT_TIMESTAMP WHERE key = $2",[e,a]):await t.query("INSERT INTO config (key, value) VALUES ($1, $2)",[a,e])}return this.getConfig()},async exportBackup(){let e=s(),[t,a,o,n]=await Promise.all([e.query("SELECT * FROM todos"),e.query("SELECT * FROM tags"),e.query("SELECT * FROM contacts"),this.getConfig()]);return{version:1,exportedAt:new Date().toISOString(),todos:t.rows,tags:a.rows,contacts:o.rows,config:n}},async importBackup(e){let t=s(),a=await t.connect();try{await a.query("BEGIN"),await a.query("DELETE FROM todos"),await a.query("DELETE FROM tags"),await a.query("DELETE FROM contacts"),await a.query("DELETE FROM config");let t=new Date().toISOString();if(Array.isArray(e.todos))for(let o of e.todos)await a.query(`INSERT INTO todos (id, message, date, company, names, accountrep, completed, description, createdat, updatedat)
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
    `);try{await e.query("ALTER TABLE todos ADD COLUMN IF NOT EXISTS description TEXT")}catch{}console.log("[DB] Tables ready")}};o()}catch(e){o(e)}})}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),o=t.X(0,[276,972],()=>a(2379));module.exports=o})();