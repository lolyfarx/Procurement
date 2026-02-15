// --- إعدادات النظام ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7VkdCwBuq-O97bTs8of7JOnMFXS7MeiFXv-e7o1FAq6NALXQu3agc0G_QQMl9ebx-eA/exec"; 

// توليد الفروع الـ 21
const branches = Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`);
const depts = ["قسم الشركات", "قسم الاستيراد", "قسم الجملة", "المناقصات", ...branches];

let user = { name: "Admin", canSeePrice: true };

// --- عند التحميل ---
window.onload = () => {
    const sel = document.getElementById('req-dept');
    depts.forEach(d => sel.add(new Option(d, d)));
    
    document.getElementById('resp-user').value = user.name;
    updateDateTime();
    
    setTimeout(() => { 
        document.getElementById('splash-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            initChart();
        }, 500);
    }, 2500);
    
    addNewRow();
};

function updateDateTime() {
    document.getElementById('curr-date').value = new Date().toLocaleString('ar-SA');
}

function showSection(id) {
    ['dashboard', 'new-request', 'settings'].forEach(s => document.getElementById('section-'+s).style.display = 'none');
    document.getElementById('section-'+id).style.display = 'block';
    updateDateTime();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }

// --- إدارة الجدول ---
function addNewRow(data = null) {
    const tb = document.getElementById('items-table');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm brand" value="${data?data.b:''}" placeholder="Michelin"></td>
        <td><div class="d-flex gap-1">
            <input type="text" class="form-control form-control-sm text-center w-33" placeholder="W" value="${data?data.w:''}">
            <input type="text" class="form-control form-control-sm text-center w-33" placeholder="H" value="${data?data.h:''}">
            <input type="text" class="form-control form-control-sm text-center w-33" placeholder="R" value="${data?data.r:''}">
        </div></td>
        <td><input type="number" class="form-control form-control-sm text-center qty" value="${data?data.q:1}" onchange="calcTotal()"></td>
        <td class="price-col"><input type="number" class="form-control form-control-sm cost text-center" value="${data?data.c:0}" onchange="calcTotal()"></td>
        <td class="text-center"><button class="btn btn-sm text-danger" onclick="this.closest('tr').remove(); calcTotal();"><i class="bi bi-trash"></i></button></td>
    `;
    tb.appendChild(tr);
    applyPriceAccess();
    calcTotal();
}

function calcTotal() {
    let grand = 0;
    document.querySelectorAll('#items-table tr').forEach(row => {
        const q = row.querySelector('.qty').value;
        const c = row.querySelector('.cost').value;
        grand += (q * c);
    });
    document.getElementById('grand-total').innerText = grand.toLocaleString();
}

function applyPriceAccess() {
    document.querySelectorAll('.price-col').forEach(el => el.style.display = user.canSeePrice ? 'table-cell' : 'none');
}

// --- استيراد وتصدير إكسل ---
function exportToExcel() {
    let data = [];
    document.querySelectorAll('#items-table tr').forEach(tr => {
        const ins = tr.querySelectorAll('input');
        data.push({ "البراند": ins[0].value, "العرض": ins[1].value, "الارتفاع": ins[2].value, "القطر": ins[3].value, "الكمية": ins[4].value, "التكلفة": ins[5].value });
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Order");
    XLSX.writeFile(wb, "Nahdi_Purchase_Order.xlsx");
}

function importExcel(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const d = new Uint8Array(ev.target.result);
        const wb = XLSX.read(d, {type: 'array'});
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        document.getElementById('items-table').innerHTML = '';
        rows.forEach(r => addNewRow({ b: r['البراند'], w: r['العرض'], h: r['الارتفاع'], r: r['القطر'], q: r['الكمية'], c: r['التكلفة'] || 0 }));
    };
    reader.readAsArrayBuffer(e.target.files[0]);
}

// --- الإعدادات ---
function saveSettings() {
    user.name = document.getElementById('set-u').value || "Admin";
    user.canSeePrice = document.getElementById('set-show-price').checked;
    document.getElementById('display-user-name').innerText = user.name;
    document.getElementById('resp-user').value = user.name;
    applyPriceAccess();
    alert("تم حفظ إعدادات المستخدم بنجاح");
}

// --- الإرسال الفعلي لجوجل شيت ---
async function submitFinal() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "جاري الحفظ في السحابة...";

    let items = [];
    document.querySelectorAll('#items-table tr').forEach(row => {
        const ins = row.querySelectorAll('input');
        items.push(`${ins[0].value} [${ins[1].value}/${ins[2].value}/${ins[3].value}] x${ins[4].value}`);
    });

    const payload = {
        section: document.getElementById('req-dept').value,
        responsible: document.getElementById('resp-user').value,
        items: items.join(' | '),
        totalCost: document.getElementById('grand-total').innerText
    };

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });
        alert("✅ تم إرسال الطلب بنجاح لشركة النهدي!");
        location.reload();
    } catch (err) {
        alert("❌ خطأ في الاتصال: " + err);
    } finally {
        btn.disabled = false;
        btn.innerText = "إرسال الطلب للاعتماد";
    }
}

function initChart() {
    new Chart(document.getElementById('mainChart'), {
        type: 'bar',
        data: { labels: ['الشركات', 'الاستيراد', 'الجملة', 'الفروع'], datasets: [{ label: 'الطلبات النشطة', data: [15, 25, 10, 45], backgroundColor: '#004a99' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}