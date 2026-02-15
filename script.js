let allOrdersData = JSON.parse(localStorage.getItem('erp_all_orders')) || [];
const branches = Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`);
const depts = ["قسم الشركات", "قسم الاستيراد", "قسم الجملة", "إدارة المشتريات", ...branches];

let appSettings = {
    userName: localStorage.getItem('erp_username') || "المدير العام",
    showPrice: localStorage.getItem('erp_showPrice') !== 'false',
    themeColor: localStorage.getItem('erp_theme') || "#004a99"
};

window.onload = () => {
    const dSelect = document.getElementById('inp-dept');
    const fSelect = document.getElementById('dash-branch-filter');
    depts.forEach(d => {
        if(dSelect) dSelect.add(new Option(d, d));
        if(fSelect) fSelect.add(new Option(d, d));
    });

    applySettings();
    
    setTimeout(() => {
        document.getElementById('splash-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        refreshDashboard();
    }, 1500);

    createNewRow();
};

// وظيفة الفلترة الزمنية الجديدة
function toggleDateInputs() {
    const period = document.getElementById('dash-period').value;
    document.getElementById('custom-date-container').style.display = (period === 'custom') ? 'block' : 'none';
    refreshDashboard();
}

function refreshDashboard() {
    const period = document.getElementById('dash-period').value;
    const branch = document.getElementById('dash-branch-filter').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const now = new Date();

    let filtered = allOrdersData.filter(order => {
        const orderDate = new Date(order.timestamp);
        const matchBranch = (branch === 'all' || order.section === branch);
        if(!matchBranch) return false;

        if (period === 'today') return orderDate.toDateString() === now.toDateString();
        if (period === 'month') return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        if (period === 'year') return orderDate.getFullYear() === now.getFullYear();
        if (period === 'custom' && dateFrom && dateTo) {
            const from = new Date(dateFrom);
            const to = new Date(dateTo);
            to.setHours(23,59,59);
            return orderDate >= from && orderDate <= to;
        }
        return true;
    });

    // تحديث الأرقام
    let total = filtered.reduce((s, o) => s + o.total, 0);
    let qty = filtered.reduce((s, o) => s + o.qty, 0);
    
    document.getElementById('dash-total-cost').innerText = total.toLocaleString();
    document.getElementById('dash-orders-count').innerText = filtered.length;
    document.getElementById('dash-items-qty').innerText = qty;
    document.getElementById('dash-avg-order').innerText = filtered.length ? (total/filtered.length).toFixed(2) : 0;

    renderCharts(filtered);
}

function renderCharts(data) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if(window.erpChart) window.erpChart.destroy();
    window.erpChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['بداية الفترة', 'منتصف الفترة', 'نهاية الفترة'],
            datasets: [{
                label: 'العمليات',
                data: [Math.random()*100, Math.random()*200, data.length],
                borderColor: appSettings.themeColor,
                fill: true,
                backgroundColor: 'rgba(0,74,153,0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

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
        <td class="price-col"><input type="number" class="form-control cost-inp" value="0" onchange="calcTotal()"></td>
        <td class="price-col row-total fw-bold">0.00</td>
        <td><button class="btn btn-sm text-danger" onclick="this.closest('tr').remove(); calcTotal();">×</button></td>
    `;
    tbody.appendChild(tr);
    calcTotal();
}

function calcTotal() {
    let grand = 0, qSum = 0;
    document.querySelectorAll('#order-rows tr').forEach(row => {
        const q = parseFloat(row.querySelector('.qty-inp').value) || 0;
        const c = parseFloat(row.querySelector('.cost-inp').value) || 0;
        const sub = q * c;
        row.querySelector('.row-total').innerText = sub.toFixed(2);
        grand += sub; qSum += q;
    });
    document.getElementById('grand-total-val').innerText = grand.toLocaleString();
    document.getElementById('stat-count').innerText = qSum;
}

function sendToCloud() {
    const order = {
        section: document.getElementById('inp-dept').value,
        total: parseFloat(document.getElementById('grand-total-val').innerText.replace(/,/g,'')),
        qty: parseInt(document.getElementById('stat-count').innerText),
        timestamp: new Date().toISOString()
    };
    allOrdersData.push(order);
    localStorage.setItem('erp_all_orders', JSON.stringify(allOrdersData));
    refreshDashboard();
    alert("✅ تم الحفظ وتحديث لوحة البيانات");
}

function showTab(id, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById('tab-'+id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
}

function applySettings() {
    document.getElementById('inp-user').value = appSettings.userName;
    document.getElementById('display-user-name').innerText = appSettings.userName;
    document.getElementById('inp-date').value = new Date().toLocaleDateString('ar-SA');
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }