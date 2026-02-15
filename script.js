// ==========================================
// 1. البيانات الأساسية وحساب الـ Admin
// ==========================================
const MASTER_USER = "admin";
const MASTER_PASS = "@Mm123321";

let usersDB = JSON.parse(localStorage.getItem('erp_users')) || [
    { name: "admin", pass: "@Mm123321", job: "المدير العام", dept: "الإدارة العليا", 
      auths: { cost: true, users: true, print: true, editContent: true, editOrder: true } }
];

let currentUser = null;
let allOrdersData = JSON.parse(localStorage.getItem('erp_all_orders')) || [];
const branches = Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`);
const depts = ["قسم الشركات", "قسم الاستيراد", "قسم الجملة", "إدارة المشتريات", ...branches];

let appSettings = {
    themeColor: localStorage.getItem('erp_theme') || "#004a99",
    fontSize: localStorage.getItem('erp_fontSize') || "14"
};

const userModal = new bootstrap.Modal(document.getElementById('userModal'));

// ==========================================
// 2. نظام تسجيل الدخول
// ==========================================
function handleLogin() {
    const uInput = document.getElementById('user-login').value;
    const pInput = document.getElementById('pass-login').value;
    const error = document.getElementById('login-error');

    const found = usersDB.find(u => u.name === uInput && u.pass === pInput);

    if (found) {
        currentUser = found;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('splash-screen').style.display = 'flex';
        setTimeout(initApp, 1500);
    } else {
        error.style.display = 'block';
    }
}

function handleLogout() {
    location.reload();
}

function initApp() {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    
    // تعبئة البيانات
    const inpDept = document.getElementById('inp-dept');
    const dashBranch = document.getElementById('dash-branch-filter');
    const userDeptInp = document.getElementById('user-dept-inp');
    
    depts.forEach(d => {
        if(inpDept) inpDept.add(new Option(d, d));
        if(dashBranch) dashBranch.add(new Option(d, d));
        if(userDeptInp) userDeptInp.add(new Option(d, d));
    });

    applyInterface();
    refreshDashboard();
    createNewRow();
}

function applyInterface() {
    document.documentElement.style.setProperty('--main-blue', appSettings.themeColor);
    document.getElementById('display-user-name').innerText = currentUser.name;
    document.getElementById('user-avatar-initial').innerText = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('inp-user').value = currentUser.name;
    document.getElementById('inp-date').value = new Date().toLocaleString('ar-SA');
    
    changeFontSize(appSettings.fontSize);
    applyPermissions();
}

function applyPermissions() {
    // إذا كان admin، يرى كل شيء
    if (currentUser.name === MASTER_USER) return;

    // لغير الـ admin، نطبق القيود
    if (!currentUser.auths.cost) {
        document.querySelectorAll('.p-auth-cost').forEach(el => el.style.display = 'none');
        document.getElementById('set-price-toggle').checked = false;
        togglePriceDisplay();
    }
    if (!currentUser.auths.users) document.querySelectorAll('.p-auth-users').forEach(el => el.style.display = 'none');
    if (!currentUser.auths.print) document.querySelectorAll('.p-auth-print').forEach(el => el.style.display = 'none');
    if (!currentUser.auths.editContent) document.querySelectorAll('.p-auth-edit-content').forEach(el => el.style.display = 'none');
    if (!currentUser.auths.editOrder) document.querySelectorAll('.p-auth-edit-order').forEach(el => el.disabled = true);
}

// ==========================================
// 3. دوال الجداول والمقاسات (بدون تغيير)
// ==========================================
function createNewRow() {
    const tbody = document.getElementById('order-rows');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control" placeholder="البراند"></td>
        <td><div class="d-flex gap-1">
            <input type="text" class="form-control text-center" placeholder="W">
            <input type="text" class="form-control text-center" placeholder="H">
            <input type="text" class="form-control text-center" placeholder="R">
        </div></td>
        <td><input type="number" class="form-control qty-inp" value="1" onchange="calcTotal()"></td>
        <td class="price-col p-auth-cost"><input type="number" class="form-control cost-inp" value="0" onchange="calcTotal()"></td>
        <td class="price-col p-auth-cost fw-bold text-primary row-total">0.00</td>
        <td><button class="btn btn-sm text-danger" onclick="this.closest('tr').remove(); calcTotal();">×</button></td>
    `;
    tbody.appendChild(tr);
    calcTotal();
    togglePriceDisplay();
}

function calcTotal() {
    let grand = 0, qty = 0;
    document.querySelectorAll('#order-rows tr').forEach(row => {
        const q = parseFloat(row.querySelector('.qty-inp').value) || 0;
        const c = parseFloat(row.querySelector('.cost-inp').value) || 0;
        const sub = q * c;
        if(row.querySelector('.row-total')) row.querySelector('.row-total').innerText = sub.toFixed(2);
        grand += sub; qty += q;
    });
    document.getElementById('grand-total-val').innerText = grand.toLocaleString();
    document.getElementById('stat-count').innerText = qty;
}

// ==========================================
// 4. دوال الفلترة والرسوم البيانية (بدون تغيير)
// ==========================================
function toggleDateInputs() {
    const period = document.getElementById('dash-period').value;
    document.getElementById('custom-date-container').style.display = (period === 'custom') ? 'block' : 'none';
    refreshDashboard();
}

function refreshDashboard() {
    const period = document.getElementById('dash-period').value;
    const branch = document.getElementById('dash-branch-filter').value;
    const from = document.getElementById('date-from').value;
    const to = document.getElementById('date-to').value;
    const now = new Date();

    let filtered = allOrdersData.filter(o => {
        const oDate = new Date(o.timestamp);
        const matchBranch = (branch === 'all' || o.section === branch);
        if(!matchBranch) return false;
        if (period === 'today') return oDate.toDateString() === now.toDateString();
        if (period === 'month') return oDate.getMonth() === now.getMonth();
        if (period === 'custom' && from && to) return oDate >= new Date(from) && oDate <= new Date(to).setHours(23,59);
        return true;
    });

    const total = filtered.reduce((s, o) => s + o.total, 0);
    document.getElementById('dash-total-cost').innerText = total.toLocaleString();
    document.getElementById('dash-orders-count').innerText = filtered.length;
    document.getElementById('dash-items-qty').innerText = filtered.reduce((s, o) => s + o.qty, 0);
    renderCharts(filtered);
}

function renderCharts(data) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if(window.erpChart) window.erpChart.destroy();
    window.erpChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(o => new Date(o.timestamp).toLocaleDateString()),
            datasets: [{ label: 'المبالغ', data: data.map(o => o.total), borderColor: appSettings.themeColor }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ==========================================
// 5. إدارة المستخدمين (إضافة، تعديل، حذف)
// ==========================================
function openUserModal(index = null) {
    document.getElementById('user-form').reset();
    document.getElementById('edit-user-index').value = index;
    if (index !== null) {
        const u = usersDB[index];
        document.getElementById('user-name-inp').value = u.name;
        document.getElementById('user-pass-inp').value = u.pass;
        document.getElementById('user-job-inp').value = u.job;
        document.getElementById('user-dept-inp').value = u.dept;
        document.getElementById('auth-cost').checked = u.auths.cost;
        document.getElementById('auth-add-users').checked = u.auths.users;
    }
    userModal.show();
}

function saveUser() {
    const idx = document.getElementById('edit-user-index').value;
    const u = {
        name: document.getElementById('user-name-inp').value,
        pass: document.getElementById('user-pass-inp').value,
        job: document.getElementById('user-job-inp').value,
        dept: document.getElementById('user-dept-inp').value,
        auths: {
            cost: document.getElementById('auth-cost').checked,
            users: document.getElementById('auth-add-users').checked,
            print: document.getElementById('auth-print').checked,
            editContent: document.getElementById('auth-edit-content').checked,
            editOrder: document.getElementById('auth-edit-order').checked
        }
    };
    if (idx === "") usersDB.push(u); else usersDB[idx] = u;
    localStorage.setItem('erp_users', JSON.stringify(usersDB));
    renderUsersList();
    userModal.hide();
}

function renderUsersList() {
    const table = document.getElementById('users-list-table');
    table.innerHTML = "";
    usersDB.forEach((u, i) => {
        table.innerHTML += `<tr><td>${u.name}</td><td>${u.job}</td><td>${u.dept}</td><td>
            <button class="btn btn-sm btn-info" onclick="openUserModal(${i})">تعديل</button>
            <button class="btn btn-sm btn-danger" onclick="usersDB.splice(${i},1); localStorage.setItem('erp_users', JSON.stringify(usersDB)); renderUsersList();">حذف</button>
        </td></tr>`;
    });
}

function sendToCloud() {
    const order = {
        section: document.getElementById('inp-dept').value,
        total: parseFloat(document.getElementById('grand-total-val').innerText.replace(/,/g, '')),
        qty: parseInt(document.getElementById('stat-count').innerText),
        timestamp: new Date().toISOString()
    };
    allOrdersData.push(order);
    localStorage.setItem('erp_all_orders', JSON.stringify(allOrdersData));
    refreshDashboard();
    alert("✅ تم الحفظ!");
}

function togglePriceDisplay() {
    const show = document.getElementById('set-price-toggle').checked;
    document.querySelectorAll('.price-col').forEach(el => el.style.display = show ? 'table-cell' : 'none');
}

function changeFontSize(v) {
    document.getElementById('font-val').innerText = v;
    document.querySelectorAll('.erp-main-table, .form-control').forEach(el => el.style.fontSize = v + 'px');
}

function showTab(id, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }