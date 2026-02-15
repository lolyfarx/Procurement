// --- إعدادات الربط ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw-QcywWWDhGI8w9FRW_yFvXAUQyup6UXF2CAy8QVV8kYTVQMSZj7elAGH2inbdXQ9ipA/exec"; 

// 1. تحكم شاشة الترحيب والتنقل
window.onload = () => {
    setTimeout(() => {
        document.getElementById('splash-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            initializeCharts();
        }, 600);
    }, 2800);
};

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function showSection(id) {
    ['dashboard', 'new-request', 'admin-review'].forEach(s => {
        document.getElementById('section-' + s).style.display = 'none';
    });
    document.getElementById('section-' + id).style.display = 'block';
    if (window.innerWidth < 992) toggleSidebar();
}

// 2. إدارة جدول الأصناف
function addRow() {
    const tbody = document.getElementById('items-table');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control" placeholder="براند"></td>
        <td><input type="text" class="form-control" placeholder="مقاس"></td>
        <td><div class="qty-box"><button onclick="changeQty(this, -1)">-</button><input type="number" value="1" class="qty-input"><button onclick="changeQty(this, 1)">+</button></div></td>
        <td><button class="btn btn-outline-danger btn-sm" onclick="this.closest('tr').remove()"><i class="bi bi-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
}

function changeQty(btn, delta) {
    const input = btn.parentNode.querySelector('input');
    let v = parseInt(input.value) + delta;
    input.value = v < 1 ? 1 : v;
}

// 3. الرسوم البيانية (Dashboard)
function initializeCharts() {
    new Chart(document.getElementById('budgetChart'), {
        type: 'bar',
        data: {
            labels: ['الشركات', 'الاستيراد', 'الجملة', 'المناقصات', 'الفروع'],
            datasets: [{ label: 'المنصرف ر.س', data: [450000, 300000, 250000, 600000, 150000], backgroundColor: '#004a99' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
    new Chart(document.getElementById('categoryChart'), {
        type: 'doughnut',
        data: {
            labels: ['إطارات', 'بطاريات', 'أخرى'],
            datasets: [{ data: [70, 20, 10], backgroundColor: ['#004a99', '#f37021', '#714B67'] }]
        }
    });
}

// 4. إرسال البيانات الفعلي لجوجل شيت
async function submitToGoogle() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "جاري الحفظ...";

    const items = [];
    document.querySelectorAll('#items-table tr').forEach(row => {
        const ins = row.querySelectorAll('input');
        if(ins.length > 0) items.push(`${ins[0].value} (${ins[1].value}) - كمية: ${ins[2].value}`);
    });

    const data = {
        section: document.getElementById('req-dept').value,
        items: items.join(' | '),
        note: document.getElementById('req-note').value
    };

    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        alert("تم إرسال الطلب بنجاح لشركة النهدي!");
        showSection('dashboard');
    } catch (e) {
        alert("خطأ في الربط مع السيرفر");
    } finally {
        btn.disabled = false;
        btn.innerText = "إرسال الطلب للاعتماد";
    }
}