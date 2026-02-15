/* ============================================================
   1. الإعدادات والبيانات الأساسية (الـ 21 فرعاً + الـ 4 أقسام)
   ============================================================ */
const DEPARTMENTS = ["المشتريات", "الشركات", "الاستيراد", "الجملة", ...Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`)];
let users = JSON.parse(localStorage.getItem('yn_users')) || [
    { name: "admin", pass: "@Mm123321", job: "مدير النظام", perms: { admin: true, review: true, edit: true, cost: true, suspend: true, approve: true, delete: true } }
];
let currentUser = null;

/* ============================================================
   2. نظام الدخول وتحديد الصلاحيات
   ============================================================ */
function handleLogin() {
    const u = document.getElementById('user-login').value;
    const p = document.getElementById('pass-login').value;
    const found = users.find(x => x.name === u && x.pass === p);
    
    if(found) {
        currentUser = found;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        bootApp();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function bootApp() {
    // تعبئة الأقسام
    const deptSel = document.getElementById('po-dept');
    deptSel.innerHTML = DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('');

    // بيانات الموظف
    document.getElementById('nav-user-name').innerText = currentUser.name;
    document.getElementById('nav-user-job').innerText = currentUser.job;
    document.getElementById('po-user').value = currentUser.name;
    document.getElementById('po-job').value = currentUser.job;
    document.getElementById('po-time').value = new Date().toLocaleString('ar-SA');

    // إخفاء التكلفة إذا لم تكن لديه صلاحية
    if(!currentUser.perms.cost) {
        document.querySelectorAll('.cost-col').forEach(c => c.style.display = 'none');
    }

    // بناء أزرار الأوامر بناءً على الصلاحيات
    renderCommandButtons();
    
    if(!currentUser.perms.admin) document.getElementById('settings-nav').style.display = 'none';

    refreshDashboard();
    renderUsersUI();
    addRow();
    initCharts();
}

function renderCommandButtons() {
    const container = document.getElementById('command-buttons-container');
    const p = currentUser.perms;
    const commands = [
        { id: 'review', label: 'مراجعة طلب الشراء', color: 'btn-info', icon: 'bi-eye', act: p.review },
        { id: 'edit', label: 'التعديل على الطلب', color: 'btn-warning', icon: 'bi-pencil', act: p.edit },
        { id: 'suspend', label: 'إيقاف / تعليق الطلب', color: 'btn-dark', icon: 'bi-pause-circle', act: p.suspend },
        { id: 'approve', label: 'الموافقة على الطلب', color: 'btn-success', icon: 'bi-check2-all', act: p.approve },
        { id: 'delete', label: 'حذف طلب الشراء', color: 'btn-danger', icon: 'bi-trash', act: p.delete }
    ];

    container.innerHTML = commands.filter(c => c.act).map(c => `
        <button class="btn ${c.color} px-4 py-2 fw-bold shadow-sm" onclick="alert('تم تنفيذ أمر: ${c.label}')">
            <i class="bi ${c.icon} me-2"></i> ${c.label}
        </button>
    `).join('');
}

/* ============================================================
   3. إدارة طلب الشراء (تحريك، مقاس، استيراد Excel)
   ============================================================ */
function addRow(data = {}) {
    const tbody = document.getElementById('po-rows');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="row-idx fw-bold"></td>
        <td><input type="text" class="form-control" value="${data.brand || ''}" placeholder="Brand"></td>
        <td>
            <div class="d-flex gap-1 justify-content-center">
                <input type="text" class="form-control text-center w-25" value="${data.w || ''}" placeholder="W">
                <input type="text" class="form-control text-center w-25" value="${data.h || ''}" placeholder="H">
                <input type="text" class="form-control text-center w-25" value="${data.r || ''}" placeholder="R">
            </div>
        </td>
        <td><input type="number" class="form-control qty" value="${data.qty || 1}" oninput="calc()"></td>
        <td class="cost-col"><input type="number" class="form-control cost" value="${data.cost || 0}" oninput="calc()"></td>
        <td class="cost-col fw-bold text-primary total-row">0.00</td>
        <td class="no-print">
            <div class="btn-group shadow-sm">
                <button class="btn btn-sm btn-light border" onclick="move(this, -1)">↑</button>
                <button class="btn btn-sm btn-light border" onclick="move(this, 1)">↓</button>
            </div>
        </td>
        <td class="no-print"><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove(); calc();">×</button></td>
    `;
    tbody.appendChild(tr);
    if(!currentUser.perms.cost) tr.querySelectorAll('.cost-col').forEach(c => c.style.display = 'none');
    calc();
}

function move(btn, dir) {
    const row = btn.closest('tr');
    if(dir === -1 && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
    if(dir === 1 && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
    calc();
}

function calc() {
    document.querySelectorAll('#po-rows tr').forEach((row, i) => {
        row.querySelector('.row-idx').innerText = i + 1;
        const q = row.querySelector('.qty').value || 0;
        const c = row.querySelector('.cost').value || 0;
        row.querySelector('.total-row').innerText = (q * c).toFixed(2);
    });
}

/* --- استيراد Excel حقيقي --- */
function processExcel(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        document.getElementById('po-rows').innerHTML = ''; // تفريغ الجدول
        rows.forEach(r => {
            addRow({ brand: r.البراند, w: r.عرض, h: r.ارتفاع, r: r.قطر, qty: r.الكمية, cost: r.التكلفة });
        });
    };
    reader.readAsArrayBuffer(file);
}

/* ============================================================
   4. الإحصائيات والرسوم البيانية
   ============================================================ */
function refreshDashboard() {
    const container = document.getElementById('stats-tiles');
    const stats = [
        { label: "إحصائيات اليوم", val: "14,500", color: "#004a99" },
        { label: "الأسبوع الماضي", val: "92,000", color: "#f39c12" },
        { label: "الشهر الماضي", val: "340,000", color: "#10b981" },
        { label: "وقت مخصص", val: "0.00", color: "#6366f1" }
    ];
    container.innerHTML = stats.map(s => `
        <div class="col-md-3">
            <div class="tile-stat shadow-sm">
                <div class="small fw-bold text-muted mb-1">${s.label}</div>
                <div class="h3 fw-bold m-0" style="color:${s.color}">${s.val} <small class="fs-6">ر.س</small></div>
            </div>
        </div>
    `).join('');
}

function initCharts() {
    new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: { labels: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'], datasets: [{ label: 'الطلبات', data: [12, 19, 10, 15, 8], borderColor: '#004a99', tension: 0.4 }] }
    });
    new Chart(document.getElementById('pieChart'), {
        type: 'doughnut',
        data: { labels: ['مشتريات','جملة','فروع'], datasets: [{ data: [40, 20, 40], backgroundColor: ['#004a99','#f39c12','#10b981'] }] }
    });
}

/* ============================================================
   5. الإعدادات وإدارة المظهر
   ============================================================ */
function applyStyle() {
    const c = document.getElementById('set-color').value;
    const s = document.getElementById('set-font').value;
    document.documentElement.style.setProperty('--p-color', c);
    document.documentElement.style.setProperty('--f-size', s + 'px');
}

function saveUser() {
    const newUser = {
        name: document.getElementById('u-name').value,
        pass: document.getElementById('u-pass').value,
        job: document.getElementById('u-job').value,
        perms: {
            review: document.getElementById('p-review').checked,
            edit: document.getElementById('p-edit').checked,
            cost: document.getElementById('p-cost').checked,
            suspend: document.getElementById('p-suspend').checked,
            approve: document.getElementById('p-approve').checked,
            delete: document.getElementById('p-delete').checked,
            admin: document.getElementById('p-admin').checked
        }
    };
    users.push(newUser);
    localStorage.setItem('yn_users', JSON.stringify(users));
    location.reload();
}

function showTab(id, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    btn.classList.add('active');
}

function toggleSidebar() {
    const s = document.getElementById('sidebar');
    s.style.width = (s.style.width === '0px') ? '260px' : '0px';
}