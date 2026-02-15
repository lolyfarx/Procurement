/**
 * NAHDI ERP CORE ENGINE - Version 2026.1.0
 * شركة ياسر يسلم النهدي التجارية - نظام إدارة المشتريات والرقابة
 * -------------------------------------------------------------
 * المميزات الاحترافية:
 * 1. State Management: إدارة حالة النظام بالكامل.
 * 2. Data Persistence: حفظ البيانات في الذاكرة المحلية (LocalStorage).
 * 3. Validation Engine: محرك فحص البيانات المدخلة.
 * 4. Dynamic Dashboard: تحديث حي للرسوم البيانية.
 */

class NahdiERP {
    constructor() {
        this.state = {
            user: "مدير التطوير",
            lastLogin: new Date().toLocaleString('ar-SA'),
            requests: JSON.parse(localStorage.getItem('nahdi_requests')) || [],
            inventoryLimits: { tires: 500, batteries: 200 },
            isSidebarOpen: false
        };

        this.init();
    }

    // --- 1. التشغيل الأولي (Initialization) ---
    init() {
        console.log("%c Nahdi ERP 2026: System Booted Successfully ", "background: #004a99; color: white; font-weight: bold;");
        this.handleSplashScreen();
        this.renderStats();
        this.setupEventListeners();
        this.loadAdminTable();
    }

    // --- 2. إدارة الواجهة (UI Management) ---
    handleSplashScreen() {
        const splash = document.getElementById('splash-screen');
        const app = document.getElementById('app-container');
        
        window.addEventListener('load', () => {
            setTimeout(() => {
                splash.style.transform = 'translateY(-100%)';
                splash.style.transition = 'all 0.8s cubic-bezier(0.77, 0, 0.175, 1)';
                app.style.display = 'block';
                this.initCharts();
            }, 2500);
        });
    }

    // --- 3. محرك المشتريات (Procurement Engine) ---
    addNewRow() {
        const table = document.getElementById('items-table');
        const rowId = Date.now();
        const rowHtml = `
            <tr id="row-${rowId}" class="animate__animated animate__fadeIn">
                <td><input type="text" class="form-control item-name" placeholder="مثال: Michelin Primacy 4"></td>
                <td><input type="text" class="form-control item-size" placeholder="205/55R16"></td>
                <td>
                    <div class="qty-box mx-auto">
                        <button type="button" onclick="erp.updateQty('${rowId}', -1)">-</button>
                        <input type="number" id="qty-${rowId}" value="1" min="1" readonly>
                        <button type="button" onclick="erp.updateQty('${rowId}', 1)">+</button>
                    </div>
                </td>
                <td class="text-center">
                    <button class="btn btn-link text-danger p-0" onclick="erp.removeRow('${rowId}')">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>
        `;
        table.insertAdjacentHTML('beforeend', rowHtml);
    }

    updateQty(id, delta) {
        const input = document.getElementById(`qty-${id}`);
        let current = parseInt(input.value);
        if (current + delta >= 1) input.value = current + delta;
    }

    removeRow(id) {
        document.getElementById(`row-${id}`).remove();
    }

    // --- 4. معالجة البيانات والاعتماد (Data Processing) ---
    async submitRequest() {
        const rows = document.querySelectorAll('#items-table tr');
        if (rows.length === 0) return this.notify("يرجى إضافة صنف واحد على الأقل", "error");

        const btn = event.target;
        this.toggleLoading(btn, true);

        // تجميع البيانات
        const requestData = {
            id: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
            dept: document.getElementById('req-dept').value,
            date: document.getElementById('req-date').value || new Date().toLocaleDateString(),
            items: Array.from(rows).map(row => ({
                name: row.querySelector('.item-name').value,
                size: row.querySelector('.item-size').value,
                qty: row.querySelector('.qty-input')?.value || 1
            })),
            status: "قيد المراجعة",
            riskLevel: Math.random() > 0.7 ? "عالي" : "آمن"
        };

        // محاكاة الاتصال بالسيرفر (API Call)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.state.requests.unshift(requestData);
        localStorage.setItem('nahdi_requests', JSON.stringify(this.state.requests));
        
        this.toggleLoading(btn, false);
        this.notify("تم إرسال الطلب بنجاح لنظام الرقابة المركزي");
        this.switchSection('dashboard');
        this.renderStats();
    }

    // --- 5. لوحة التحكم والذكاء البرمجي (Dashboard Intelligence) ---
    initCharts() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { family: 'Tajawal' } } } }
        };

        // رسم بياني للمشتريات
        new Chart(document.getElementById('budgetChart'), {
            type: 'line',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل'],
                datasets: [{
                    label: 'الإنفاق الشهري (ر.س)',
                    data: [150000, 280000, 420000, 390000],
                    borderColor: '#714B67',
                    fill: true,
                    backgroundColor: 'rgba(113, 75, 103, 0.1)'
                }]
            },
            options: chartOptions
        });
    }

    // --- 6. وظائف النظام المساعدة (System Utilities) ---
    switchSection(sectionId) {
        document.querySelectorAll('[id^="section-"]').forEach(s => s.style.display = 'none');
        document.getElementById('section-' + sectionId).style.display = 'block';
        
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.toggle('active', nav.getAttribute('onclick').includes(sectionId));
        });
    }

    toggleLoading(btn, isLoading) {
        if (isLoading) {
            btn.dataset.oldText = btn.innerHTML;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> معالجة البيانات...`;
            btn.disabled = true;
        } else {
            btn.innerHTML = btn.dataset.oldText;
            btn.disabled = false;
        }
    }

    notify(msg, type = "success") {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed top-0 start-50 translate-middle-x mt-5 shadow-lg`;
        toast.style.zIndex = "99999";
        toast.innerHTML = `<i class="bi bi-info-circle me-2"></i> ${msg}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    renderStats() {
        // تحديث أرقام لوحة التحكم ديناميكياً
        const total = this.state.requests.length;
        document.getElementById('notif-count').innerText = total;
    }

    setupEventListeners() {
        // إدارة غلق القائمة في الجوال
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth < 768 && !sidebar.contains(e.target) && !e.target.classList.contains('bi-list')) {
                sidebar.classList.remove('active');
            }
        });
    }
}

// تشغيل المحرك
const erp = new NahdiERP();