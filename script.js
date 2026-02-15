// --- 1. البيانات الأساسية ---
let users = JSON.parse(localStorage.getItem('erp_users')) || [
    { u: 'admin', p: '123', j: 'المدير العام', perms: ['admin', 'review', 'edit', 'cost', 'stop', 'approve', 'delete'] }
];
let orders = JSON.parse(localStorage.getItem('erp_orders')) || [];
let currentUser = null;

const departments = ["المشتريات", "الشركات", "الاستيراد", "الجملة", ...Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`)];

// --- 2. إدارة الدخول والأمان ---
window.onload = () => {
    // تعبئة الأقسام
    const dSelect = document.getElementById('deptSelect');
    departments.forEach(d => { let opt = document.createElement('option'); opt.text = d; dSelect.add(opt); });
    
    // فحص الجلسة الحالية
    if(sessionStorage.getItem('loggedUser')) {
        currentUser = JSON.parse(sessionStorage.getItem('loggedUser'));
        launchApp();
    }
};

document.getElementById('togglePass').onclick = function() {
    let p = document.getElementById('passIn');
    p.type = p.type === "password" ? "text" : "password";
    this.classList.toggle('fa-eye-slash');
};

function login() {
    const u = document.getElementById('userIn').value;
    const p = document.getElementById('passIn').value;
    const user = users.find(x => x.u === u && x.p === p);
    if(user) {
        currentUser = user;
        sessionStorage.setItem('loggedUser', JSON.stringify(user));
        launchApp();
    } else alert("خطأ في اسم المستخدم أو كلمة المرور");
}

function launchApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUserNameDisplay').innerText = currentUser.u;
    
    // التحكم في القوائم
    document.getElementById('menuSettings').style.display = currentUser.perms.includes('admin') ? 'flex' : 'none';
    document.getElementById('menuOrderMgmt').style.display = (currentUser.perms.includes('review') || currentUser.perms.includes('admin')) ? 'flex' : 'none';
    
    initCharts();
    showSec('dash');
}

function logout() { sessionStorage.clear(); location.reload(); }

// --- 3. التنقل والصلاحيات ---
function showSec(id) {
    document.querySelectorAll('.section-view').forEach(s => s.style.display = 'none');
    document.getElementById('sec-' + id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    if(id === 'po') renderAuthBtns();
    if(id === 'mgmt') renderMgmtTable();
    if(id === 'settings') renderUsersList();
}

function renderAuthBtns() {
    const container = document.getElementById('dynamicAuthBtns');
    container.innerHTML = "";
    const map = {
        'review': { t: 'مراجعة', c: '#17a2b8', i: 'eye' },
        'edit': { t: 'حفظ وتعديل', c: '#ffc107', i: 'save', fn: 'savePO()' },
        'stop': { t: 'إيقاف / تعليق', c: '#343a40', i: 'pause' },
        'approve': { t: 'موافقة نهائية', c: '#28a745', i: 'check-double' },
        'delete': { t: 'حذف الطلب', c: '#dc3545', i: 'trash' }
    };

    currentUser.perms.forEach(p => {
        if(map[p]) {
            let btn = document.createElement('button');
            btn.className = "no-print";
            btn.style = `background:${map[p].c}; color:white; border:none; padding:10px 20px; border-radius:30px; cursor:pointer; font-weight:bold;`;
            btn.innerHTML = `<i class="fa fa-${map[p].i}"></i> ${map[p].t}`;
            if(map[p].fn) btn.setAttribute('onclick', map[p].fn);
            container.appendChild(btn);
        }
    });

    // إخفاء التكلفة
    const costCols = document.querySelectorAll('.cost-col');
    const showCost = currentUser.perms.includes('cost') || currentUser.perms.includes('admin');
    costCols.forEach(c => c.style.display = showCost ? 'table-cell' : 'none');
}

// --- 4. وظائف طلب الشراء والجدول ---
function autoFillHeader() {
    document.getElementById('autoUser').value = currentUser.u;
    document.getElementById('autoJob').value = currentUser.j;
    document.getElementById('autoTime').value = new Date().toLocaleString('ar-EG');
}

function addRow(data = ['', '', '', '', 0]) {
    const tbody = document.querySelector('#poTable tbody');
    const row = tbody.insertRow();
    const canEdit = currentUser.perms.includes('edit') || currentUser.perms.includes('admin');

    row.innerHTML = `
        <td>${tbody.rows.length}</td>
        <td><input type="text" value="${data[0]}" ${!canEdit?'readonly':''}></td>
        <td>
            <input type="text" placeholder="W" style="width:50px" value="${data[1]}" ${!canEdit?'readonly':''}>
            <input type="text" placeholder="H" style="width:50px" value="${data[2]}" ${!canEdit?'readonly':''}>
            <input type="text" placeholder="R" style="width:50px" value="${data[3]}" ${!canEdit?'readonly':''}>
        </td>
        <td class="cost-col"><input type="number" value="${data[4]}" ${!canEdit?'readonly':''}></td>
        <td class="no-print"><button onclick="moveRow(this, -1)">↑</button> <button onclick="moveRow(this, 1)">↓</button></td>
        <td class="no-print"><button onclick="this.parentElement.parentElement.remove()" style="color:red">X</button></td>
    `;
    renderAuthBtns();
}

function moveRow(btn, dir) {
    const row = btn.closest('tr');
    if(dir === -1 && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
    if(dir === 1 && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
}

function savePO() {
    let items = [];
    document.querySelectorAll('#poTable tbody tr').forEach(tr => {
        let ins = tr.querySelectorAll('input');
        items.push({ b: ins[0].value, w: ins[1].value, h: ins[2].value, r: ins[3].value, c: ins[4].value });
    });
    let order = {
        id: "PO-" + Math.floor(Math.random()*10000),
        dept: document.getElementById('deptSelect').value,
        user: currentUser.u,
        status: 'قيد المراجعة',
        notes: '',
        items: items
    };
    orders.push(order);
    localStorage.setItem('erp_orders', JSON.stringify(orders));
    alert("تم حفظ الطلب وإرساله بنجاح.");
}

// --- 5. إدارة الطلبات والبت ---
function renderMgmtTable() {
    const tbody = document.querySelector('#mgmtTable tbody');
    tbody.innerHTML = "";
    orders.forEach((o, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${o.id}</td>
                <td>${o.dept}</td>
                <td>${o.user}</td>
                <td id="status-${i}"><b>${o.status}</b></td>
                <td><input type="text" value="${o.notes}" onchange="orders[${i}].notes=this.value; saveOrders();"></td>
                <td>
                    <button onclick="decide(${i}, 'مقبول')" style="background:green; color:white;">قبول</button>
                    <button onclick="decide(${i}, 'معلق')" style="background:orange;">تعليق</button>
                    <button onclick="decide(${i}, 'مرفوض')" style="background:red; color:white;">رفض</button>
                    <button onclick="orders.splice(${i},1); saveOrders(); renderMgmtTable();">حذف</button>
                </td>
            </tr>
        `;
    });
}
function decide(i, s) { orders[i].status = s; saveOrders(); renderMgmtTable(); }
function saveOrders() { localStorage.setItem('erp_orders', JSON.stringify(orders)); }

// --- 6. الإحصائيات الزمنية ---
function initCharts() {
    const ctxL = document.getElementById('lineChart').getContext('2d');
    new Chart(ctxL, {
        type: 'line',
        data: { labels: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'], datasets: [{label: 'حركة الطلبات', data: [12, 19, 3, 5, 2], borderColor: '#004a99'}] }
    });
    const ctxP = document.getElementById('pieChart').getContext('2d');
    new Chart(ctxP, {
        type: 'doughnut',
        data: { labels: ['مشتريات','شركات','فروع'], datasets: [{data: [40, 20, 40], backgroundColor: ['#004a99', '#ffc107', '#28a745']}] }
    });
}

// --- 7. الإعدادات والمستخدمين ---
function applyTheme() {
    document.documentElement.style.setProperty('--primary-color', document.getElementById('setThemeColor').value);
    document.documentElement.style.setProperty('--font-size', document.getElementById('setFontSize').value + 'px');
}

function addUser() {
    const u = document.getElementById('newUname').value;
    const p = document.getElementById('newPass').value;
    const j = document.getElementById('newJob').value;
    const perms = Array.from(document.querySelectorAll('#permsSelection input:checked')).map(c => c.value);
    if(!u || !p) return alert("أكمل البيانات");
    users.push({ u, p, j, perms });
    localStorage.setItem('erp_users', JSON.stringify(users));
    renderUsersList();
}

function renderUsersList() {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = "";
    users.forEach((u, i) => {
        tbody.innerHTML += `<tr><td>${u.u}</td><td>${u.j}</td><td>${u.perms.join(', ')}</td><td><button onclick="users.splice(${i},1); localStorage.setItem('erp_users', JSON.stringify(users)); renderUsersList();">حذف</button></td></tr>`;
    });
}

// --- 8. تكامل EXCEL ---
function exportExcel() {
    let wb = XLSX.utils.table_to_book(document.getElementById('poTable'));
    XLSX.writeFile(wb, "Nahdi_Purchase_Order.xlsx");
}

function importExcel(input) {
    let reader = new FileReader();
    reader.onload = function(e) {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, {type: 'array'});
        let json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:1});
        json.slice(1).forEach(r => addRow([r[1], r[2], r[3], r[4], r[5]]));
    };
    reader.readAsArrayBuffer(input.files[0]);
}