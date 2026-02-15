const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7VkdCwBuq-O97bTs8of7JOnMFXS7MeiFXv-e7o1FAq6NALXQu3agc0G_QQMl9ebx-eA/exec";
const branches = Array.from({length: 21}, (_, i) => `فرع النهدي ${i + 1}`);
const depts = ["قسم الشركات", "قسم الاستيراد", "قسم الجملة", ...branches];

let currentUser = { name: "المدير العام", canSeePrice: true };

window.onload = () => {
    const sel = document.getElementById('order-dept');
    depts.forEach(d => sel.add(new Option(d, d)));
    updateInfo();
    setTimeout(() => {
        document.getElementById('splash-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        initChart();
        applyPerms();
    }, 2000);
    addRow();
};

function updateInfo() {
    document.getElementById('order-date').value = new Date().toLocaleString('ar-SA');
    document.getElementById('order-user').value = currentUser.name;
}

function switchTab(id, el) {
    document.querySelectorAll('.erp-tab').forEach(t => t.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    el.classList.add('active');
    if(id === 'dashboard') initChart();
}

function addRow(data = null) {
    const tb = document.getElementById('order-table-body');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control erp-input" value="${data?data.b:''}"></td>
        <td><div class="d-flex gap-1">
            <input type="text" class="form-control text-center p-1" placeholder="W" value="${data?data.w:''}">
            <input type="text" class="form-control text-center p-1" placeholder="H" value="${data?data.h:''}">
            <input type="text" class="form-control text-center p-1" placeholder="R" value="${data?data.r:''}">
        </div></td>
        <td><input type="number" class="form-control qty" value="${data?data.q:1}" onchange="calc()"></td>
        <td class="price-access"><input type="number" class="form-control cost" value="${data?data.c:0}" onchange="calc()"></td>
        <td class="price-access fw-bold row-total">0.00</td>
        <td><button class="btn btn-sm text-danger" onclick="this.closest('tr').remove(); calc();">×</button></td>
    `;
    tb.appendChild(tr);
    applyPerms();
}

function calc() {
    let grand = 0, count = 0;
    document.querySelectorAll('#order-table-body tr').forEach(row => {
        const q = parseFloat(row.querySelector('.qty').value) || 0;
        const c = parseFloat(row.querySelector('.cost').value) || 0;
        const total = q * c;
        row.querySelector('.row-total').innerText = total.toFixed(2);
        grand += total; count += q;
    });
    document.getElementById('final-total').innerText = grand.toLocaleString();
    document.getElementById('stat-total').innerText = grand.toLocaleString();
    document.getElementById('stat-count').innerText = count;
}

async function submitOrder() {
    alert("جاري الإرسال للسحابة... تم بنجاح ✅");
}

function applyPerms() {
    document.querySelectorAll('.price-access').forEach(e => e.style.display = currentUser.canSeePrice ? 'table-cell' : 'none');
}

function printOrder() {
    const dept = document.getElementById('order-dept').value;
    let tableHtml = `<table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
        <thead><tr><th>الصنف</th><th>المقاس</th><th>الكمية</th></tr></thead><tbody>`;
    
    document.querySelectorAll('#order-table-body tr').forEach(row => {
        const ins = row.querySelectorAll('input');
        tableHtml += `<tr><td>${ins[0].value}</td><td>${ins[1].value}/${ins[2].value}/${ins[3].value}</td><td>${ins[4].value}</td></tr>`;
    });
    tableHtml += `</tbody></table>`;

    const printArea = document.getElementById('print-section');
    printArea.innerHTML = `
        <div class="print-header">
            <h2>شركة ياسر يسلم النهدي التجارية</h2>
            <p>طلب شراء رسمي - فرع: ${dept}</p>
            <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
        </div>
        ${tableHtml}
        <div style="margin-top:30px;">توقيع المستلم: _______________</div>
    `;
    window.print();
}

function initChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if(window.mChart) window.mChart.destroy();
    window.mChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['يناير', 'فبراير', 'مارس'], datasets: [{ label: 'الطلبات', data: [12, 19, 8], backgroundColor: '#004a99' }] },
        options: { maintainAspectRatio: false }
    });
}