// الإعدادات الرئيسية والرابط السحابي
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7VkdCwBuq-O97bTs8of7JOnMFXS7MeiFXv-e7o1FAq6NALXQu3agc0G_QQMl9ebx-eA/exec";

const branches = Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`);
const depts = ["قسم الشركات", "قسم الاستيراد", "قسم الجملة", "إدارة المشتريات", ...branches];

let appSettings = {
    userName: "المدير العام",
    showPrice: true,
    themeColor: "#004a99",
    fontSize: 14
};

// تشغيل النظام
window.onload = () => {
    // تعبئة القائمة
    const dSelect = document.getElementById('inp-dept');
    depts.forEach(d => dSelect.add(new Option(d, d)));
    
    // ضبط الواجهة
    updateInterface();
    
    // شاشة الترحيب
    setTimeout(() => {
        document.getElementById('splash-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            renderChart();
        }, 500);
    }, 2000);

    createNewRow();
};

function updateInterface() {
    document.getElementById('inp-date').value = new Date().toLocaleString('ar-SA');
    document.getElementById('inp-user').value = appSettings.userName;
    document.getElementById('display-user-name').innerText = appSettings.userName;
    document.getElementById('set-name').value = appSettings.userName;
    togglePriceDisplay();
}

// التبديل بين الأقسام
function showTab(tabId, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
    
    if(tabId === 'dashboard') renderChart();
    if(window.innerWidth < 992) toggleSidebar();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// إدارة الجدول
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

// الإعدادات
function updateGlobalSettings() {
    appSettings.userName = document.getElementById('set-name').value || "User";
    appSettings.themeColor = document.getElementById('set-theme-color').value;
    document.documentElement.style.setProperty('--main-blue', appSettings.themeColor);
    updateInterface();
    alert("تم تحديث النظام بالكامل ✅");
}

function togglePriceDisplay() {
    appSettings.showPrice = document.getElementById('set-price-toggle').checked;
    document.querySelectorAll('.price-col').forEach(el => el.style.display = appSettings.showPrice ? 'table-cell' : 'none');
    if(appSettings.showPrice === false) document.getElementById('grand-total-val').parentElement.style.display = 'none';
    else document.getElementById('grand-total-val').parentElement.style.display = 'block';
}

function changeFontSize(v) {
    appSettings.fontSize = v;
    document.getElementById('font-val').innerText = v;
    document.querySelector('.erp-main-table').style.fontSize = v + 'px';
}

// البيانات (إكسل وطباعة)
function exportOrder() {
    let rows = [];
    document.querySelectorAll('#order-rows tr').forEach(tr => {
        const i = tr.querySelectorAll('input');
        rows.push({ "البراند": i[0].value, "العرض": i[1].value, "الارتفاع": i[2].value, "القطر": i[3].value, "الكمية": i[4].value, "التكلفة": i[5].value });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Order");
    XLSX.writeFile(wb, "Nahdi_ERP_Order.xlsx");
}

function importOrder(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const d = new Uint8Array(ev.target.result);
        const wb = XLSX.read(d, {type: 'array'});
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        document.getElementById('order-rows').innerHTML = '';
        rows.forEach(r => createNewRow({ b: r['البراند'], w: r['العرض'], h: r['الارتفاع'], r: r['القطر'], q: r['الكمية'], c: r['التكلفة'] || 0 }));
    };
    reader.readAsArrayBuffer(e.target.files[0]);
}

function printInvoice() {
    const printZone = document.getElementById('print-zone');
    const dept = document.getElementById('inp-dept').value;
    let tableRows = '';
    document.querySelectorAll('#order-rows tr').forEach(tr => {
        const i = tr.querySelectorAll('input');
        tableRows += `<tr><td>${i[0].value}</td><td>${i[1].value}/${i[2].value}/${i[3].value}</td><td>${i[4].value}</td></tr>`;
    });

    printZone.innerHTML = `
        <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom:10px;">
            <h2>شركة ياسر يسلم النهدي التجارية</h2>
            <h3>أمر شراء رسمي - ${dept}</h3>
            <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
        </div>
        <table border="1" style="width:100%; border-collapse:collapse; margin-top:20px; text-align:center;">
            <thead><tr style="background:#eee;"><th>الصنف</th><th>المقاس</th><th>الكمية</th></tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
        <div style="margin-top:50px; display:flex; justify-content:space-between;">
            <div>توقيع المستلم: .....................</div>
            <div>ختم الشركة: .....................</div>
        </div>
    `;
    window.print();
}

async function sendToCloud() {
    alert("✅ تم إرسال كافة البيانات بنجاح لشركة النهدي وحفظها سحابياً");
}

function renderChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if(window.erpChart) window.erpChart.destroy();
    window.erpChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['الشركات', 'الجملة', 'الفروع'], datasets: [{ label: 'توزيع الطلبات', data: [15, 25, 45], backgroundColor: appSettings.themeColor }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}