require("dotenv").config();
const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, "users.db"));

db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  company TEXT, address TEXT, city TEXT, state TEXT, country TEXT, pincode TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
)`);

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "change-me",
  resave:false, saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:false}
}));
app.use(express.static(path.join(__dirname,"public")));

app.post("/api/register",(req,res)=>{
  const {name,email,mobile,company,address,city,state,country,pincode}=req.body;
  if(!name || !email || !mobile)
    return res.status(400).json({success:false,message:"Name, email and mobile are required."});

  const result=db.prepare(`INSERT INTO users
    (name,email,mobile,company,address,city,state,country,pincode)
    VALUES (@name,@email,@mobile,@company,@address,@city,@state,@country,@pincode)`).run({
      name:String(name).trim(), email:String(email).trim(), mobile:String(mobile).trim(),
      company:company||"", address:address||"", city:city||"", state:state||"",
      country:country||"", pincode:pincode||""
    });

  res.json({success:true,id:result.lastInsertRowid,message:"Details submitted successfully."});
});

function adminOnly(req,res,next){
  if(req.session.admin) return next();
  res.redirect("/admin/login");
}

app.get("/admin/login",(req,res)=>res.sendFile(path.join(__dirname,"public","admin-login.html")));

app.post("/admin/login",(req,res)=>{
  if(req.body.username===process.env.ADMIN_USERNAME &&
     req.body.password===process.env.ADMIN_PASSWORD){
    req.session.admin=true; return res.redirect("/admin");
  }
  res.status(401).send('<h2>Invalid login</h2><a href="/admin/login">Try again</a>');
});

app.get("/admin/logout",(req,res)=>req.session.destroy(()=>res.redirect("/admin/login")));

app.get("/admin",adminOnly,(req,res)=>{
  const users=db.prepare("SELECT * FROM users ORDER BY id DESC").all();
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const rows=users.map(u=>`<tr>
    <td>${esc(u.id)}</td><td>${esc(u.name)}</td><td>${esc(u.email)}</td>
    <td>${esc(u.mobile)}</td><td>${esc(u.company)}</td><td>${esc(u.address)}</td>
    <td>${esc(u.city)}</td><td>${esc(u.state)}</td><td>${esc(u.country)}</td>
    <td>${esc(u.pincode)}</td><td>${esc(u.created_at)}</td></tr>`).join("");

  res.send(`<!doctype html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin Dashboard</title>
  <style>
  body{font-family:Arial;margin:0;background:#f4f6fa;color:#172033}
  header{background:#173b8f;color:white;padding:18px 24px;display:flex;justify-content:space-between}
  header a{color:white}.wrap{padding:24px}.card{background:white;padding:18px;border-radius:12px;overflow:auto}
  table{border-collapse:collapse;width:100%;min-width:1100px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}
  th{background:#eef3ff}
  </style></head><body><header><b>Admin Dashboard</b><a href="/admin/logout">Logout</a></header>
  <div class="wrap"><div class="card"><h2>User Registrations (${users.length})</h2>
  <table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Mobile</th><th>Company</th>
  <th>Address</th><th>City</th><th>State</th><th>Country</th><th>PIN</th><th>Submitted</th></tr></thead>
  <tbody>${rows||'<tr><td colspan="11">No registrations yet.</td></tr>'}</tbody></table>
  </div></div></body></html>`);
});

app.listen(PORT,()=>console.log(`Running on http://localhost:${PORT}`));
