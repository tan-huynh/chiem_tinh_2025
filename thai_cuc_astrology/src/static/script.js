// API Configuration
const API_BASE_URL = window.location.origin + '/api/astrology';

// Global variables
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let selectedDay = new Date().getDate();
let monthlyData = null;
let energyChart = null;
let monthlyChart = null;

// Chart configuration
const chartConfig = {
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                labels: {
                    color: '#e0e0e0',
                    font: { size: 14 }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleFont: { size: 14 },
                bodyFont: { size: 13 },
                callbacks: {
                    title: function(tooltipItems) {
                        return tooltipItems[0].label;
                    },
                    label: function(context) {
                        const value = context.raw;
                        const type = value > 0 ? 'Dương' : value < 0 ? 'Âm' : 'Cân bằng';
                        return `Năng lượng: ${value} (${type})`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#e0e0e0',
                    font: { size: 12 }
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#e0e0e0',
                    font: { size: 12 }
                },
                suggestedMin: -6,
                suggestedMax: 6
            }
        }
    }
};

// Can chi definitions
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const NGU_HANH = {
    'Kim': ['Thân', 'Dậu'],
    'Thủy': ['Tý', 'Hợi'],
    'Mộc': ['Dần', 'Mão'],
    'Hỏa': ['Tỵ', 'Ngọ'],
    'Thổ': ['Thìn', 'Tuất', 'Sửu', 'Mùi']
};

const NGU_HANH_TUONG_SINH = {
    'Kim': 'Thủy',
    'Thủy': 'Mộc',
    'Mộc': 'Hỏa',
    'Hỏa': 'Thổ',
    'Thổ': 'Kim'
};

const NGU_HANH_TUONG_KHAC = {
    'Kim': 'Mộc',
    'Mộc': 'Thổ',
    'Thổ': 'Thủy',
    'Thủy': 'Hỏa',
    'Hỏa': 'Kim'
};

function getElementForChi(chi) {
    for (const [element, chis] of Object.entries(NGU_HANH)) {
        if (chis.includes(chi)) {
            return element;
        }
    }
    return null;
}

function getCanChiForHour(hour) {
    const chiIndex = Math.floor(hour / 2);
    return {
        chi: CHI[chiIndex],
        can: CAN[chiIndex % 10]
    };
}

function getAuspiciousHours(dayTrigram, dayElement) {
    const auspiciousHours = [];
    dayElement = normalizeElement(dayElement);
    
    for (let hour = 0; hour < 24; hour++) {
        const { chi } = getCanChiForHour(hour);
        const hourElement = getElementForChi(chi);
        
        // Check if hour's element supports day's element
        if (NGU_HANH_TUONG_SINH[hourElement] === dayElement ||
            NGU_HANH_TUONG_SINH[dayElement] === hourElement) {
            auspiciousHours.push(hour);
        }
    }
    
    return auspiciousHours;
}

function getInauspiciousHours(dayTrigram, dayElement) {
    const inauspiciousHours = [];
    dayElement = normalizeElement(dayElement);
    
    for (let hour = 0; hour < 24; hour++) {
        const { chi } = getCanChiForHour(hour);
        const hourElement = getElementForChi(chi);
        
        // Check if hour's element conflicts with day's element
        if (NGU_HANH_TUONG_KHAC[hourElement] === dayElement ||
            NGU_HANH_TUONG_KHAC[dayElement] === hourElement) {
            inauspiciousHours.push(hour);
        }
    }
    
    return inauspiciousHours;
}

function formatHourRange(hours) {
    if (!hours.length) return 'Không có';
    
    const ranges = [];
    let start = hours[0];
    let end = hours[0];
    
    for (let i = 1; i <= hours.length; i++) {
        if (i < hours.length && hours[i] === end + 1) {
            end = hours[i];
        } else {
            ranges.push(start === end ? 
                `${start}h` : 
                `${start}h-${end}h`);
            if (i < hours.length) {
                start = hours[i];
                end = hours[i];
            }
        }
    }
    
    return ranges.join(', ');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for Chart.js to load
        await new Promise((resolve, reject) => {
            const maxAttempts = 20;
            let attempts = 0;
            
            const checkChart = setInterval(() => {
                attempts++;
                if (typeof Chart !== 'undefined') {
                    clearInterval(checkChart);
                    console.log('Chart.js loaded successfully');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkChart);
                    reject(new Error('Chart.js failed to load. Please check your internet connection.'));
                }
            }, 100);
        });
        
        console.log('Starting app initialization...');
        await initializeApp();
        console.log('App initialized, setting up event listeners...');
        setupEventListeners();
        console.log('App setup complete');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Không thể khởi tạo ứng dụng: ' + error.message);
    }
});

async function initializeApp() {
    showLoading('Đang khởi tạo ứng dụng...');
    try {
        // Load initial data
        const monthlyDataResponse = await loadMonthlyData(currentYear, currentMonth);
        if (!monthlyDataResponse || !monthlyDataResponse.daily_energies) {
            throw new Error('Không thể tải dữ liệu tháng');
        }
        monthlyData = monthlyDataResponse;
        
        // Generate calendar
        generateCalendar();
        
        // Load initial daily data
        console.log('Loading daily data for:', currentYear, currentMonth, selectedDay);
        const dailyData = await loadDailyData(currentYear, currentMonth, selectedDay);
        
        if (dailyData && dailyData.hourly_wave_data) {
            console.log('Daily data loaded successfully');
            await updateCharts(dailyData);
            const dayData = monthlyData.daily_energies.find(d => d.day === selectedDay);
            if (dayData) {
                updateTradingAdvice(dayData);
            }
        } else {
            console.error('Daily data is invalid:', dailyData);
        }
        
        updateSelectedDate();
        updateCurrentMonthDisplay();
        hideLoading();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Không thể tải dữ liệu: ' + error.message);
        hideLoading();
    }
}

function setupEventListeners() {
    const monthSelect = document.getElementById('month-select');
    if (!monthSelect) {
        console.error('Month select element not found');
        return;
    }

    monthSelect.addEventListener('change', async (e) => {
        try {
            showLoading('Đang cập nhật tháng...');
            currentMonth = parseInt(e.target.value);
            
            const newMonthlyData = await loadMonthlyData(currentYear, currentMonth);
            if (!newMonthlyData || !newMonthlyData.daily_energies) {
                throw new Error('Invalid monthly data received');
            }
            
            monthlyData = newMonthlyData;
            generateCalendar();
            
            // Reset to first day of month
            selectedDay = 1;
            const dailyData = await loadDailyData(currentYear, currentMonth, selectedDay);
            if (dailyData && dailyData.hourly_wave_data) {
                await updateCharts(dailyData);
                const dayData = monthlyData.daily_energies.find(d => d.day === selectedDay);
                if (dayData) {
                    updateTradingAdvice(dayData);
                }
            }
            
            updateSelectedDate();
            updateCurrentMonthDisplay();
            hideLoading();
        } catch (error) {
            console.error('Error changing month:', error);
            showError('Không thể cập nhật tháng: ' + error.message);
            hideLoading();
        }
    });
}

async function loadMonthlyData(year, month) {
    showLoading('Đang tải dữ liệu tháng...');
    try {
        const url = `${API_BASE_URL}/monthly/${year}/${month}`;
        console.log('Fetching monthly data from:', url);
        
        const response = await fetch(url);
        console.log('Monthly data response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received monthly data:', data);
        
        if (!data || !data.daily_energies) {
            throw new Error('Invalid data format received from server');
        }
        
        monthlyData = data;
        hideLoading();
        return data;
    } catch (error) {
        console.error('Error loading monthly data:', error);
        showError(error.message === 'Invalid data format received from server' 
            ? 'Định dạng dữ liệu không hợp lệ' 
            : 'Không thể tải dữ liệu tháng. Vui lòng thử lại.');
        hideLoading();
        throw error;
    }
}

async function loadDailyData(year, month, day) {
    showLoading('Đang tải dữ liệu ngày...');
    try {
        const url = `${API_BASE_URL}/daily/${year}/${month}/${day}`;
        console.log('Fetching daily data from:', url);
        
        const response = await fetch(url);
        console.log('Daily data response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received daily data:', data);
        
        if (!data || !data.hourly_wave_data || !Array.isArray(data.hourly_wave_data)) {
            throw new Error('Invalid daily data format');
        }
        
        if (!data.daily_trigram || !data.yin_yang_interpretation) {
            throw new Error('Missing required daily data properties');
        }
        
        displayDailyInfo(data);
        displayYinYangInfo(data);
        
        // Update trading advice with the current day's data
        const dayData = monthlyData.daily_energies.find(d => d.day === day);
        if (dayData) {
            updateTradingAdvice(dayData);
        } else {
            console.error('Could not find daily data for trading advice:', day);
        }
        
        hideLoading();
        return data;
    } catch (error) {
        console.error('Error loading daily data:', error);
        showError('Không thể tải dữ liệu ngày. Vui lòng thử lại.');
        hideLoading();
        throw error;
    }
}

function displayDailyInfo(dailyData) {
    if (!dailyData || !dailyData.daily_trigram) {
        console.error('Invalid data for daily info display');
        return;
    }

    const trigramInfo = document.getElementById('trigram-info');
    if (!trigramInfo) {
        console.error('Cannot find trigram-info element');
        return;
    }

    const trigram = dailyData.daily_trigram;
    
    trigramInfo.innerHTML = `
        <div class="trigram-header">
            <div class="trigram-symbol" style="color: ${trigram.color}">${trigram.symbol}</div>
            <div class="trigram-details">
                <h4>${trigram.name} - ${trigram.element}</h4>
                <p>${trigram.description}</p>
            </div>
        </div>
        <div class="trigram-characteristics">
            ${trigram.characteristics.map(char => 
                `<span class="characteristic-tag">${char}</span>`
            ).join('')}
        </div>
        <div class="daily-energy-info">
            <p><strong>Năng lượng hôm nay:</strong> ${dailyData.daily_energy.toFixed(1)}</p>
            <p><strong>Điểm Âm/Dương:</strong> ${dailyData.yin_yang_score} (${dailyData.yin_yang_interpretation.type})</p>
            <p><strong>Quẻ I Ching:</strong> ${dailyData.hexagram.binary_representation} (${dailyData.hexagram.yang_lines} Dương, ${dailyData.hexagram.yin_lines} Âm)</p>
            <p><strong>Sóng thị trường:</strong> ${dailyData.wave_value > 0 ? 'Tăng mạnh' : dailyData.wave_value < 0 ? 'Giảm mạnh' : 'Cân bằng'} (${dailyData.wave_value})</p>
            <p class="interpretation">${dailyData.interpretation}</p>
        </div>
    `;
}

function displayYinYangInfo(dailyData) {
    if (!dailyData || !dailyData.yin_yang_interpretation) {
        console.error('Missing Yin/Yang data');
        return;
    }

    const yinYangInfo = dailyData.yin_yang_interpretation;
    
    let yinYangSection = document.getElementById('yin-yang-info');
    if (!yinYangSection) {
        yinYangSection = document.createElement('div');
        yinYangSection.id = 'yin-yang-info';
        yinYangSection.className = 'yin-yang-info';
        
        const trigramInfo = document.getElementById('trigram-info');
        if (trigramInfo) {
            trigramInfo.parentNode.insertBefore(yinYangSection, trigramInfo.nextSibling);
        }
    }
    
    yinYangSection.innerHTML = `
        <div class="yin-yang-header">
            <div class="yin-yang-symbol" style="color: ${yinYangInfo.color}">☯</div>
            <div class="yin-yang-details">
                <h4>Điểm Âm/Dương: ${dailyData.yin_yang_score}</h4>
                <p><strong>${yinYangInfo.type}</strong></p>
                <p>${yinYangInfo.description}</p>
            </div>
        </div>
    `;
}

function generateCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) {
        console.error('Calendar grid element not found');
        return;
    }
    
    calendarGrid.innerHTML = '';

    if (!monthlyData || !monthlyData.daily_energies) {
        console.error('No monthly data available');
        calendarGrid.innerHTML = '<p>Không có dữ liệu để hiển thị</p>';
        return;
    }

    monthlyData.daily_energies.forEach(dayData => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = dayData.day.toString().padStart(2, '0');
        
        const waveValue = dayData.wave_value;
        
        // Update wave-based styling
        if (waveValue >= 10) {
            dayElement.style.backgroundColor = '#2196F3';
            dayElement.style.color = '#ffffff';
        } else if (waveValue >= 5) {
            dayElement.style.backgroundColor = '#64B5F6';
            dayElement.style.color = '#000000';
        } else if (waveValue > 0) {
            dayElement.style.backgroundColor = '#4CAF50';
            dayElement.style.color = '#ffffff';
        } else if (waveValue === 0) {
            dayElement.style.backgroundColor = '#FFC107';
            dayElement.style.color = '#000000';
        } else if (waveValue > -5) {
            dayElement.style.backgroundColor = '#FF9800';
            dayElement.style.color = '#ffffff';
        } else if (waveValue > -10) {
            dayElement.style.backgroundColor = '#F44336';
            dayElement.style.color = '#ffffff';
        } else {
            dayElement.style.backgroundColor = '#B71C1C';
            dayElement.style.color = '#ffffff';
        }
        
        if (dayData.day === selectedDay) {
            dayElement.classList.add('selected');
            dayElement.style.border = '2px solid #fff';
            dayElement.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)';
        }
        
        dayElement.addEventListener('click', async () => {
            document.querySelectorAll('.calendar-day').forEach(el => {
                el.classList.remove('selected');
                el.style.border = 'none';
                el.style.boxShadow = 'none';
            });
            
            dayElement.classList.add('selected');
            dayElement.style.border = '2px solid #fff';
            dayElement.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)';
            
            selectedDay = dayData.day;
            
            try {
                const newDailyData = await loadDailyData(currentYear, currentMonth, selectedDay);
                if (newDailyData) {
                    updateCharts(newDailyData);
                    updateTradingAdvice(dayData);
                }
                updateSelectedDate();
            } catch (error) {
                console.error('Error updating day data:', error);
                showError('Không thể cập nhật dữ liệu ngày');
            }
        });
        
        calendarGrid.appendChild(dayElement);
    });
}

function updateSelectedDate() {
    const selectedDateElement = document.getElementById('selected-date');
    if (selectedDateElement) {
        selectedDateElement.textContent = `Ngày ${selectedDay}/${currentMonth}/${currentYear}`;
    }
}

function updateCurrentMonthDisplay() {
    const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    const currentMonthElement = document.getElementById('current-month');
    if (currentMonthElement) {
        currentMonthElement.textContent = monthNames[currentMonth - 1];
    }
}

function showLoading(message) {
    const loadingElement = document.getElementById('loading-message');
    if (loadingElement) {
        loadingElement.textContent = message || 'Đang tải...';
        loadingElement.style.display = 'block';
        
        // Disable interactive elements while loading
        document.querySelectorAll('button, select, .calendar-day').forEach(el => {
            el.style.pointerEvents = 'none';
            if (el.tagName.toLowerCase() === 'button' || el.tagName.toLowerCase() === 'select') {
                el.disabled = true;
            }
        });
    }
}

function hideLoading() {
    const loadingElement = document.getElementById('loading-message');
    if (loadingElement) {
        loadingElement.style.display = 'none';
        
        // Re-enable interactive elements
        document.querySelectorAll('button, select, .calendar-day').forEach(el => {
            el.style.pointerEvents = 'auto';
            if (el.tagName.toLowerCase() === 'button' || el.tagName.toLowerCase() === 'select') {
                el.disabled = false;
            }
        });
    }
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.classList.add('show');
        
        // Automatically hide after 5 seconds
        setTimeout(() => {
            errorElement.classList.remove('show');
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 300); // Match the CSS transition duration
        }, 5000);
    }
    
    // Log error for debugging
    console.warn('Error shown to user:', message);
}

function updateCharts(dailyData) {
    if (!dailyData) {
        console.error('No daily data provided for charts');
        return;
    }
    
    console.log('Updating charts with data:', dailyData); // Debug log
    
    try {
        updateEnergyChart(dailyData);
        updateMonthlyChart();
    } catch (error) {
        console.error('Error updating charts:', error);
        showError('Lỗi khi cập nhật biểu đồ');
    }
}

function updateEnergyChart(dailyData) {
    if (!dailyData || !dailyData.hourly_wave_data || !Array.isArray(dailyData.hourly_wave_data)) {
        console.error('Missing or invalid hourly wave data:', dailyData);
        return;
    }

    const ctx = document.getElementById('energy-chart');
    if (!ctx) {
        console.error('Cannot find energy-chart canvas');
        return;
    }

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    console.log('Creating energy chart with data:', dailyData.hourly_wave_data);

    // Destroy existing chart if it exists
    if (energyChart) {
        energyChart.destroy();
    }

    const hours = dailyData.hourly_wave_data.map(d => `${d.hour}h`);
    const waveValues = dailyData.hourly_wave_data.map(d => d.wave_value);

    try {
        energyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Sóng I Ching theo giờ',
                    data: waveValues,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#4CAF50'
                }]
            },
            options: chartConfig.options
        });
        console.log('Energy chart created successfully');
    } catch (error) {
        console.error('Error creating energy chart:', error);
    }
}

function updateMonthlyChart() {
    if (!monthlyData || !monthlyData.daily_energies) {
        console.error('Missing or invalid monthly data:', monthlyData);
        return;
    }

    const ctx = document.getElementById('monthly-chart');
    if (!ctx) {
        console.error('Cannot find monthly-chart canvas');
        return;
    }

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    console.log('Creating monthly chart with data:', monthlyData.daily_energies);

    // Destroy existing chart if it exists
    if (monthlyChart) {
        monthlyChart.destroy();
    }

    const days = monthlyData.daily_energies.map(d => d.day.toString().padStart(2, '0'));
    const waveData = monthlyData.daily_energies.map(d => d.wave_value);

    try {
        monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{
                    label: 'Sóng I Ching',
                    data: waveData,
                    backgroundColor: waveData.map(val => {
                        if (val > 3) return 'rgba(33, 150, 243, 0.8)';      // Strong Yang
                        else if (val > 0) return 'rgba(76, 175, 80, 0.8)';  // Moderate Yang
                        else if (val === 0) return 'rgba(255, 193, 7, 0.8)'; // Balanced
                        else if (val > -3) return 'rgba(255, 152, 0, 0.8)'; // Moderate Yin
                        else return 'rgba(244, 67, 54, 0.8)';               // Strong Yin
                    }),
                    borderColor: waveData.map(val => {
                        if (val > 3) return '#2196F3';
                        else if (val > 0) return '#4CAF50';
                        else if (val === 0) return '#FFC107';
                        else if (val > -3) return '#FF9800';
                        else return '#F44336';
                    }),
                    borderWidth: 2
                }]
            },
            options: chartConfig.options
        });
        console.log('Monthly chart created successfully');
    } catch (error) {
        console.error('Error creating monthly chart:', error);
    }
}

function updateTradingAdvice(dayData) {
    if (!dayData) {
        console.error('No day data provided for trading advice');
        return;
    }
    
    const adviceSection = document.getElementById('trading-advice-section');
    if (!adviceSection) {
        console.error('Trading advice section not found');
        return;
    }
    
    console.log('Updating trading advice with data:', dayData);
    
    const waveValue = dayData.wave_value;
    const hexagram = dayData.hexagram || { binary_representation: '000000' };
    
    // Get element from trigram
    const dayElement = dayData.trigram ? dayData.trigram.element : 'Unknown';
    
    // Calculate auspicious and inauspicious hours
    const auspiciousHours = getAuspiciousHours(dayData.trigram, dayElement);
    const inauspiciousHours = getInauspiciousHours(dayData.trigram, dayElement);
    
    // Generate trading advice based on wave value
    let tradingAdvice = '';
    let riskLevel = '';
    let additionalTips = '';
    let adviceClass = '';
    
    if (waveValue >= 10) {
        tradingAdvice = '🟢 MUA MẠNH';
        riskLevel = 'Rủi ro rất thấp';
        additionalTips = 'Ngày cực tốt để vào vị thế lớn.';
        adviceClass = 'strong-buy';
    } else if (waveValue >= 5) {
        tradingAdvice = '🔵 MUA VỪA PHẢI';
        riskLevel = 'Rủi ro thấp';
        additionalTips = 'Ngày tốt, có thể mua vừa phải.';
        adviceClass = 'moderate-buy';
    } else if (waveValue > 0) {
        tradingAdvice = '🟡 MUA NHẸ';
        riskLevel = 'Rủi ro trung bình-thấp';
        additionalTips = 'Chỉ nên mua nhẹ, theo dõi sát diễn biến.';
        adviceClass = 'light-buy';
    } else if (waveValue === 0) {
        tradingAdvice = '⚪ QUAN SÁT';
        riskLevel = 'Trung lập';
        additionalTips = 'Chờ tín hiệu rõ ràng hơn.';
        adviceClass = 'neutral';
    } else if (waveValue > -5) {
        tradingAdvice = '🟠 BÁN NHẸ';
        riskLevel = 'Rủi ro trung bình';
        additionalTips = 'Có thể cân nhắc giảm tỷ trọng đầu tư.';
        adviceClass = 'light-sell';
    } else if (waveValue > -10) {
        tradingAdvice = '🔴 BÁN MẠNH';
        riskLevel = 'Rủi ro cao';
        additionalTips = 'Nên bán mạnh để bảo toàn vốn.';
        adviceClass = 'strong-sell';
    } else {
        tradingAdvice = '🔴 BÁN GẤP';
        riskLevel = 'Rủi ro rất cao';
        additionalTips = 'Năng lượng cực Âm, cần thoát hàng khẩn cấp.';
        adviceClass = 'urgent-sell';
    }

    // Get current hour's can chi
    const currentHour = new Date().getHours();
    const currentCanChi = getCanChiForHour(currentHour);
    const currentHourElement = getElementForChi(currentCanChi.chi);
    
    // Determine current hour's compatibility
    const isGoodHour = auspiciousHours.includes(currentHour);
    const isBadHour = inauspiciousHours.includes(currentHour);
    
    // Generate hour analysis
    const hourAnalysis = `
        <div class="current-hour-analysis">
            <h4>Phân Tích Giờ Hiện Tại (${currentHour}h)</h4>
            <div class="hour-info">
                <div class="can-chi-info">
                    <span class="label">Can Chi:</span> ${currentCanChi.can} ${currentCanChi.chi}
                </div>
                <div class="element-info">
                    <span class="label">Ngũ Hành:</span> ${currentHourElement}
                    ${isGoodHour ? '<span class="good-hour">✨ Giờ Tốt</span>' :
                      isBadHour ? '<span class="bad-hour">⚠️ Giờ Xấu</span>' :
                      '<span class="neutral-hour">🔄 Giờ Trung Tính</span>'}
                </div>
                <div class="compatibility">
                    ${isGoodHour ? `<div class="compatibility-good">
                        ✅ ${currentHourElement} tương sinh với ${dayElement}
                        <div class="note">Thời điểm thuận lợi cho giao dịch</div>
                    </div>` : 
                    isBadHour ? `<div class="compatibility-bad">
                        ⛔ ${currentHourElement} xung khắc với ${dayElement}
                        <div class="note">Không nên giao dịch vào lúc này</div>
                    </div>` :
                    `<div class="compatibility-neutral">
                        ⚖️ ${currentHourElement} và ${dayElement} không tương tác mạnh
                        <div class="note">Có thể giao dịch nhưng cần thận trọng</div>
                    </div>`}
                </div>
            </div>
        </div>
    `;
    
    // Add time advice based on five elements
    const timeAdvice = `
        <div class="time-advice">
            <div class="auspicious-hours">
                <span class="label">⭐ Giờ Tốt:</span> ${formatHourRange(auspiciousHours)}
                <div class="time-details">
                    ${auspiciousHours.map(hour => {
                        const hourCanChi = getCanChiForHour(hour);
                        const hourElement = getElementForChi(hourCanChi.chi);
                        
                        // Convert hour to time range
                        const startHour = hour;
                        const endHour = (hour + 2) % 24;
                        const timeRange = `${startHour.toString().padStart(2, '0')}:00–${endHour.toString().padStart(2, '0')}:00`;
                        
                        return `<div class="hour-detail">
                            ${timeRange}: ${hourCanChi.can} ${hourCanChi.chi} (${hourElement})
                        </div>`;
                    }).join('')}
                    <div class="time-note">
                        <p>Các giờ có ngũ hành tương sinh với ${dayElement} (${getTrigramSymbol(dayElement)})</p>
                        <p class="detailed-note">
                            Theo quy luật sinh khắc ngũ hành:
                            ${generateFiveElementsNote(dayElement)}
                        </p>
                        <p class="time-ranges">
                            ${generateDetailedTimeRanges(dayElement)}
                        </p>
                    </div>
                </div>
            </div>
            <div class="inauspicious-hours">
                <span class="label">⛔ Giờ Xấu:</span> ${formatHourRange(inauspiciousHours)}
                <div class="time-details">
                    ${inauspiciousHours.map(hour => {
                        const hourCanChi = getCanChiForHour(hour);
                        const hourElement = getElementForChi(hourCanChi.chi);
                        
                        // Convert hour to time range
                        const startHour = hour;
                        const endHour = (hour + 2) % 24;
                        const timeRange = `${startHour.toString().padStart(2, '0')}:00–${endHour.toString().padStart(2, '0')}:00`;
                        
                        return `<div class="hour-detail">
                            ${timeRange}: ${hourCanChi.can} ${hourCanChi.chi} (${hourElement})
                        </div>`;
                    }).join('')}
                    <div class="time-note">
                        <p>Các giờ có ngũ hành xung khắc với ${dayElement}</p>
                        <p class="detailed-note">
                            Theo quy luật sinh khắc ngũ hành:
                            ${generateFiveElementsConflictNote(dayElement)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    adviceSection.innerHTML = `
        <div class="advice-content ${adviceClass}">
            <div class="advice-header">
                <strong>Ngày ${dayData.day}/${currentMonth}/${currentYear}</strong>
                <div class="element-info">Ngũ Hành: ${dayElement}</div>
            </div>
            <div class="trading-recommendation">
                <strong>${tradingAdvice}</strong>
            </div>
            <div class="advice-details">
                <div class="risk-info">
                    <span class="label">Mức độ rủi ro:</span> ${riskLevel}
                </div>
                <div class="wave-info">
                    <span class="label">Sóng I Ching:</span> ${waveValue} (${hexagram.binary_representation})
                </div>
                <div class="tips">
                    <span class="label">Lưu ý:</span> ${additionalTips}
                </div>
            </div>
            ${hourAnalysis}
            ${timeAdvice}
        </div>
    `;
}

function normalizeElement(element) {
    // Map English element names to Vietnamese
    const elementMap = {
        'Mountain': 'Thổ',
        'Metal': 'Kim',
        'Water': 'Thủy',
        'Wood': 'Mộc',
        'Fire': 'Hỏa',
        'Earth': 'Thổ'
    };
    return elementMap[element] || element;
}

function getTrigramSymbol(element) {
    element = normalizeElement(element);
    const trigramSymbols = {
        'Kim': '☰,☱', // Càn, Đoài
        'Hỏa': '☲',   // Ly
        'Mộc': '☴,☳', // Tốn, Chấn
        'Thủy': '☵',   // Khảm
        'Thổ': '☶,☷'  // Cấn, Khôn
    };
    return trigramSymbols[element] || '';
}

function generateFiveElementsNote(element) {
    element = normalizeElement(element);
    const relationships = {
        'Kim': 'Thổ sinh Kim',
        'Hỏa': 'Mộc sinh Hỏa',
        'Mộc': 'Thủy sinh Mộc',
        'Thủy': 'Kim sinh Thủy',
        'Thổ': 'Hỏa sinh Thổ'
    };
    return relationships[element] || '';
}

function generateDetailedTimeRanges(element) {
    element = normalizeElement(element);
    const timeRanges = {
        'Kim': 'Giờ tương sinh: Sửu (01:00–03:00), Thìn (07:00–09:00), Mùi (13:00–15:00), Tuất (19:00–21:00) - thuộc hành Thổ sinh Kim',
        'Hỏa': 'Giờ tương sinh: Dần (03:00–05:00), Mão (05:00–07:00) - thuộc hành Mộc sinh Hỏa',
        'Mộc': 'Giờ tương sinh: Tý (23:00–01:00), Hợi (21:00–23:00) - thuộc hành Thủy sinh Mộc',
        'Thủy': 'Giờ tương sinh: Thân (15:00–17:00), Dậu (17:00–19:00) - thuộc hành Kim sinh Thủy',
        'Thổ': 'Giờ tương sinh: Tỵ (09:00–11:00), Ngọ (11:00–13:00) - thuộc hành Hỏa sinh Thổ'
    };
    return timeRanges[element] || '';
}

function generateFiveElementsConflictNote(element) {
    element = normalizeElement(element);
    const conflicts = {
        'Kim': 'Dần, Mão (Mộc khắc Kim)',
        'Hỏa': 'Thân, Dậu (Kim khắc Hỏa)',
        'Mộc': 'Sửu, Thìn, Mùi, Tuất (Thổ khắc Mộc)',
        'Thủy': 'Tỵ, Ngọ (Hỏa khắc Thủy)',
        'Thổ': 'Tý, Hợi (Thủy khắc Thổ)'
    };
    return conflicts[element] || '';
}


