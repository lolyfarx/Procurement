// بيانات النظام (تخزن في LocalStorage)
let users = JSON.parse(localStorage.getItem('users')) || [
    {user: 'admin', pass: '123', job: 'مدير النظام', perms: ['review','edit','cost','stop','approve','delete','admin']}
];
let orders = JSON.parse(localStorage.getItem('orders')) || [];
let currentUser = null;

// الأقسام والفروع
const depts = ["المشتريات", "الشركات", "الاستيراد", "الجملة", ...Array.from({length: 21}, (_, i) => "فرع " + (i + 1))];

window.onload = function() {
    const dSelect = document.getElementById('deptSelect');
    depts.forEach(d => { let opt = new Image(); opt = document.createElement('option'); opt.text = d; dSelect.add(opt); });
    if(localStorage.getItem('currentUser')) {
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
        loginSuccess();
    }
};

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    const user = users.find(x => x.user === u && x.pass === p);
    if(user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        loginSuccess();
    } else alert("خطأ في البيانات");
}

function loginSuccess() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appInterface').style.display = 'block';
    document.getElementById('currentUserName').innerText = currentUser.user;
    
    // إظهار القوائم حسب الصلاحية
    document.getElementById('navSettings').style.display = currentUser.perms.includes('admin') ? 'block' : 'none';
    document.getElementById('navOrders').style.display = (currentUser.perms.includes('review') || currentUser.perms.includes('admin')) ? 'block' : 'none';
    
    showSection('dashboard');
    initCharts();
}

function logout() {
    localStorage.removeItem('currentUser');
    location.reload();
}

function togglePassword() {
    const p = document.getElementById('password');
    p.type = p.type === 'password' ? 'text' : 'password';
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'purchaseOrder') renderPOPermissions();
    if(id === 'settings') renderUsers();
    if(id === 'orderManagement') renderOrdersManager();
}

// --- وظائف طلب الشراء ---
function autoFillHeader() {
    document.getElementById('poRequester').value = currentUser.user;
    document.getElementById('poJob').value = currentUser.job;
    document.getElementById('poTime').value = new Date().toLocaleString();
}

function addRow(data = ["" ,"", "", "", ""]) {
    const table = document.getElementById('poTable').getElementsByTagName('tbody')[0];
    const row = table.insertRow();
    const isLocked = !currentUser.perms.includes('edit') && !currentUser.perms.includes('admin');
    
    row.innerHTML = `
        <td>${table.rows.length}</td>
        <td><input type="text" value="${data[0]}" ${isLocked?'disabled':''}></td>
        <td><input type="text" value="${data[1]}" ${isLocked?'disabled':''}></td>
        <td><input type="text" value="${data[2]}" ${isLocked?'disabled':''}></td>
        <td><input type="text" value="${data[3]}" ${isLocked?'disabled':''}></td>
        <td class="cost-col"><input type="number" value="${data[4]}" ${isLocked?'disabled':''}></td>
        <td><button onclick="moveRow(this, -1)">↑</button> <button onclick="moveRow(this, 1)">↓</button></td>
        <td><button onclick="this.parentElement.parentElement.remove()">X</button></td>
    `;
    
    if(!currentUser.perms.includes('cost') && !currentUser.perms.includes('admin')) {
        document.querySelectorAll('.cost-col').forEach(c => c.style.display = 'none');
    }
}

function renderPOPermissions() {
    const container = document.getElementById('poPermissionsBtns');
    container.innerHTML = "";
    const pMap = {
        'review': { text: 'مراجعة', class: 'blue', icon: 'eye' },
        'edit': { text: 'تعديل وحفظ', class: 'orange', icon: 'save', fn: 'saveOrder()' },
        'stop': { text: 'إيقاف / تعليق', class: 'red', icon: 'pause' },
        'approve': { text: 'اعتماد / موافقة', class: 'green', icon: 'check' },
        'delete': { text: 'حذف', class: 'black', icon: 'trash' }
    };

    currentUser.perms.forEach(p => {
        if(pMap[p]) {
            let btn = document.createElement('button');
            btn.innerHTML = `<i class="fa fa-${pMap[p].icon}"></i> ${pMap[p].text}`;
            btn.className = pMap[p].class;
            if(pMap[p].fn) btn.onclick = () => eval(pMap[p].fn);
            container.appendChild(btn);
        }
    });
}

function moveRow(btn, dir) {
    const row = btn.parentNode.parentNode;
    const sibling = dir === -1 ? row.previousElementSibling : row.nextElementSibling;
    if (sibling) row.parentNode.insertBefore(dir === -1 ? row : sibling, dir === -1 ? sibling : row);
}

// --- Excel و الطباعة ---
function exportExcel() {
    let wb = XLSX.utils.table_to_book(document.getElementById('poTable'));
    XLSX.writeFile(wb, "PurchaseOrder_Nahdi.xlsx");
}

function importExcel(input) {
    let reader = new FileReader();
    reader.onload = function(e) {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, {type: 'array'});
        let sheet = workbook.Sheets[workbook.SheetNames[0]];
        let json = XLSX.utils.sheet_to_json(sheet, {header:1});
        json.slice(1).forEach(r => addRow([r[1], r[2], r[3], r[4], r[5]]));
    };
    reader.readAsArrayBuffer(input.files[0]);
}

// --- إدارة الطلبات ---
function saveOrder() {
    const rows = [];
    document.querySelectorAll('#poTable tbody tr').forEach(tr => {
        let inputs = tr.querySelectorAll('input');
        rows.push({brand: inputs[0].value, w: inputs[1].value, h: inputs[2].value, r: inputs[3].value, cost: inputs[4].value});
    });
    
    let order = {
        id: Date.now(),
        requester: currentUser.user,
        dept: document.getElementById('deptSelect').value,
        data: rows,
        status: 'قيد الدراسة',
        notes: ''
    };
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    alert("تم حفظ الطلب وإرساله للإدارة");
}

function renderOrdersManager() {
    const tbody = document.querySelector('#ordersManagerTable tbody');
    tbody.innerHTML = "";
    orders.forEach((o, index) => {
        tbody.innerHTML += `
            <tr>
                <td>طلب #${o.id}</td>
                <td>${o.requester}</td>
                <td>${o.dept}</td>
                <td>${o.status}</td>
                <td><input type="text" value="${o.notes}" onchange="updateOrderNote(${index}, this.value)"></td>
                <td>
                    <button onclick="actionOrder(${index}, 'مقبول')">قبول</button>
                    <button onclick="actionOrder(${index}, 'معلق')">تعليق</button>
                    <button onclick="actionOrder(${index}, 'مرفوض')">رفض</button>
                    <button onclick="deleteOrder(${index})">حذف</button>
                </td>
            </tr>
        `;
    });
}

function actionOrder(i, status) {
    orders[i].status = status;
    localStorage.setItem('orders', JSON.stringify(orders));
    renderOrdersManager();
}

function deleteOrder(i) {
    orders.splice(i, 1);
    localStorage.setItem('orders', JSON.stringify(orders));
    renderOrdersManager();
}

// --- الإحصائيات ---
function initCharts() {
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    new Chart(ctxLine, {
        type: 'line',
        data: { labels: ['يناير', 'فبراير', 'مارس'], datasets: [{ label: 'حركة المشتريات', data: [10, 25, 15], borderColor: '#004a99' }] }
    });
    
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    new Chart(ctxPie, {
        type: 'pie',
        data: { labels: depts.slice(0, 5), datasets: [{ data: [30, 20, 10, 15, 25], backgroundColor: ['red','blue','green','orange','purple'] }] }
    });
}

// --- إعدادات المستخدمين والمظهر ---
function changeTheme() {
    const color = document.getElementById('themeColor').value;
    const size = document.getElementById('fontSize').value;
    document.documentElement.style.setProperty('--main-color', color);
    document.documentElement.style.setProperty('--font-size', size + 'px');
}

function addUser() {
    const u = document.getElementById('newUname').value;
    const p = document.getElementById('newPass').value;
    const j = document.getElementById('newJob').value;
    const perms = Array.from(document.querySelectorAll('#permissionCheckboxes input:checked')).map(c => c.value);
    
    const idx = users.findIndex(x => x.user === u);
    if(idx > -1) users[idx] = {user:u, pass:p, job:j, perms:perms};
    else users.push({user:u, pass:p, job:j, perms:perms});
    
    localStorage.setItem('users', JSON.stringify(users));
    renderUsers();
}

function renderUsers() {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = "";
    users.forEach((u, i) => {
        tbody.innerHTML += `<tr><td>${u.user}</td><td>${u.job}</td><td>${u.perms.join(',')}</td><td><button onclick="deleteUser(${i})">X</button></td></tr>`;
    });
}

function deleteUser(i) { users.splice(i,1); localStorage.setItem('users', JSON.stringify(users)); renderUsers(); }