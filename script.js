// ==========================================
// 1. الإعدادات والبيانات الأساسية
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7VkdCwBuq-O97bTs8of7JOnMFXS7MeiFXv-e7o1FAq6NALXQu3agc0G_QQMl9ebx-eA/exec";

// تعريف الفروع والأقسام (21 فرع + الأقسام الرئيسية)
const branches = Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`);
const depts = ["قسم الشركات", "قسم الاستيراد", "قسم الجملة", "إدارة المشتريات", ...branches];

// مخزن البيانات الدائم في المتصفح
let allOrdersData = JSON.parse(localStorage.getItem('erp_all_orders')) || [];
let appSettings = {
    userName: localStorage.getItem('erp_username') || "المدير العام",
    showPrice: localStorage.getItem('erp_showPrice') !== 'false',
    themeColor: localStorage.getItem('erp_theme') || "#004a99",
    fontSize: localStorage.getItem('erp_fontSize') || "14"
};

// ==========================================
// 2. التشغيل عند تحميل الصفحة
// ==========================================
window.onload = () => {
    // تعبئة قوائم الاختيار (Select)
    const inpDept = document.getElementById('inp-dept');
    const dashBranch = document.getElementById('dash-branch-filter');
    
    depts.forEach(d => {
        if(inpDept) inpDept.add(new Option(d, d));
        if(dashBranch) dashBranch.add(new Option(d, d));
    });

    applySavedSettings();
    updateSystemTime();

    // تشغيل شاشة الترحيب
    setTimeout(() => {
        document.getElementById('splash-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            refreshDashboard(); // تحديث اللوحة فوراً
        }, 500);
    }, 2000);

    createNewRow(); // إضافة أول صف فارغ
};

function updateSystemTime() {
    const el = document.getElementById('inp-date');
    if(el) el.value = new Date().toLocaleString('ar-SA');
}

// ==========================================
// 3. لوحة التحكم المتطورة (الفلاتر الزمنية)
// ==========================================
function toggleDateInputs() {
    const period = document.getElementById('dash-period').value;
    const container = document.getElementById('custom-date-container');
    container.style.display = (period === 'custom') ? 'block' : 'none';
    refreshDashboard();
}

function refreshDashboard() {
    const period = document.getElementById('dash-period').value;
    const branch = document.getElementById('dash-branch-filter').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const now = new Date();

    // الفلترة الذكية للبيانات الحقيقية
    let filteredData = allOrdersData.filter(order => {
        const orderDate = new Date(order.timestamp);
        
        // أ. فلترة الفرع
        const matchBranch = (branch === 'all' || order.section === branch);
        if(!matchBranch) return false;

        // ب. فلترة الوقت
        if (period === 'today') {
            return orderDate.toDateString() === now.toDateString();
        } else if (period === 'month') {
            return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        } else if (period === 'year') {
            return orderDate.getFullYear() === now.getFullYear();
        } else if (period === 'custom') {
            if (dateFrom && dateTo) {
                const from = new Date(dateFrom);
                const to = new Date(dateTo);
                to.setHours(23, 59, 59);
                return orderDate >= from && orderDate <= to;
            }
        }
        return true;
    });

    // تحديث الأرقام في البطاقات
    const totalCost = filteredData.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    const totalQty = filteredData.reduce((sum, o) => sum + parseInt(o.qty || 0), 0);
    
    document.getElementById('dash-total-cost').innerText = totalCost.toLocaleString(undefined, {minimumFractionDigits: 2});
    document.getElementById('dash-orders-count').innerText = filteredData.length;
    document.getElementById('dash-items-qty').innerText = totalQty;
    document.getElementById('dash-avg-order').innerText = filteredData.length > 0 ? (totalCost / filteredData.length).toFixed(2) : "0";

    updateCharts(filteredData, period);
}

function updateCharts(data, period) {
    const ctxMain = document.getElementById('mainChart').getContext('2d');
    const ctxPie = document.getElementById('deptPieChart').getContext('2d');
    
    if(window.erpChart) window.erpChart.destroy();
    if(window.erpPie) window.erpPie.destroy();

    // الرسم البياني الخطي
    window.erpChart = new Chart(ctxMain, {
        type: 'line',
        data: {
            labels: data.map(o => new Date(o.timestamp).toLocaleDateString('ar-SA')),
            datasets: [{
                label: 'حجم العمليات',
                data: data.map(o => o.total),
                borderColor: appSettings.themeColor,
                backgroundColor: 'rgba(0, 74, 153, 0.1)',
                fill: true, tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // الرسم البياني الدائري
    window.erpPie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['منفذ', 'قيد التنفيذ'],
            datasets: [{
                data: [data.length, 5], 
                backgroundColor: [appSettings.themeColor, '#f37021']
            }]
        }
    });
}

// ==========================================
// 4. نموذج طلب الشراء (المقاسات والجدول)
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
    document.getElementById('stat-count').innerText = itemsCount;
}

async function sendToCloud() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = "جاري الإرسال...";

    const currentOrder = {
        section: document.getElementById('inp-dept').value,
        total: parseFloat(document.getElementById('grand-total-val').innerText.replace(/,/g, '')),
        qty: parseInt(document.getElementById('stat-count').innerText),
        timestamp: new Date().toISOString()
    };

    allOrdersData.push(currentOrder);
    localStorage.setItem('erp_all_orders', JSON.stringify(allOrdersData));

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(currentOrder)
        });
        alert("✅ تم الإرسال بنجاح وتحديث اللوحة!");
        refreshDashboard();
    } catch (e) {
        alert("⚠️ تم الحفظ محلياً (لا يوجد اتصال بالسحابة)");
    }
    
    btn.disabled = false;
    btn.innerHTML = "حفظ وإرسال الطلب";
}

// ==========================================
// 5. الإعدادات والطباعة
// ==========================================
function applySavedSettings() {
    document.documentElement.style.setProperty('--main-blue', appSettings.themeColor);
    document.getElementById('display-user-name').innerText = appSettings.userName;
    document.getElementById('inp-user').value = appSettings.userName;
    document.getElementById('set-name').value = appSettings.userName;
    document.getElementById('set-theme-color').value = appSettings.themeColor;
    
    changeFontSize(appSettings.fontSize);
    document.getElementById('set-font-size').value = appSettings.fontSize;
    document.getElementById('set-price-toggle').checked = appSettings.showPrice;
    togglePriceDisplay();
}

function updateGlobalSettings() {
    appSettings.userName = document.getElementById('set-name').value;
    appSettings.themeColor = document.getElementById('set-theme-color').value;
    appSettings.showPrice = document.getElementById('set-price-toggle').checked;
    appSettings.fontSize = document.getElementById('set-font-size').value;

    localStorage.setItem('erp_username', appSettings.userName);
    localStorage.setItem('erp_theme', appSettings.themeColor);
    localStorage.setItem('erp_showPrice', appSettings.showPrice);
    localStorage.setItem('erp_fontSize', appSettings.fontSize);

    applySavedSettings();
    alert("✅ تم حفظ الإعدادات!");
}

function changeFontSize(v) {
    document.getElementById('font-val').innerText = v;
    document.querySelectorAll('.erp-main-table, .form-control').forEach(el => el.style.fontSize = v + 'px');
}

function togglePriceDisplay() {
    const isVisible = document.getElementById('set-price-toggle').checked;
    document.querySelectorAll('.price-col').forEach(el => el.style.display = isVisible ? 'table-cell' : 'none');
}

function showTab(id, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }

function printInvoice() {
    const dept = document.getElementById('inp-dept').value;
    let rowsHtml = '';
    document.querySelectorAll('#order-rows tr').forEach(tr => {
        const i = tr.querySelectorAll('input');
        rowsHtml += `<tr><td>${i[0].value}</td><td>${i[1].value}/${i[2].value}/${i[3].value}</td><td>${i[4].value}</td></tr>`;
    });
    document.getElementById('print-zone').innerHTML = `<h2>طلب شراء: ${dept}</h2><table>${rowsHtml}</table>`;
    window.print();
}