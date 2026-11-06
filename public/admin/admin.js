let token=localStorage.getItem("pc_admin_token")||"",currentPage="overview";
const $=s=>document.querySelector(s), money=n=>"₹"+Number(n||0).toLocaleString("en-IN");
async function api(path,options={}){const res=await fetch("/api"+path,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(options.headers||{})},credentials:"include"});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||"Request failed");return data}
function notice(msg,bad=false){const n=$("#notice");n.textContent=msg;n.className="notice"+(bad?" bad":"");setTimeout(()=>n.classList.add("hidden"),4000)}
function showApp(){ $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");loadPage("overview")}
function showLogin(){ $("#appView").classList.add("hidden");$("#loginView").classList.remove("hidden")}
$("#toggleAdminPassword").onclick=()=>{const input=$("#password"),show=input.type==="password";input.type=show?"text":"password";$("#toggleAdminPassword").textContent=show?"HIDE":"SHOW";$("#toggleAdminPassword").setAttribute("aria-label",show?"Hide password":"Show password")};
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();$("#loginError").textContent="";try{const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email:$("#email").value,password:$("#password").value})});if(d.user.role!=="admin")throw new Error("This account does not have admin permissions");token=d.accessToken;localStorage.setItem("pc_admin_token",token);showApp()}catch(err){$("#loginError").textContent=err.message}});
$("#logout").onclick=async()=>{try{await api("/auth/logout",{method:"POST"})}catch{}token="";localStorage.removeItem("pc_admin_token");showLogin()};
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>loadPage(b.dataset.page));
async function loadPage(page){currentPage=page;document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#pageTitle").textContent=({overview:"Overview",orders:"Orders",products:"Products",inventory:"Inventory",customers:"Customers"})[page];try{if(page==="overview")await overview();if(page==="orders")await orders();if(page==="products")await products();if(page==="inventory")await inventory();if(page==="customers")await customers()}catch(e){if(/token|auth|401/i.test(e.message)){token="";localStorage.removeItem("pc_admin_token");showLogin()}else notice(e.message,true)}}
function table(headers,rows){return `<div class="table-panel"><div class="table-wrap"><table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}" class="empty">Nothing here yet.</td></tr>`}</tbody></table></div></div>`}
function statusPill(s){return `<span class="pill ${s}">${s}</span>`}
async function overview(){const d=await api("/dashboard/summary"),s=d.summary;$("#pageContent").innerHTML=`<div class="stats"><div class="stat"><span>REVENUE · LAST 30 DAYS</span><strong>${money(s.revenue30Days)}</strong><small>Recorded order value · not payment settlement</small></div><div class="stat"><span>ORDERS · LAST 30 DAYS</span><strong>${s.orders30Days}</strong><small>${s.totalOrders} all-time orders</small></div><div class="stat"><span>CUSTOMERS</span><strong>${s.customers}</strong><small>Registered customer accounts</small></div><div class="stat"><span>LOW STOCK VARIANTS</span><strong>${s.lowStockVariants}</strong><small>At or below 5 units</small></div></div><div class="panel-grid"><div class="panel"><h3>Recent orders</h3>${d.recentOrders.length?d.recentOrders.map(o=>`<div class="bar-row"><span>${o.orderNumber}</span><div>${o.customerSnapshot.name}<br><small class="muted-cell">${new Date(o.createdAt).toLocaleDateString()}</small></div><b>${money(o.total)}</b></div>`).join(""):`<div class="empty">Orders will appear here.</div>`}</div><div class="panel"><h3>Order status</h3>${d.statusCounts.length?d.statusCounts.map(x=>`<div class="bar-row"><span>${x._id}</span><div class="bar"><i style="width:${Math.min(100,x.count/Math.max(1,s.totalOrders)*100)}%"></i></div><b>${x.count}</b></div>`).join(""):`<div class="empty">No order data yet.</div>`}</div></div>`}
async function orders(){const d=await api("/orders");const rows=d.items.map(o=>`<tr><td><strong>${o.orderNumber}</strong><br><small class="muted-cell">${new Date(o.createdAt).toLocaleString()}</small></td><td>${o.customerSnapshot.name}<br><small class="muted-cell">${o.customerSnapshot.email}</small></td><td>${o.items.reduce((s,i)=>s+i.quantity,0)} items</td><td><strong>${money(o.total)}</strong></td><td>${statusPill(o.status)}</td><td><button class="btn" data-order="${o._id}">Manage</button></td></tr>`).join("");$("#pageContent").innerHTML=`<div class="toolbar"><input id="orderSearch" placeholder="Search order, name or email"><select id="orderStatus"><option value="">All statuses</option>${["placed","confirmed","processing","packed","shipped","delivered","cancelled"].map(s=>`<option>${s}</option>`).join("")}</select><button class="btn" id="orderFilter">FILTER</button></div>${table(["ORDER","CUSTOMER","ITEMS","TOTAL","STATUS","ACTION"],rows)}`;$("#orderFilter").onclick=async()=>{const q=$("#orderSearch").value,st=$("#orderStatus").value,dd=await api("/orders?search="+encodeURIComponent(q)+"&status="+encodeURIComponent(st));$("#pageContent").querySelector("tbody").innerHTML=dd.items.map(o=>`<tr><td><strong>${o.orderNumber}</strong></td><td>${o.customerSnapshot.name}<br><small>${o.customerSnapshot.email}</small></td><td>${o.items.length} lines</td><td>${money(o.total)}</td><td>${statusPill(o.status)}</td><td><button class="btn" data-order="${o._id}">Manage</button></td></tr>`).join("")||`<tr><td colspan="6" class="empty">No matching orders.</td></tr>`};$("#pageContent").addEventListener("click",e=>{const b=e.target.closest("[data-order]");if(b)manageOrder(b.dataset.order)})}
async function manageOrder(id){const {order:o}=await api("/orders/"+id);modal(`<h3>Order ${o.orderNumber}</h3><p>${o.customerSnapshot.name} · ${o.customerSnapshot.email}</p><p>${o.items.map(i=>`${i.quantity} × ${i.productName} (${i.variantLabel}) — ${money(i.lineTotal)}`).join("<br>")}</p><p><b>Total: ${money(o.total)}</b> · Payment: ${String(o.paymentMethod||"cod").toUpperCase()} — ${o.paymentStatus}</p><label>Update status<select id="newStatus">${["placed","confirmed","processing","packed","shipped","delivered","cancelled"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></label><label style="margin-top:12px">Internal note<textarea id="statusNote" rows="3" placeholder="Optional note for the order history"></textarea></label><div class="modal-actions"><button class="btn" id="modalClose">CLOSE</button><button class="btn primary-small" id="saveStatus">SAVE STATUS</button></div>`);$("#modalClose").onclick=closeModal;$("#saveStatus").onclick=async()=>{try{await api(`/orders/${id}/status`,{method:"PATCH",body:JSON.stringify({status:$("#newStatus").value,note:$("#statusNote").value})});closeModal();notice("Order status updated.");loadPage("orders")}catch(e){notice(e.message,true)}}}
async function products(){
 const d=await api("/products?admin=true&limit=100");
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const rows=d.items.map(p=>{
  const photo=p.images?.[0];
  return `<tr><td><div class="product-table-cell">${photo?`<img src="${esc(photo)}" alt="" class="product-table-image">`:'<span class="product-table-image empty-photo">IMG</span>'}<div><strong>${esc(p.name)}</strong><br><small class="muted-cell">${esc(p.slug)}</small></div></div></td><td>${esc(p.category?.name||"—")}</td><td>${p.variants.length} variants</td><td>${p.variants.reduce((s,v)=>s+v.stock,0)}</td><td>${p.isPublished?statusPill("published"):statusPill("draft")}</td><td><button class="btn" data-edit-product="${p._id}">Edit product</button></td></tr>`;
 }).join("");
 $("#pageContent").innerHTML=`<div class="products-admin-heading"><div><h3>Product catalogue</h3><p class="muted-cell">Add product photography, descriptions, prices, variants and stock in one place.</p></div><button class="btn primary-small" id="addProduct">+ ADD PRODUCT</button></div><div class="toolbar"><input id="productSearch" placeholder="Search products by name, category or SKU"></div>${table(["PRODUCT","CATEGORY","VARIANTS","TOTAL STOCK","VISIBILITY","ACTION"],rows)}`;
 $("#addProduct").onclick=()=>productModal();
 $("#pageContent").addEventListener("click",async e=>{
  const btn=e.target.closest("[data-edit-product]");if(!btn)return;
  try{const {product}=await api("/products/"+btn.dataset.editProduct+"?admin=true");productModal(product)}catch(err){notice(err.message,true)}
 });
 $("#productSearch").oninput=e=>{const q=e.target.value.toLowerCase();$("#pageContent tbody").querySelectorAll("tr").forEach(row=>row.style.display=row.textContent.toLowerCase().includes(q)?"":"none")};
}
async function productModal(p={}){
 const {categories}=await api("/categories?admin=true");
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const initialImages=(p.images||[]).join("\n");
 modal(`<div class="product-editor">
  <div class="editor-heading"><div><span class="eyebrow">CATALOGUE MANAGEMENT</span><h3>${p._id?"Edit product":"Add a new product"}</h3><p class="muted-cell">Complete the product details, upload photographs and manage every sellable size.</p></div><button class="btn" id="modalClose">CLOSE ×</button></div>
  <div class="editor-section"><h4>Basic information</h4><div class="modal-grid">
   <label>Product name *<input id="pName" maxlength="160" required value="${esc(p.name||"")}" placeholder="e.g. Ghee Mysore Pak"></label>
   <label>Product slug *<input id="pSlug" required value="${esc(p.slug||"")}" placeholder="ghee-mysore-pak"></label>
   <label>Category *<select id="pCategory">${categories.map(c=>`<option value="${c._id}" ${String(c._id)===String(p.category?._id||p.category||"")?"selected":""}>${esc(c.name)}</option>`).join("")}</select></label>
   <label>Visibility<select id="pPublished"><option value="true" ${p.isPublished!==false?"selected":""}>Published — visible in shop</option><option value="false" ${p.isPublished===false?"selected":""}>Draft — hidden from shop</option></select></label>
  </div><label class="editor-full">Product description<textarea id="pDescription" rows="4" maxlength="2000" placeholder="Describe ingredients, flavour, origin, storage and what makes this product special.">${esc(p.description||"")}</textarea></label>
  <label class="editor-check"><input id="pFeatured" type="checkbox" ${p.featured?"checked":""}> Feature this product on the storefront</label></div>
  <div class="editor-section"><h4>Product photographs</h4><p class="muted-cell">Upload JPG, PNG or WEBP images (maximum 5 MB each), or paste image URLs below. First image is the main product photo.</p>
   <div class="upload-row"><input id="pImageFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple><button class="btn" id="uploadProductImages" type="button">UPLOAD SELECTED PHOTOS</button><span id="uploadStatus" class="muted-cell"></span></div>
   <label class="editor-full">Image URLs — one URL or local image path per line<textarea id="pImages" rows="3" placeholder="/images/uploads/product-photo.jpg">${esc(initialImages)}</textarea></label>
   <div id="imagePreviewGrid" class="image-preview-grid"></div>
  </div>
  <div class="editor-section"><div class="editor-section-heading"><div><h4>Variants, pricing & stock</h4><p class="muted-cell">Add a separate row for every pack size or option you sell.</p></div><button class="btn" id="addProductVariant" type="button">+ ADD VARIANT</button></div>
   <div id="productVariantRows" class="product-variant-rows"></div>
  </div>
  <div class="editor-actions"><button class="btn danger-outline" id="deleteProduct" type="button" ${p._id?"":"hidden"}>DELETE PRODUCT</button><span></span><button class="btn" id="cancelProduct" type="button">CANCEL</button><button class="btn primary-small" id="saveProduct" type="button">SAVE PRODUCT</button></div>
 </div>`);
 $("#modalClose").onclick=closeModal;$("#cancelProduct").onclick=closeModal;
 const variantRows=$("#productVariantRows");
 const variants=p.variants?.length?p.variants:[{label:"200 g",price:0,stock:0,sku:"",isActive:true}];
 function addVariantRow(v={}){
  const row=document.createElement("div");row.className="variant-editor-row";row.dataset.originalStock=String(Number(v.stock||0));
  row.innerHTML=`<input class="v-id" type="hidden" value="${esc(v._id||"")}"><label>Size / option<input class="v-label" required maxlength="80" value="${esc(v.label||"")}" placeholder="200 g"></label><label>SKU<input class="v-sku" maxlength="80" value="${esc(v.sku||"")}" placeholder="SKU-001"></label><label>Price (₹)<input class="v-price" type="number" min="0" step="0.01" required value="${Number(v.price??0)}"></label><label>Stock<input class="v-stock" type="number" min="0" step="1" required value="${Number(v.stock??0)}"></label><label class="v-active"><input class="v-isactive" type="checkbox" ${v.isActive!==false?"checked":""}> Active</label><button class="btn remove-variant" type="button" aria-label="Remove variant">×</button>`;
  row.querySelector(".remove-variant").onclick=()=>{if(variantRows.children.length===1){notice("A product must have at least one variant.",true);return}if(row.querySelector(".v-id").value&&Number(row.dataset.originalStock)>0){notice("Save this variant with zero stock first. Then reopen the product to remove it safely.",true);return}row.remove()};
  variantRows.append(row);
 }
 variants.forEach(addVariantRow);
 $("#addProductVariant").onclick=()=>addVariantRow({label:"",price:0,stock:0,sku:"",isActive:true});
 function previewImages(){
  const urls=$("#pImages").value.split("\n").map(x=>x.trim()).filter(Boolean);
  $("#imagePreviewGrid").innerHTML=urls.map((url,i)=>`<div class="image-preview"><img src="${esc(url)}" alt="Product image ${i+1}" onerror="this.parentElement.classList.add('broken-image')"><span>IMAGE ${i+1}</span></div>`).join("");
 }
 $("#pImages").oninput=previewImages;previewImages();
 $("#pName").oninput=()=>{const slug=$("#pSlug");if(!slug.dataset.touched)slug.value=$("#pName").value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")};
 $("#pSlug").oninput=()=>{$("#pSlug").dataset.touched="1"};
 $("#uploadProductImages").onclick=async()=>{
  const files=[...($("#pImageFiles").files||[])];if(!files.length)return notice("Choose one or more image files first.",true);
  const btn=$("#uploadProductImages"),status=$("#uploadStatus");btn.disabled=true;
  try{
   for(let i=0;i<files.length;i++){
    const file=files[i];if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024)throw new Error(file.name+" must be JPG, PNG or WEBP and 5 MB or smaller.");
    status.textContent="Uploading "+(i+1)+" of "+files.length+"…";
    const res=await fetch("/api/uploads/image",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":file.type},body:file,credentials:"include"});
    const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||"Image upload failed");
    const current=$("#pImages").value.trim();$("#pImages").value=(current?current+"\n":"")+data.url;
   }
   $("#pImageFiles").value="";previewImages();status.textContent="Upload complete.";
  }catch(err){status.textContent="";notice(err.message,true)}finally{btn.disabled=false}
 };
 $("#saveProduct").onclick=async()=>{
  const save=$("#saveProduct");save.disabled=true;save.textContent="SAVING…";
  try{
   const name=$("#pName").value.trim(),slug=$("#pSlug").value.trim(),category=$("#pCategory").value;
   const variantData=[...variantRows.querySelectorAll(".variant-editor-row")].map(row=>({
    ...(row.querySelector(".v-id").value?{_id:row.querySelector(".v-id").value}:{}),
    label:row.querySelector(".v-label").value.trim(),sku:row.querySelector(".v-sku").value.trim(),
    price:Number(row.querySelector(".v-price").value),stock:Number(row.querySelector(".v-stock").value),
    isActive:row.querySelector(".v-isactive").checked
   }));
   if(name.length<2||!slug||!category)throw new Error("Enter product name, slug and category.");
   if(!variantData.length||variantData.some(v=>!v.label||!Number.isFinite(v.price)||v.price<0||!Number.isInteger(v.stock)||v.stock<0))throw new Error("Check each variant's size, price and stock.");
   const images=$("#pImages").value.split("\n").map(x=>x.trim()).filter(Boolean);
   const payload={name,slug,category,description:$("#pDescription").value.trim(),images,featured:$("#pFeatured").checked,isPublished:$("#pPublished").value==="true",variants:variantData};
   await api(p._id?"/products/"+p._id:"/products",{method:p._id?"PATCH":"POST",body:JSON.stringify(payload)});
   closeModal();notice("Product saved. Storefront catalogue updated.");loadPage("products");
  }catch(err){notice(err.message,true);save.disabled=false;save.textContent="SAVE PRODUCT"}
 };
 $("#deleteProduct").onclick=async()=>{
  if(!p._id||!confirm("Delete this product permanently? This cannot be undone."))return;
  try{await api("/products/"+p._id,{method:"DELETE"});closeModal();notice("Product deleted.");loadPage("products")}catch(err){notice(err.message,true)}
 };
}
async function inventory(){const d=await api("/inventory");const rows=d.items.map(v=>`<tr><td><strong>${v.productName}</strong></td><td>${v.label}</td><td>${v.sku||"—"}</td><td class="${v.stock<=5?"low":""}">${v.stock}</td><td><button class="btn" data-stock="${v.productId}" data-variant="${v.variantId}" data-name="${v.productName}">Adjust stock</button></td></tr>`).join("");$("#pageContent").innerHTML=`<div class="toolbar"><span class="muted-cell">Stock changes are logged with an admin and reason.</span></div>${table(["PRODUCT","VARIANT","SKU","AVAILABLE","ACTION"],rows)}`;$("#pageContent").addEventListener("click",e=>{const b=e.target.closest("[data-stock]");if(b)stockModal(b.dataset.stock,b.dataset.variant,b.dataset.name)})}
function stockModal(pid,vid,name){modal(`<h3>Adjust inventory</h3><p>${name}</p><label>Change in stock (+ receive / − remove)<input id="stockChange" type="number" step="1" value="1"></label><label style="margin-top:12px">Reason<input id="stockReason" placeholder="e.g. New supplier shipment"></label><div class="modal-actions"><button class="btn" id="modalClose">CANCEL</button><button class="btn primary-small" id="saveStock">SAVE CHANGE</button></div>`);$("#modalClose").onclick=closeModal;$("#saveStock").onclick=async()=>{try{await api(`/inventory/${pid}/${vid}`,{method:"PATCH",body:JSON.stringify({change:Number($("#stockChange").value),reason:$("#stockReason").value})});closeModal();notice("Inventory updated and logged.");loadPage("inventory")}catch(e){notice(e.message,true)}}}
async function customers(){const d=await api("/customers");const rows=d.items.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.email}</td><td>${c.phone||"—"}</td><td>${new Date(c.createdAt).toLocaleDateString()}</td><td>${c.isActive?statusPill("active"):statusPill("cancelled")}</td><td><button class="btn" data-customer="${c._id}" data-active="${c.isActive}">${c.isActive?"Disable":"Enable"}</button></td></tr>`).join("");$("#pageContent").innerHTML=`<div class="toolbar"><input id="customerSearch" placeholder="Search customers"><button class="btn" id="customerFilter">SEARCH</button></div>${table(["CUSTOMER","EMAIL","PHONE","JOINED","ACCOUNT","ACTION"],rows)}`;$("#customerFilter").onclick=async()=>{const dd=await api("/customers?search="+encodeURIComponent($("#customerSearch").value));$("#pageContent tbody").innerHTML=dd.items.map(c=>`<tr><td>${c.name}</td><td>${c.email}</td><td>${c.phone||"—"}</td><td>${new Date(c.createdAt).toLocaleDateString()}</td><td>${c.isActive?"Active":"Disabled"}</td><td><button class="btn" data-customer="${c._id}" data-active="${c.isActive}">${c.isActive?"Disable":"Enable"}</button></td></tr>`).join("")};$("#pageContent").addEventListener("click",async e=>{const b=e.target.closest("[data-customer]");if(b){try{await api("/customers/"+b.dataset.customer,{method:"PATCH",body:JSON.stringify({isActive:b.dataset.active!=="true"})});notice("Customer account updated.");loadPage("customers")}catch(err){notice(err.message,true)}}})}
function modal(html){closeModal();const wrap=document.createElement("div");wrap.id="modalWrap";wrap.className="modal-backdrop";wrap.innerHTML=`<div class="modal">${html}</div>`;document.body.append(wrap);wrap.addEventListener("click",e=>{if(e.target===wrap)closeModal()})}function closeModal(){$("#modalWrap")?.remove()}
if(token)showApp();else showLogin();
