/* --- قاعدة البيانات والإعدادات --- */
const DEPARTMENTS = ["المشتريات", "الشركات", "الاستيراد", "الجملة", ...Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`)];
let users = JSON.parse(localStorage.getItem('erp_users')) || [
    { name: "admin", pass: "@Mm123321", job: "مدير النظام", perms: { admin: true, review: true } }
];
let orders = JSON.parse(localStorage.getItem('erp_orders')) || [];
let currentUser = null;

/* --- نظام الدخول --- */
function handleLogin() {
    const u = document.getElementById('user-login').value;
    const p = document.getElementById('pass-login').value;
    const found = users.find(user => user.name === u && user.pass === p);
    
    if(found) {
        currentUser = found;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        initApp();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

/* --- تشغيل النظام --- */
function initApp() {
    // تعبئة الأقسام الـ 21
    const deptSel = document.getElementById('order-dept');
    deptSel.innerHTML = DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('');
    
    // معلومات الموظف
    document.getElementById('nav-user-name').innerText = currentUser.name;
    document.getElementById('nav-user-job').innerText = currentUser.job;
    document.getElementById('order-user').value = currentUser.name;
    document.getElementById('order-job').value = currentUser.job;
    document.getElementById('order-time').value = new Date().toLocaleString('ar-SA');

    // الصلاحيات
    if(!currentUser.perms.admin) document.querySelectorAll('.p-admin-auth').forEach(el => el.style.display = 'none');
    if(!currentUser.perms.review) document.querySelectorAll('.p-review-auth').forEach(el => el.style.display = 'none');

    filterStats();
    renderUsersList();
    addOrderRow();
    renderCharts();
}

/* --- نظام طلب الشراء (التحريك والتحكم) --- */
function addOrderRow() {
    const tbody = document.getElementById('order-rows');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="text-center fw-bold row-idx"></td>
        <td><input type="text" class="form-control" placeholder="البراند"></td>
        <td>
            <div class="d-flex gap-1">
                <input type="text" class="form-control text-center p-1" placeholder="W" title="العرض">
                <input type="text" class="form-control text-center p-1" placeholder="H" title="الارتفاع">
                <input type="text" class="form-control text-center p-1" placeholder="R" title="القطر">
            </div>
        </td>
        <td><input type="number" class="form-control qty" value="1" oninput="calculate()"></td>
        <td><input type="number" class="form-control cost" value="0" oninput="calculate()"></td>
        <td class="total-row fw-bold text-primary">0.00</td>
        <td class="text-center">
            <button class="btn btn-sm btn-light border" onclick="moveRow(this, -1)">↑</button>
            <button class="btn btn-sm btn-light border" onclick="moveRow(this, 1)">↓</button>
        </td>
        <td class="text-center"><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove(); calculate();"><i class="bi bi-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
    calculate();
}

function moveRow(btn, dir) {
    const row = btn.closest('tr');
    if(dir === -1 && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
    if(dir === 1 && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
    calculate();
}

function calculate() {
    let grand = 0; let totalQty = 0;
    document.querySelectorAll('#order-rows tr').forEach((row, idx) => {
        row.querySelector('.row-idx').innerText = idx + 1;
        const q = parseFloat(row.querySelector('.qty').value) || 0;
        const c = parseFloat(row.querySelector('.cost').value) || 0;
        const sub = q * c;
        row.querySelector('.total-row').innerText = sub.toFixed(2);
        grand += sub; totalQty += q;
    });
    document.getElementById('grand-total').innerText = grand.toLocaleString();
    document.getElementById('total-qty').innerText = totalQty;
}

/* --- الإحصائيات الزمنية --- */
function filterStats() {
    const grid = document.getElementById('stats-grid');
    const now = new Date();
    
    const dayTotal = orders.filter(o => isSameDay(new Date(o.date), now)).reduce((a,b)=>a+b.total, 0);
    const weekTotal = orders.filter(o => (now - new Date(o.date)) < 604800000).reduce((a,b)=>a+b.total, 0);
    const monthTotal = orders.filter(o => (now - new Date(o.date)) < 2592000000).reduce((a,b)=>a+b.total, 0);

    grid.innerHTML = `
        <div class="col-md-3"><div class="stat-card"><div class="small fw-bold text-muted">إجمالي اليوم</div><div class="stat-val">${dayTotal}</div></div></div>
        <div class="col-md-3"><div class="stat-card" style="border-color:#f39c12"><div class="small fw-bold text-muted">الأسبوع الماضي</div><div class="stat-val">${weekTotal}</div></div></div>
        <div class="col-md-3"><div class="stat-card" style="border-color:#10b981"><div class="small fw-bold text-muted">الشهر الماضي</div><div class="stat-val">${monthTotal}</div></div></div>
        <div class="col-md-3"><div class="stat-card" style="border-color:#6366f1"><div class="small fw-bold text-muted">وقت مخصص</div><div class="stat-val">--</div></div></div>
    `;
}

function isSameDay(d1, d2) { return d1.toDateString() === d2.toDateString(); }

/* --- إدارة المظهر --- */
function applyStyles() {
    const color = document.getElementById('set-color').value;
    const size = document.getElementById('set-font').value;
    document.documentElement.style.setProperty('--main-color', color);
    document.documentElement.style.setProperty('--font-size', size + 'px');
}

/* --- الرسوم البيانية --- */
function renderCharts() {
    new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: { labels: ['السبت','الأحد','الأثنين','الثلاثاء','الأربعاء'], datasets: [{ label: 'حجم الطلبات', data: [12, 19, 3, 5, 2], borderColor: '#004a99', tension: 0.4 }] }
    });
    new Chart(document.getElementById('pieChart'), {
        type: 'doughnut',
        data: { labels: ['المشتريات','الجملة','الفروع'], datasets: [{ data: [40, 20, 40], backgroundColor: ['#004a99','#f39c12','#10b981'] }] }
    });
}

/* --- وظائف عامة --- */
function showTab(id, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
}

function toggleSidebar() {
    const s = document.getElementById('sidebar');
    s.style.display = s.style.display === 'none' ? 'block' : 'none';
}

function saveUser() {
    users.push({
        name: document.getElementById('u-name').value,
        pass: document.getElementById('u-pass').value,
        job: document.getElementById('u-job').value,
        perms: { admin: document.getElementById('u-p-admin').checked, review: document.getElementById('u-p-review').checked }
    });
    localStorage.setItem('erp_users', JSON.stringify(users));
    renderUsersList();
    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
}

function renderUsersList() {
    const list = document.getElementById('users-list-ui');
    list.innerHTML = `<table class="table table-sm mt-3"><thead><tr><th>الاسم</th><th>الوظيفة</th><th>إدارة</th><th>مراجعة</th><th>حذف</th></tr></thead>
    <tbody>${users.map((u, i) => `<tr><td>${u.name}</td><td>${u.job}</td><td>${u.perms.admin?'✅':'❌'}</td><td>${u.perms.review?'✅':'❌'}</td><td><button class="btn btn-sm btn-link text-danger" onclick="users.splice(${i},1);localStorage.setItem('erp_users',JSON.stringify(users));renderUsersList();">حذف</button></td></tr>`).join('')}</tbody></table>`;
}