/* ============================================================
   1. تهيئة البيانات والأقسام الـ 25
   ============================================================ */
const ALL_DEPTS = ["قسم المشتريات", "قسم الشركات", "قسم الاستيراد", "قسم الجملة", ...Array.from({length: 21}, (_, i) => `فرع النهدي رقم ${i+1}`)];

// قاعدة بيانات المستخدمين الوهمية (يتم تخزينها في المتصفح)
let userDB = JSON.parse(localStorage.getItem('nahdi_erp_users')) || [
    { 
        user: "admin", pass: "@Mm123321", job: "المدير العام", 
        perms: { admin: true, review: true, edit: true, cost: true, suspend: true, approve: true, delete: true } 
    }
];

let currentUser = null;

/* ============================================================
   2. نظام تسجيل الدخول والصلاحيات
   ============================================================ */
function handleLogin() {
    const u = document.getElementById('user-login').value.trim();
    const p = document.getElementById('pass-login').value.trim();
    const found = userDB.find(x => x.user === u && x.pass === p);
    
    if(found) {
        currentUser = found;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-wrapper').style.display = 'block';
        launchSystem();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function launchSystem() {
    // تعبئة الأقسام الـ 25 في القائمة المنسدلة
    const deptSel = document.getElementById('po-dept-select');
    deptSel.innerHTML = ALL_DEPTS.map(d => `<option value="${d}">${d}</option>`).join('');

    // أتمتة بيانات الموظف في الواجهة وفي نموذج الطلب
    document.getElementById('nav-user-name').innerText = currentUser.user;
    document.getElementById('nav-user-job').innerText = currentUser.job;
    document.getElementById('po-auto-user').value = currentUser.user;
    document.getElementById('po-auto-job').value = currentUser.job;
    document.getElementById('po-auto-time').value = new Date().toLocaleString('ar-SA');

    // تفعيل الصلاحيات الإدارية
    if(currentUser.perms.admin) document.getElementById('nav-settings').style.display = 'flex';
    
    // إخفاء أعمدة التكلفة إذا لم تكن لديه صلاحية
    if(!currentUser.perms.cost) {
        document.querySelectorAll('.perm-cost-col').forEach(el => el.style.display = 'none');
    }

    // بناء أزرار الصلاحيات في أسفل يمين طلب الشراء
    renderAuthCommands();
    
    refreshDashboard();
    renderUsersList();
    addNewOrderRow();
    initGlobalCharts();
}

function renderAuthCommands() {
    const wrapper = document.getElementById('permission-btns-wrapper');
    const p = currentUser.perms;
    const commands = [
        { id: 'review', label: 'مراجعة طلب الشراء', color: 'btn-info', icon: 'bi-eye', act: p.review },
        { id: 'edit', label: 'التعديل على طلب الشراء', color: 'btn-warning', icon: 'bi-pencil-square', act: p.edit },
        { id: 'suspend', label: 'إيقاف / تعليق الطلب', color: 'btn-dark', icon: 'bi-pause-btn', act: p.suspend },
        { id: 'approve', label: 'الموافقة على طلب الشراء', color: 'btn-success', icon: 'bi-check-circle', act: p.approve },
        { id: 'delete', label: 'حذف طلب شراء', color: 'btn-danger', icon: 'bi-trash3', act: p.delete }
    ];

    wrapper.innerHTML = commands.filter(c => c.act).map(c => `
        <button class="btn ${c.color} px-4 py-2 fw-bold shadow-sm" onclick="alert('تم تنفيذ الأمر: ${c.label}')">
            <i class="bi ${c.icon} me-2"></i> ${c.label}
        </button>
    `).join('');
}

/* ============================================================
   3. إدارة طلبات الشراء (تحريك، مقاسات، Excel)
   ============================================================ */
function addNewOrderRow(data = {}) {
    const tbody = document.getElementById('po-table-body');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="row-index fw-bold"></td>
        <td><input type="text" class="form-control" value="${data.brand || ''}" placeholder="Brand"></td>
        <td>
            <div class="d-flex gap-1 justify-content-center">
                <input type="text" class="form-control text-center w-25" value="${data.w || ''}" placeholder="W" title="Width">
                <input type="text" class="form-control text-center w-25" value="${data.h || ''}" placeholder="H" title="Height">
                <input type="text" class="form-control text-center w-25" value="${data.r || ''}" placeholder="R" title="Radius">
            </div>
        </td>
        <td><input type="number" class="form-control qty" value="${data.qty || 1}" oninput="reCalc()"></td>
        <td class="perm-cost-col"><input type="number" class="form-control cost" value="${data.cost || 0}" oninput="reCalc()"></td>
        <td class="perm-cost-col fw-bold text-primary subtotal">0.00</td>
        <td class="no-print">
            <div class="btn-group">
                <button class="btn btn-sm btn-light border" onclick="shiftRow(this, -1)">↑</button>
                <button class="btn btn-sm btn-light border" onclick="shiftRow(this, 1)">↓</button>
            </div>
        </td>
        <td class="no-print"><button class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove(); reCalc();">×</button></td>
    `;
    tbody.appendChild(tr);
    
    // تطبيق صلاحية تعديل الجدول
    if(!currentUser.perms.edit) {
        tr.querySelectorAll('input').forEach(i => i.readOnly = true);
        document.getElementById('add-row-btn').style.display = 'none';
    }
    // تطبيق صلاحية التكلفة
    if(!currentUser.perms.cost) tr.querySelectorAll('.perm-cost-col').forEach(c => c.style.display = 'none');
    
    reCalc();
}

function shiftRow(btn, dir) {
    const row = btn.closest('tr');
    if (dir === -1 && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
    if (dir === 1 && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
    reCalc();
}

function reCalc() {
    document.querySelectorAll('#po-table-body tr').forEach((tr, i) => {
        tr.querySelector('.row-index').innerText = i + 1;
        const q = tr.querySelector('.qty').value || 0;
        const c = tr.querySelector('.cost').value || 0;
        tr.querySelector('.subtotal').innerText = (q * c).toFixed(2);
    });
}

// استيراد ملف Excel حقيقي برمجياً
function handleExcelImport(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
        const bytes = new Uint8Array(ev.target.result);
        const wb = XLSX.read(bytes, {type: 'array'});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        document.getElementById('po-table-body').innerHTML = '';
        data.forEach(r => {
            addNewOrderRow({ brand: r.البراند, w: r.عرض, h: r.ارتفاع, r: r.قطر, qty: r.الكمية, cost: r.التكلفة });
        });
    };
    reader.readAsArrayBuffer(file);
}

/* ============================================================
   4. الإحصائيات الزمنية والرسوم البيانية
   ============================================================ */
function refreshDashboard() {
    const grid = document.getElementById('stats-tiles-container');
    const data = [
        { label: "إحصائيات اليوم", val: "18,200", color: "#004a99" },
        { label: "الأسبوع الماضي", val: "125,400", color: "#f39c12" },
        { label: "الشهر الماضي", val: "480,000", color: "#10b981" },
        { label: "فترة مخصصة", val: "0.00", color: "#6366f1" }
    ];
    grid.innerHTML = data.map(d => `
        <div class="col-md-3">
            <div class="stat-card shadow-sm" style="border-right-color: ${d.color}">
                <div class="small fw-bold text-muted mb-1">${d.label}</div>
                <div class="stat-val">${d.val} <small class="fs-6 opacity-50">ر.س</small></div>
            </div>
        </div>
    `).join('');
}

function initGlobalCharts() {
    new Chart(document.getElementById('mainLineChart'), {
        type: 'line',
        data: { labels: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'], datasets: [{ label: 'تدفق الطلبات', data: [5, 12, 8, 20, 15], borderColor: '#004a99', fill: true, tension: 0.4, backgroundColor: 'rgba(0,74,153,0.05)' }] }
    });
    new Chart(document.getElementById('mainPieChart'), {
        type: 'doughnut',
        data: { labels: ['مشتريات','فروع','شركات'], datasets: [{ data: [45, 35, 20], backgroundColor: ['#004a99','#10b981','#f39c12'] }] }
    });
}

/* ============================================================
   5. الإعدادات وإدارة المستخدمين
   ============================================================ */
function saveUserAccount() {
    const newUser = {
        user: document.getElementById('u-name').value,
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
    userDB.push(newUser);
    localStorage.setItem('nahdi_erp_users', JSON.stringify(userDB));
    renderUsersList();
    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
}

function renderUsersList() {
    const ui = document.getElementById('users-list-ui');
    ui.innerHTML = `
        <table class="table table-sm text-center">
            <thead><tr><th>المستخدم</th><th>الوظيفة</th><th>أدمن</th><th>إجراء</th></tr></thead>
            <tbody>
                ${userDB.map((u, i) => `
                    <tr>
                        <td>${u.user}</td><td>${u.job}</td>
                        <td>${u.perms.admin?'✅':'❌'}</td>
                        <td><button class="btn btn-sm text-danger" onclick="userDB.splice(${i},1);renderUsersList();">حذف</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
}

function syncUIStyle() {
    const c = document.getElementById('style-color').value;
    const s = document.getElementById('style-font').value;
    document.documentElement.style.setProperty('--p-color', c);
    document.documentElement.style.setProperty('--f-size', s + 'px');
}

function switchSection(sec, btn) {
    document.querySelectorAll('.content-view').forEach(v => v.style.display = 'none');
    document.getElementById('sec-' + sec).style.display = 'block';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function toggleSidebar() {
    const s = document.getElementById('sidebar');
    s.style.width = (s.style.width === '0px') ? '270px' : '0px';
}