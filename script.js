/* ============================================================
   1. تهيئة البيانات الأساسية والفروع الـ 21
   ============================================================ */
const DEPARTMENTS = ["المشتريات", "الشركات", "الاستيراد", "الجملة", ...Array.from({length: 21}, (_, i) => `فرع النهدي رقم ${i + 1}`)];
let users = JSON.parse(localStorage.getItem('yn_users')) || [
    { name: "admin", pass: "@Mm123321", job: "المدير العام", perms: { admin: true, review: true, edit: true, cost: true, suspend: true, approve: true, delete: true } }
];
let orders = JSON.parse(localStorage.getItem('yn_orders')) || [];
let currentUser = null;

/* ============================================================
   2. نظام تسجيل الدخول وتحميل الواجهات
   ============================================================ */
function handleLogin() {
    const u = document.getElementById('user-login').value;
    const p = document.getElementById('pass-login').value;
    const found = users.find(x => x.name === u && x.pass === p);
    
    if(found) {
        currentUser = found;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        initApp();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function initApp() {
    // تعبئة الأقسام الـ 25
    const sel = document.getElementById('po-dept');
    sel.innerHTML = DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('');

    // بيانات الواجهة
    document.getElementById('display-user-name').innerText = currentUser.name;
    document.getElementById('display-user-job').innerText = currentUser.job;
    document.getElementById('user-initials').innerText = currentUser.name[0].toUpperCase();
    
    // بيانات طلب الشراء التلقائية
    document.getElementById('po-user').value = currentUser.name;
    document.getElementById('po-job').value = currentUser.job;
    document.getElementById('po-time').value = new Date().toLocaleString('ar-SA');

    // الصلاحيات الإدارية
    if(!currentUser.perms.admin) document.querySelectorAll('.p-admin-only').forEach(e => e.remove());
    
    // بناء أزرار الصلاحيات في طلب الشراء
    renderAuthButtons();
    
    // إخفاء التكلفة إذا لم تكن لديه صلاحية
    if(!currentUser.perms.cost) {
        document.querySelectorAll('.col-cost').forEach(e => e.style.display = 'none');
    }

    renderDashboard();
    renderUsersTable();
    addPoRow();
    initCharts();
}

/* ============================================================
   3. نظام الصلاحيات المخصص (أزرار الأوامر)
   ============================================================ */
function renderAuthButtons() {
    const container = document.getElementById('auth-buttons');
    const p = currentUser.perms;
    const btns = [
        { id: 'review', label: 'مراجعة طلب الشراء', icon: 'bi-eye', color: 'btn-info', active: p.review },
        { id: 'edit', label: 'تعديل البيانات', icon: 'bi-pencil', color: 'btn-warning', active: p.edit },
        { id: 'suspend', label: 'إيقاف / تعليق الطلب', icon: 'bi-pause-circle', color: 'btn-dark', active: p.suspend },
        { id: 'approve', label: 'الموافقة على طلب الشراء', icon: 'bi-check-all', color: 'btn-success', active: p.approve },
        { id: 'delete', label: 'حذف طلب الشراء', icon: 'bi-trash', color: 'btn-danger', active: p.delete }
    ];

    container.innerHTML = btns.filter(b => b.active).map(b => `
        <button class="btn ${b.color} px-4 py-2 fw-bold shadow-sm" onclick="handleAction('${b.id}')">
            <i class="bi ${b.icon} me-2"></i> ${b.label}
        </button>
    `).join('');
}

function handleAction(action) {
    alert(`تم تنفيذ إجراء: ${action} بنجاح من قبل ${currentUser.name}`);
}

/* ============================================================
   4. إدارة طلب الشراء (تحريك، مقاسات، حسابات)
   ============================================================ */
function addPoRow() {
    const tbody = document.getElementById('po-rows');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="row-num fw-bold"></td>
        <td><input type="text" class="form-control" placeholder="Brand"></td>
        <td>
            <div class="d-flex gap-1 justify-content-center">
                <input type="text" class="form-control text-center w-25" placeholder="W">
                <input type="text" class="form-control text-center w-25" placeholder="H">
                <input type="text" class="form-control text-center w-25" placeholder="R">
            </div>
        </td>
        <td><input type="number" class="form-control qty" value="1" oninput="recalc()"></td>
        <td class="col-cost"><input type="number" class="form-control cost" value="0" oninput="recalc()"></td>
        <td class="col-cost fw-bold text-primary total-cell">0.00</td>
        <td>
            <div class="btn-group">
                <button class="btn btn-sm btn-light border" onclick="moveRow(this, -1)">↑</button>
                <button class="btn btn-sm btn-light border" onclick="moveRow(this, 1)">↓</button>
            </div>
        </td>
        <td><button class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove(); recalc();">×</button></td>
    `;
    tbody.appendChild(tr);
    recalc();
}

function moveRow(btn, dir) {
    const row = btn.closest('tr');
    if (dir === -1 && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
    if (dir === 1 && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
    recalc();
}

function recalc() {
    document.querySelectorAll('#po-rows tr').forEach((row, i) => {
        row.querySelector('.row-num').innerText = i + 1;
        const q = row.querySelector('.qty').value || 0;
        const c = row.querySelector('.cost').value || 0;
        row.querySelector('.total-cell').innerText = (q * c).toFixed(2);
    });
}

/* ============================================================
   5. لوحة التحكم والإحصائيات
   ============================================================ */
function renderDashboard() {
    const stats = [
        { title: "إجمالي اليوم", val: "12,450", color: "#004a99" },
        { title: "الأسبوع الماضي", val: "85,200", color: "#f39c12" },
        { title: "الشهر الماضي", val: "320,000", color: "#10b981" },
        { title: "وقت مخصص", val: "0.00", color: "#6366f1" }
    ];
    document.getElementById('stats-grid').innerHTML = stats.map(s => `
        <div class="col-md-3">
            <div class="tile-stat shadow-sm">
                <h6 class="text-muted fw-bold small">${s.title}</h6>
                <h3 class="fw-bold mb-0" style="color:${s.color}">${s.val} <small class="fs-6">ر.س</small></h3>
            </div>
        </div>
    `).join('');
}

/* ============================================================
   6. أدوات مساعدة (Excel، Theme، Users)
   ============================================================ */
function applyTheme() {
    const color = document.getElementById('theme-color').value;
    const size = document.getElementById('theme-font-size').value;
    document.documentElement.style.setProperty('--p-color', color);
    document.documentElement.style.setProperty('--f-size', size + 'px');
}

function saveUser() {
    const user = {
        name: document.getElementById('u-name').value,
        pass: document.getElementById('u-pass').value,
        job: document.getElementById('u-job').value,
        perms: {
            admin: document.getElementById('p-admin').checked,
            review: document.getElementById('p-review').checked,
            edit: document.getElementById('p-edit').checked,
            cost: document.getElementById('p-cost').checked,
            suspend: document.getElementById('p-suspend').checked,
            approve: document.getElementById('p-approve').checked,
            delete: document.getElementById('p-delete').checked
        }
    };
    users.push(user);
    localStorage.setItem('yn_users', JSON.stringify(users));
    location.reload();
}

function showTab(id, btn) {
    document.querySelectorAll('.tab-content').forEach(x => x.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
}

function initCharts() {
    const ctxL = document.getElementById('lineChart');
    new Chart(ctxL, { type: 'line', data: { labels: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'], datasets: [{ label: 'تدفق الطلبات', data: [12, 19, 3, 5, 2], borderColor: '#004a99', tension: 0.4 }] } });
    const ctxP = document.getElementById('pieChart');
    new Chart(ctxP, { type: 'doughnut', data: { labels: ['المشتريات','الشركات','الفروع'], datasets: [{ data: [300, 50, 100], backgroundColor: ['#004a99','#f39c12','#10b981'] }] } });
}