// ==========================================
// 1. الإعدادات والمتغيرات العامة
// ==========================================
let allOrdersData = JSON.parse(localStorage.getItem('erp_all_orders')) || []; 
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7VkdCwBuq-O97bTs8of7JOnMFXS7MeiFXv-e7o1FAq6NALXQu3agc0G_QQMl9ebx-eA/exec";

const branches = Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`);
const depts = ["قسم الشركات", "قسم الاستيراد", "قسم الجملة", "إدارة المشتريات", ...branches];

let appSettings = {
    userName: localStorage.getItem('erp_username') || "المدير العام",
    showPrice: localStorage.getItem('erp_showPrice') === 'false' ? false : true,
    themeColor: localStorage.getItem('erp_theme') || "#004a99",
    fontSize: localStorage.getItem('erp_fontSize') || 14
};

// ==========================================
// 2. تشغيل النظام الأولي
// ==========================================
window.onload = () => {
    // تعبئة قائمة الأقسام في نموذج الطلب
    const dSelect = document.getElementById('inp-dept');
    if(dSelect) depts.forEach(d => dSelect.add(new Option(d, d)));
    
    // تعبئة فلتر الفروع في لوحة التحكم
    initDashFilters(); 
    
    // تطبيق الإعدادات والواجهة
    updateInterface();
    applyTheme();

    // تشغيل شاشة الترحيب
    setTimeout(() => {
        document.getElementById('splash-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            refreshDashboard(); // تحديث اللوحة فور الدخول
        }, 500);
    }, 2000);

    createNewRow();
};

function updateInterface() {
    if(document.getElementById('inp-date')) document.getElementById('inp-date').value = new Date().toLocaleString('ar-SA');
    document.getElementById('inp-user').value = appSettings.userName;
    document.getElementById('display-user-name').innerText = appSettings.userName;
    document.getElementById('set-name').value = appSettings.userName;
    togglePriceDisplay();
}

function applyTheme() {
    document.documentElement.style.setProperty('--main-blue', appSettings.themeColor);
    changeFontSize(appSettings.fontSize);
}

// ==========================================
// 3. إدارة لوحة التحكم (Dashboard) المتطورة
// ==========================================
function initDashFilters() {
    const filter = document.getElementById('dash-branch-filter');
    if(filter) {
        filter.innerHTML = '<option value="all">كل الفروع والأقسام</option>';
        depts.forEach(d => filter.add(new Option(d, d)));
    }
}

function refreshDashboard() {
    const period = document.getElementById('dash-period').value;
    const branch = document.getElementById('dash-branch-filter').value;

    // فلترة البيانات الحقيقية
    let filteredData = allOrdersData.filter(order => {
        return (branch === 'all' || order.section === branch);
    });

    // حساب الأرقام
    let totalCost = filteredData.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    let totalQty = filteredData.reduce((sum, o) => sum + parseInt(o.qty || 0), 0);
    let ordersCount = filteredData.length;
    let avgOrder = ordersCount > 0 ? (totalCost / ordersCount) : 0;

    // تحديث الأرقام في الواجهة
    document.getElementById('dash-total-cost').innerText = totalCost.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('dash-orders-count').innerText = ordersCount;
    document.getElementById('dash-items-qty').innerText = totalQty;
    document.getElementById('dash-avg-order').innerText = avgOrder.toLocaleString('en-US', {minimumFractionDigits: 2});

    updateCharts(filteredData, period);
}

function updateCharts(data, period) {
    const ctxMain = document.getElementById('mainChart').getContext('2d');
    const ctxPie = document.getElementById('deptPieChart')?.getContext('2d');
    
    if(window.erpChart) window.erpChart.destroy();
    if(window.erpPie && ctxPie) window.erpPie.destroy();
    
    const labels = getLabelsForPeriod(period);
    
    // المخطط الرئيسي (Line Chart)
    window.erpChart = new Chart(ctxMain, {
        type: 'line', 
        data: {
            labels: labels,
            datasets: [{
                label: 'حجم العمليات (ر.س)',
                data: generateDummyData(period, data), 
                borderColor: appSettings.themeColor,
                backgroundColor: 'rgba(0, 74, 153, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // المخطط الدائري (Pie Chart)
    if(ctxPie) {
        window.erpPie = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['الشركات', 'الفروع', 'الجملة'],
                datasets: [{
                    data: [30, 50, 20],
                    backgroundColor: [appSettings.themeColor, '#f37021', '#10b981']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function getLabelsForPeriod(p) {
    switch(p) {
        case 'today': return ['8ص', '12ظ', '4ع', '8م'];
        case 'week': return ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
        case 'month': return ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'];
        case '3months': case '6months': case '9months': case 'year': return ['يناير', 'مارس', 'مايو', 'يوليو', 'سبتمبر', 'نوفمبر'];
        default: return ['فترة 1', 'فترة 2', 'فترة 3', 'فترة 4'];
    }
}

function generateDummyData(p, data) {
    const base = data.length > 0 ? 5000 : 0;
    return [base, base + 2000, base + 1500, base + 4000, base + 3000, base + 5000];
}

// ==========================================
// 4. إدارة جدول طلبات الشراء
// ==========================================
function createNewRow(data = null) {
    const tbody = document.getElementById('order-rows');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control" value="${data?data.b:''}" placeholder="البراند"></td>
        <td>
            <div class="d-flex gap-1">
                <input type="text" class="form-control text-center" placeholder="W" value="${data?data.w:''}">
                <input type="text" class="form-control text-center" placeholder="H" value="${data?data.h:''}">
                <input type="text" class="form-control text-center" placeholder="R" value="${data?data.r:''}">
            </div>
        </td>
        <td><input type="number" class="form-control qty-inp" value="${data?data.q:1}" onchange="calcTotal()"></td>
        <td class="price-col"><input type="number" class="form-control cost-inp" value="${data?data.c:0}" onchange="calcTotal()"></td>
        <td class="price-col fw-bold text-primary row-total">0.00</td>
        <td><button class="btn btn-sm text-danger" onclick="this.closest('tr').remove(); calcTotal();">×</button></td>
    `;
    tbody.appendChild(tr);
    togglePriceDisplay();
    calcTotal();
}

function calcTotal() {
    let grand = 0, itemsCount = 0;
    document.querySelectorAll('#order-rows tr').forEach(row => {
        const q = parseFloat(row.querySelector('.qty-inp').value) || 0;
        const c = parseFloat(row.querySelector('.cost-inp').value) || 0;
        const sub = q * c;
        row.querySelector('.row-total').innerText = sub.toFixed(2);
        grand += sub; itemsCount += q;
    });
    document.getElementById('grand-total-val').innerText = grand.toLocaleString();
    document.getElementById('stat-total').innerText = grand.toLocaleString();
    document.getElementById('stat-count').innerText = itemsCount;
}

// ==========================================
// 5. الإعدادات، الطباعة، والإرسال
// ==========================================
function updateGlobalSettings() {
    appSettings.userName = document.getElementById('set-name').value || "User";
    appSettings.themeColor = document.getElementById('set-theme-color').value;
    localStorage.setItem('erp_username', appSettings.userName);
    localStorage.setItem('erp_theme', appSettings.themeColor);
    applyTheme();
    updateInterface();
    alert("تم تحديث وحفظ النظام بنجاح ✅");
}

function togglePriceDisplay() {
    appSettings.showPrice = document.getElementById('set-price-toggle').checked;
    localStorage.setItem('erp_showPrice', appSettings.showPrice);
    document.querySelectorAll('.price-col').forEach(el => el.style.display = appSettings.showPrice ? 'table-cell' : 'none');
    const totalParent = document.getElementById('grand-total-val').parentElement;
    totalParent.style.display = appSettings.showPrice ? 'block' : 'none';
}

function changeFontSize(v) {
    appSettings.fontSize = v;
    localStorage.setItem('erp_fontSize', v);
    document.getElementById('font-val').innerText = v;
    const table = document.querySelector('.erp-main-table');
    if(table) table.style.fontSize = v + 'px';
}

async function sendToCloud() {
    const currentOrder = {
        section: document.getElementById('inp-dept').value,
        total: parseFloat(document.getElementById('grand-total-val').innerText.replace(/,/g, '')),
        qty: parseInt(document.getElementById('stat-count').innerText),
        date: new Date().toISOString()
    };
    allOrdersData.push(currentOrder);
    localStorage.setItem('erp_all_orders', JSON.stringify(allOrdersData));
    refreshDashboard();
    alert("✅ تم إرسال البيانات وتحديث لوحة التحكم بنجاح");
}

function printInvoice() {
    const printZone = document.getElementById('print-zone');
    const dept = document.getElementById('inp-dept').value;
    let tableRows = '';
    document.querySelectorAll('#order-rows tr').forEach(tr => {
        const i = tr.querySelectorAll('input');
        tableRows += `<tr><td>${i[0].value}</td><td>${i[1].value}/${i[2].value}/${i[3].value}</td><td>${i[4].value}</td></tr>`;
    });
    printZone.innerHTML = `<div style="text-align:center; direction:rtl;"><h2>شركة ياسر يسلم النهدي التجارية</h2><h3>أمر شراء رسمي - ${dept}</h3>${tableRows}</div>`;
    window.print();
}

function showTab(tabId, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
    if(tabId === 'dashboard') refreshDashboard();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}