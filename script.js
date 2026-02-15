// ==========================================
// 1. البيانات والتهيئة الأساسية
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7VkdCwBuq-O97bTs8of7JOnMFXS7MeiFXv-e7o1FAq6NALXQu3agc0G_QQMl9ebx-eA/exec";
const branches = Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`);
const depts = ["قسم الشركات", "قسم الاستيراد", "قسم الجملة", "إدارة المشتريات", ...branches];

// قاعدة بيانات المستخدمين (افتراضية لأول مرة)
let usersDB = JSON.parse(localStorage.getItem('erp_users')) || [
    { name: "المدير العام", pass: "123", job: "مدير نظام", dept: "إدارة المشتريات", 
      auths: { cost: true, users: true, print: true, editContent: true, editOrder: true } }
];

let currentUser = usersDB[0]; // المستخدم الحالي (للتجربة)
let allOrdersData = JSON.parse(localStorage.getItem('erp_all_orders')) || [];

let appSettings = {
    themeColor: localStorage.getItem('erp_theme') || "#004a99",
    fontSize: localStorage.getItem('erp_fontSize') || "14"
};

const userModal = new bootstrap.Modal(document.getElementById('userModal'));

// ==========================================
// 2. إدارة النظام وتشغيل الواجهة
// ==========================================
window.onload = () => {
    // تعبئة قوائم الاختيار
    const inpDept = document.getElementById('inp-dept');
    const dashBranch = document.getElementById('dash-branch-filter');
    const userDeptInp = document.getElementById('user-dept-inp');
    
    depts.forEach(d => {
        if(inpDept) inpDept.add(new Option(d, d));
        if(dashBranch) dashBranch.add(new Option(d, d));
        if(userDeptInp) userDeptInp.add(new Option(d, d));
    });

    applyInterfaceSettings();
    renderUsersList();

    setTimeout(() => {
        document.getElementById('splash-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        refreshDashboard();
    }, 1500);

    createNewRow();
};

function applyInterfaceSettings() {
    document.documentElement.style.setProperty('--main-blue', appSettings.themeColor);
    document.getElementById('display-user-name').innerText = currentUser.name;
    document.getElementById('user-role-badge').innerText = currentUser.job;
    document.getElementById('user-avatar-initial').innerText = currentUser.name.charAt(0);
    document.getElementById('inp-user').value = currentUser.name;
    document.getElementById('inp-date').value = new Date().toLocaleString('ar-SA');
    
    changeFontSize(appSettings.fontSize);
    togglePriceDisplay();
    applyPermissions(); // تطبيق الصلاحيات على العناصر
}

// تطبيق الصلاحيات برمجياً
function applyPermissions() {
    if (!currentUser.auths.cost) {
        document.querySelectorAll('.p-auth-cost').forEach(el => el.style.display = 'none');
        document.getElementById('set-price-toggle').checked = false;
        togglePriceDisplay();
    }
    if (!currentUser.auths.users) document.querySelectorAll('.p-auth-users').forEach(el => el.style.display = 'none');
    if (!currentUser.auths.print) document.querySelectorAll('.p-auth-print').forEach(el => el.style.display = 'none');
    if (!currentUser.auths.editContent) document.querySelectorAll('.p-auth-edit').forEach(el => el.style.display = 'none');
    if (!currentUser.auths.editOrder) document.querySelectorAll('.p-auth-order').forEach(el => el.disabled = true);
}

// ==========================================
// 3. إدارة المستخدمين (إضافة، تعديل، حذف)
// ==========================================
function openUserModal(index = null) {
    const form = document.getElementById('user-form');
    form.reset();
    document.getElementById('edit-user-index').value = index;

    if (index !== null) {
        const u = usersDB[index];
        document.getElementById('user-name-inp').value = u.name;
        document.getElementById('user-pass-inp').value = u.pass;
        document.getElementById('user-job-inp').value = u.job;
        document.getElementById('user-dept-inp').value = u.dept;
        document.getElementById('auth-cost').checked = u.auths.cost;
        document.getElementById('auth-add-users').checked = u.auths.users;
        document.getElementById('auth-print').checked = u.auths.print;
        document.getElementById('auth-edit-content').checked = u.auths.editContent;
        document.getElementById('auth-edit-order').checked = u.auths.editOrder;
    }
    userModal.show();
}

function saveUser() {
    const index = document.getElementById('edit-user-index').value;
    const userData = {
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

    if (index === "") {
        usersDB.push(userData);
    } else {
        usersDB[index] = userData;
    }

    localStorage.setItem('erp_users', JSON.stringify(usersDB));
    renderUsersList();
    userModal.hide();
    alert("✅ تم حفظ بيانات المستخدم بنجاح");
}

function renderUsersList() {
    const table = document.getElementById('users-list-table');
    table.innerHTML = "";
    usersDB.forEach((u, i) => {
        table.innerHTML += `
            <tr>
                <td class="fw-bold text-primary">${u.name}</td>
                <td>${u.job}</td>
                <td><span class="badge bg-light text-dark border">${u.dept}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-info me-1" onclick="openUserModal(${i})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${i})"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function deleteUser(i) {
    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
        usersDB.splice(i, 1);
        localStorage.setItem('erp_users', JSON.stringify(usersDB));
        renderUsersList();
    }
}

// ==========================================
// 4. لوحة التحكم والفلترة الزمنية (كما هي)
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
        if (period === 'month') return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
        if (period === 'year') return oDate.getFullYear() === now.getFullYear();
        if (period === 'custom' && from && to) {
            return oDate >= new Date(from) && oDate <= new Date(to).setHours(23,59,59);
        }
        return true;
    });

    updateDashStats(filtered);
}

function updateDashStats(data) {
    const total = data.reduce((s, o) => s + parseFloat(o.total || 0), 0);
    document.getElementById('dash-total-cost').innerText = total.toLocaleString();
    document.getElementById('dash-orders-count').innerText = data.length;
    document.getElementById('dash-items-qty').innerText = data.reduce((s, o) => s + o.qty, 0);
    document.getElementById('dash-avg-order').innerText = data.length ? (total / data.length).toFixed(2) : 0;
    renderCharts(data);
}

function renderCharts(data) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if(window.erpChart) window.erpChart.destroy();
    window.erpChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(o => new Date(o.timestamp).toLocaleDateString('ar-SA')),
            datasets: [{ label: 'العمليات', data: data.map(o => o.total), borderColor: appSettings.themeColor, fill: true }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ==========================================
// 5. إدارة الطلبات والجدول
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
    alert("✅ تم إرسال الطلب وحفظ البيانات");
}

// ==========================================
// 6. الإعدادات العامة والتبديل
// ==========================================
function togglePriceDisplay() {
    const show = document.getElementById('set-price-toggle').checked;
    document.querySelectorAll('.price-col').forEach(el => el.style.display = show ? 'table-cell' : 'none');
}

function changeFontSize(v) {
    document.getElementById('font-val').innerText = v;
    document.querySelectorAll('.erp-main-table, .form-control, .form-select').forEach(el => el.style.fontSize = v + 'px');
}

function updateGlobalSettings() {
    appSettings.themeColor = document.getElementById('set-theme-color').value;
    appSettings.fontSize = document.getElementById('set-font-size').value;
    localStorage.setItem('erp_theme', appSettings.themeColor);
    localStorage.setItem('erp_fontSize', appSettings.fontSize);
    applyInterfaceSettings();
}

function showTab(id, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }

function printInvoice() {
    window.print();
}