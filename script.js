// ==========================================
// 1. إدارة قاعدة البيانات والمستخدمين
// ==========================================
const MASTER_USER = "admin";
const MASTER_PASS = "@Mm123321";

// وظيفة للتأكد من وجود الأدمن في النظام دائماً
function getInitialUsers() {
    let storedUsers = JSON.parse(localStorage.getItem('erp_users'));
    
    // إذا لم تكن هناك بيانات، أو كان الأدمن مفقوداً، ننشئه فوراً
    if (!storedUsers || !storedUsers.find(u => u.name === MASTER_USER)) {
        let defaultAdmin = { 
            name: MASTER_USER, 
            pass: MASTER_PASS, 
            job: "المدير العام", 
            dept: "الإدارة العليا", 
            auths: { cost: true, users: true, print: true, editContent: true, editOrder: true } 
        };
        storedUsers = [defaultAdmin];
        localStorage.setItem('erp_users', JSON.stringify(storedUsers));
    }
    return storedUsers;
}

let usersDB = getInitialUsers();
let currentUser = null;
let allOrdersData = JSON.parse(localStorage.getItem('erp_all_orders')) || [];
const branches = Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`);
const depts = ["قسم الشركات", "قسم الاستيراد", "قسم الجملة", "إدارة المشتريات", ...branches];

// ==========================================
// 2. نظام الدخول وإظهار كلمة السر
// ==========================================
function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
        input.type = "password";
        icon.classList.replace('bi-eye-slash', 'bi-eye');
    }
}

function handleLogin() {
    const uInput = document.getElementById('user-login').value.trim();
    const pInput = document.getElementById('pass-login').value.trim();
    const error = document.getElementById('login-error');

    // تحديث قاعدة البيانات قبل التحقق لضمان قراءة آخر التغييرات
    usersDB = JSON.parse(localStorage.getItem('erp_users')) || getInitialUsers();

    const found = usersDB.find(u => u.name === uInput && u.pass === pInput);

    if (found) {
        currentUser = found;
        error.style.display = 'none';
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('splash-screen').style.display = 'flex';
        setTimeout(initApp, 1500);
    } else {
        error.style.display = 'block';
        error.innerText = "❌ اسم المستخدم أو كلمة المرور غير صحيحة!";
    }
}

function handleLogout() { location.reload(); }

// ==========================================
// 3. تهيئة التطبيق
// ==========================================
function initApp() {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    
    // تعبئة القوائم
    const inpDept = document.getElementById('inp-dept');
    const userDeptInp = document.getElementById('user-dept-inp');
    
    if(inpDept) {
        inpDept.innerHTML = "";
        depts.forEach(d => inpDept.add(new Option(d, d)));
    }
    if(userDeptInp) {
        userDeptInp.innerHTML = "";
        depts.forEach(d => userDeptInp.add(new Option(d, d)));
    }

    applyInterface();
    refreshDashboard();
    renderUsersList();
    if(document.getElementById('order-rows').children.length === 0) createNewRow();
}

function applyInterface() {
    document.getElementById('display-user-name').innerText = currentUser.name;
    document.getElementById('user-avatar-initial').innerText = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('inp-user').value = currentUser.name;
    document.getElementById('inp-date').value = new Date().toLocaleString('ar-SA');
    applyPermissions();
}

function applyPermissions() {
    if (currentUser.name === MASTER_USER) return; // الأدمن يرى كل شيء
    
    if (!currentUser.auths.cost) {
        document.querySelectorAll('.p-auth-cost').forEach(el => el.style.display = 'none');
    }
    if (!currentUser.auths.users) {
        document.querySelectorAll('.p-auth-users').forEach(el => el.style.display = 'none');
    }
}

// ==========================================
// 4. الدوال الأساسية (بدون أي تغيير)
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

function refreshDashboard() {
    document.getElementById('dash-total-cost').innerText = allOrdersData.reduce((s, o) => s + o.total, 0).toLocaleString();
    document.getElementById('dash-orders-count').innerText = allOrdersData.length;
}

function renderUsersList() {
    const table = document.getElementById('users-list-table');
    if(!table) return;
    table.innerHTML = "";
    usersDB.forEach((u, i) => {
        table.innerHTML += `<tr><td>${u.name}</td><td>${u.job}</td><td>${u.dept}</td><td>
            <button class="btn btn-sm btn-info" onclick="openUserModal(${i})">تعديل</button>
            ${u.name !== MASTER_USER ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${i})">حذف</button>` : ''}
        </td></tr>`;
    });
}

function deleteUser(i) {
    usersDB.splice(i, 1);
    localStorage.setItem('erp_users', JSON.stringify(usersDB));
    renderUsersList();
}

function openUserModal(index = null) {
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    document.getElementById('user-form').reset();
    document.getElementById('edit-user-index').value = index === null ? "" : index;
    if (index !== null) {
        const u = usersDB[index];
        document.getElementById('user-name-inp').value = u.name;
        document.getElementById('user-pass-inp').value = u.pass;
    }
    modal.show();
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
            users: document.getElementById('auth-add-users').checked
        }
    };
    if (idx === "") usersDB.push(u); else usersDB[idx] = u;
    localStorage.setItem('erp_users', JSON.stringify(usersDB));
    renderUsersList();
    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
}

function showTab(id, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }

function sendToCloud() {
    const order = {
        total: parseFloat(document.getElementById('grand-total-val').innerText.replace(/,/g, '')),
        qty: parseInt(document.getElementById('stat-count').innerText),
        timestamp: new Date().toISOString()
    };
    allOrdersData.push(order);
    localStorage.setItem('erp_all_orders', JSON.stringify(allOrdersData));
    alert("✅ تم الحفظ!");
}