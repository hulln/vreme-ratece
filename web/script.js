// Load data from CSV
let data = { 
    years: [], 
    avgTemp: [], 
    avgMinTemp: [],
    minTemp: [], 
    maxSnow: [], 
    snowDays: [], 
    snowfallDays: [],
    iceDays: [],
    frostDays: [],
    coldDays: []
};
let projectionData = {};
let tempModel = 'linear';
let tempChartInstance = null;
const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
const chartAspectRatio = isMobileViewport ? 1.28 : 2.5;
const chartLegendFontSize = isMobileViewport ? 10 : 12;
const chartLegendPadding = isMobileViewport ? 9 : 15;
const chartLegendPosition = isMobileViewport ? 'bottom' : 'top';
const yearTickStep = isMobileViewport ? 20 : 10;
const slNumberFormatters = {
    0: new Intl.NumberFormat('sl-SI', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    1: new Intl.NumberFormat('sl-SI', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    2: new Intl.NumberFormat('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
};

function formatSl(value, decimals = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return (slNumberFormatters[decimals] || slNumberFormatters[0]).format(num);
}

async function loadCSV() {
    try {
        const response = await fetch('../data/clean_ratece.csv');
        const csvText = await response.text();
        const lines = csvText.split('\n');
        
        // Skip header and ignore placeholder/incomplete rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const cols = line.split(',');
            if (cols.length < 10) continue;
            const year = parseInt(cols[0]);
            if (isNaN(year)) continue;
            if (!cols[1] || isNaN(parseFloat(cols[1]))) continue;
            
            data.years.push(year);
            data.avgTemp.push(parseFloat(cols[1]) || 0);
            data.avgMinTemp.push(parseFloat(cols[2]) || 0);
            data.minTemp.push(parseFloat(cols[3]) || 0);
            data.maxSnow.push(parseFloat(cols[4]) || 0);
            data.frostDays.push(parseFloat(cols[5]) || 0);
            data.iceDays.push(parseFloat(cols[6]) || 0);
            data.coldDays.push(parseFloat(cols[7]) || 0);
            data.snowfallDays.push(parseFloat(cols[8]) || 0);
            data.snowDays.push(parseFloat(cols[9]) || 0);
        }
        
        // Calculate projection data
        calculateProjections();

        // Initialize first chart model selector
        initTempModelControl();
        
        // Initialize charts after data is loaded
        initCharts();

        // Mobile-only chart expansion controls
        initMobileChartExpandControls();
    } catch (error) {
        console.error('Error loading CSV:', error);
    }
}

// General linear regression function
function linearRegression(xValues, yValues) {
    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
}

// Calculate trend line values for given years
function calculateTrendLine(xValues, yValues) {
    const { slope, intercept } = linearRegression(xValues, yValues);
    return xValues.map(x => slope * x + intercept);
}

function holtBestFit(values) {
    if (values.length < 2) {
        return { fitted: values.slice(), level: values[values.length - 1] || 0, trend: 0 };
    }

    let best = null;
    for (let alpha = 0.1; alpha <= 0.9; alpha += 0.1) {
        for (let beta = 0.1; beta <= 0.9; beta += 0.1) {
            let level = values[0];
            let trend = values[1] - values[0];
            const fitted = [values[0]];
            let sse = 0;

            for (let t = 1; t < values.length; t++) {
                const pred = level + trend;
                fitted.push(pred);
                const err = values[t] - pred;
                sse += err * err;

                const newLevel = alpha * values[t] + (1 - alpha) * (level + trend);
                const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
                level = newLevel;
                trend = newTrend;
            }

            if (!best || sse < best.sse) {
                best = { sse, fitted, level, trend };
            }
        }
    }

    return best;
}

function initTempModelControl() {
    const select = document.getElementById('trendModelSelect');
    if (!select) return;
    const trigger = document.getElementById('trendModelTrigger');
    const labelEl = document.getElementById('trendModelLabel');
    const menu = document.getElementById('trendModelMenu');
    const options = menu ? Array.from(menu.querySelectorAll('.model-picker-option')) : [];
    const isCustomPicker = !!(trigger && labelEl && menu && options.length);
    const modelLabels = {
        linear: 'Linearni trend',
        holt: 'Holt'
    };
    let focusedOptionIndex = 0;

    function openMenu() {
        if (!isCustomPicker) return;
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
        if (!isCustomPicker) return;
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
    }

    function syncPickerUI(model) {
        if (!isCustomPicker) return;
        labelEl.textContent = modelLabels[model] || modelLabels.linear;
        options.forEach((opt, index) => {
            const isActive = opt.dataset.value === model;
            opt.classList.toggle('active', isActive);
            opt.setAttribute('aria-selected', isActive ? 'true' : 'false');
            if (isActive) focusedOptionIndex = index;
        });
    }

    function setModel(model, persist) {
        const nextModel = (model === 'holt' || model === 'linear') ? model : 'linear';
        if (persist) localStorage.setItem('tempTrendModel', nextModel);
        tempModel = nextModel;
        select.value = nextModel;
        syncPickerUI(nextModel);
    }

    const saved = localStorage.getItem('tempTrendModel');
    if (saved === 'linear' || saved === 'holt') {
        setModel(saved, false);
    } else {
        setModel(select.value || 'linear', false);
    }

    if (isCustomPicker) {
        syncPickerUI(tempModel);

        trigger.addEventListener('click', () => {
            if (menu.hidden) {
                openMenu();
            } else {
                closeMenu();
            }
        });

        options.forEach((opt) => {
            opt.addEventListener('click', () => {
                const chosen = opt.dataset.value || 'linear';
                setModel(chosen, true);
                closeMenu();
                updateTemperatureChartModel();
            });
        });

        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openMenu();
                const option = options[focusedOptionIndex] || options[0];
                if (option) option.focus();
            }
            if (event.key === 'Escape') {
                closeMenu();
            }
        });

        menu.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu();
                trigger.focus();
                return;
            }
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            focusedOptionIndex = (focusedOptionIndex + step + options.length) % options.length;
            options[focusedOptionIndex].focus();
        });

        document.addEventListener('click', (event) => {
            if (!menu.hidden && !event.target.closest('#trendModelPicker')) {
                closeMenu();
            }
        });
    } else {
        select.addEventListener('change', (event) => {
            setModel(event.target.value || 'linear', true);
            updateTemperatureChartModel();
        });
    }
}

function getTemperatureModelSeries() {
    const historyCount = data.years.length;
    const startYear = data.years[0];
    const endYear = data.years[historyCount - 1];

    if (tempModel === 'holt') {
        const holt = holtBestFit(data.avgTemp);
        const trendData = holt.fitted;
        const yearsAhead = projectionData.trend_years.length - historyCount;
        const future = Array.from({ length: yearsAhead }, (_, i) => holt.level + (i + 1) * holt.trend);
        const projectionLine = Array(historyCount - 1).fill(null).concat([holt.fitted[holt.fitted.length - 1], ...future]);
        return {
            trendLabel: 'Holt trend (' + startYear + '–' + endYear + ')',
            trendData,
            projectionLine
        };
    }

    return {
        trendLabel: 'Linearni trend (' + startYear + '–' + endYear + ')',
        trendData: projectionData.trend_temps.slice(0, historyCount),
        projectionLine: Array(historyCount).fill(null).concat(projectionData.trend_temps.slice(historyCount - 1))
    };
}

function updateTemperatureChartModel() {
    if (!tempChartInstance) return;
    const modeled = getTemperatureModelSeries();
    tempChartInstance.data.datasets[1].label = modeled.trendLabel;
    tempChartInstance.data.datasets[1].data = modeled.trendData;
    tempChartInstance.data.datasets[2].data = modeled.projectionLine;
    tempChartInstance.update();
}

function calculateProjections() {
    const { slope, intercept } = linearRegression(data.years, data.avgTemp);
    const startYear = data.years[0];
    const endYear = data.years[data.years.length - 1];
    const projectionEndYear = endYear + 10;
    
    projectionData.trend_years = [];
    projectionData.trend_temps = [];
    projectionData.trend_snow = [];
    
    for (let year = startYear; year <= projectionEndYear; year++) {
        projectionData.trend_years.push(year);
        projectionData.trend_temps.push(slope * year + intercept);
    }
    
    projectionData.temp_per_decade = formatSl(slope * 10, 2);
    projectionData.future_years = [endYear + 5, projectionEndYear];
    projectionData.projected_temps = [slope * (endYear + 5) + intercept, slope * projectionEndYear + intercept];
}

// Chart.js default settings
Chart.defaults.font.family = "'Lexend', 'Segoe UI', system-ui, -apple-system, sans-serif";
Chart.defaults.color = '#5a6c7d';

function initCharts() {
    // Temperature Chart with Projection
    const tempCtx = document.getElementById('tempChart').getContext('2d');
    
    // Prepare data arrays aligned with projectionData.trend_years (1949-2035)
    const measuredData = projectionData.trend_years.map((year, i) => {
        if (year <= 2025) {
            const idx = data.years.indexOf(year);
            return idx >= 0 ? data.avgTemp[idx] : null;
        }
        return null;
    });
    
    const modeled = getTemperatureModelSeries();

    if (tempChartInstance) {
        tempChartInstance.destroy();
    }

    tempChartInstance = new Chart(tempCtx, {
    type: 'line',
    data: {
        labels: projectionData.trend_years,
        datasets: [{
            label: 'Izmerjene temperature',
            data: measuredData,
            borderColor: '#ff6b35',
            backgroundColor: 'rgba(255, 107, 53, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            order: 3
        }, {
            label: modeled.trendLabel,
            data: modeled.trendData,
            borderColor: 'rgba(26, 77, 109, 0.3)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            order: 1,
            spanGaps: true
        }, {
            label: 'Projekcija (2026–2035)',
            data: modeled.projectionLine,
            borderColor: '#5a6c7d',
            backgroundColor: 'rgba(90, 108, 125, 0.05)',
            borderWidth: 2,
            borderDash: [10, 5],
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            order: 2
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: chartAspectRatio,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: chartLegendPosition,
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: chartLegendPadding,
                    font: { size: chartLegendFontSize },
                    filter: function(item) {
                        return !item.text.toLowerCase().includes('trend');
                    }
                },
                onClick: function(e, legendItem, legend) {
                    return false;
                }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 77, 109, 0.95)',
                padding: 12,
                titleFont: { size: 14 },
                bodyFont: { size: 13 },
                callbacks: {
                    title: function(context) {
                        return context[0].label;
                    },
                    label: function(context) {
                        if (context.dataset.label.toLowerCase().includes('trend')) {
                            return null;
                        }
                        return context.dataset.label + ': ' + formatSl(context.parsed.y, 1) + ' °C';
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: 'rgba(26, 77, 109, 0.08)'
                },
                ticks: {
                    callback: function(value) {
                        return formatSl(value, 1) + ' °C';
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 0,
                    autoSkip: false,
                    callback: function(value, index, ticks) {
                        const year = parseInt(this.getLabelForValue(value));
                        if ((year % yearTickStep === 0 && year >= 1950 && year <= 2030) || year === 2035) {
                            return year;
                        }
                        return '';
                    }
                }
            }
        }
    }
});

// Snow Chart
const snowCtx = document.getElementById('snowChart').getContext('2d');
const snowDaysTrend = calculateTrendLine(data.years, data.snowDays);
new Chart(snowCtx, {
    type: 'bar',
    data: {
        labels: data.years,
        datasets: [{
            label: 'Maks. višina snega (cm)',
            data: data.maxSnow,
            backgroundColor: 'rgba(26, 77, 109, 0.6)',
            borderColor: 'rgba(26, 77, 109, 0.8)',
            borderWidth: 1,
            yAxisID: 'y',
            order: 3
        }, {
            label: 'Dnevi s snežno odejo',
            data: data.snowDays,
            type: 'line',
            borderColor: '#ff6b35',
            backgroundColor: 'rgba(255, 107, 53, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            yAxisID: 'y1',
            order: 2
        }, {
            label: 'Trend',
            data: snowDaysTrend,
            type: 'line',
            borderColor: 'rgba(139, 0, 0, 0.3)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            yAxisID: 'y1',
            order: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: chartAspectRatio,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: chartLegendPosition,
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: chartLegendPadding,
                    font: { size: chartLegendFontSize },
                    filter: function(item) {
                        return item.text !== 'Trend';
                    }
                },
                onClick: function(e, legendItem, legend) {
                    const index = legendItem.datasetIndex;
                    const chart = legend.chart;
                    const meta = chart.getDatasetMeta(index);
                    meta.hidden = !meta.hidden;
                    
                    // Also toggle the trend line for snow days
                    if (legendItem.text === 'Dnevi s snežno odejo') {
                        chart.data.datasets.forEach((dataset, i) => {
                            if (dataset.label === 'Trend') {
                                const trendMeta = chart.getDatasetMeta(i);
                                trendMeta.hidden = meta.hidden;
                            }
                        });
                    }
                    
                    chart.update();
                }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 77, 109, 0.95)',
                padding: 12,
                callbacks: {
                    title: function(context) {
                        return context[0].label;
                    },
                    label: function(context) {
                        const label = context.dataset.label || '';
                        if (label === 'Trend') {
                            return null;
                        }
                        const value = context.parsed.y;
                        if (label.includes('višina')) {
                            return label + ': ' + formatSl(value, 0) + ' cm';
                        } else {
                            return label + ': ' + formatSl(value, 0) + ' dni';
                        }
                    },
                    footer: function(context) {
                        const idx = context[0].dataIndex;
                        return 'Povp. temp: ' + formatSl(data.avgTemp[idx], 1) + ' °C';
                    }
                }
            }
        },
        scales: {
            y: {
                type: 'linear',
                position: 'left',
                grid: {
                    color: 'rgba(26, 77, 109, 0.08)'
                },
                ticks: {
                    callback: function(value) {
                        return formatSl(value, 0) + ' cm';
                    }
                }
            },
            y1: {
                type: 'linear',
                position: 'right',
                grid: {
                    drawOnChartArea: false
                },
                ticks: {
                    callback: function(value) {
                        return formatSl(value, 0) + ' dni';
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 0,
                    autoSkip: false,
                    callback: function(value, index, ticks) {
                        const year = parseInt(this.getLabelForValue(value));
                        if (year % yearTickStep === 0 && year >= 1950 && year <= 2020) {
                            return year;
                        }
                        return '';
                    }
                }
            }
        }
    }
});

// Extremes Chart
const extremesCtx = document.getElementById('extremesChart').getContext('2d');
const extremesTrend = calculateTrendLine(data.years, data.minTemp);
new Chart(extremesCtx, {
    type: 'line',
    data: {
        labels: data.years,
        datasets: [{
            label: 'Absolutni minimum',
            data: data.minTemp,
            borderColor: '#1a4d6d',
            backgroundColor: 'rgba(26, 77, 109, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 12,
            pointHoverRadius: 5,
            order: 2
        }, {
            label: 'Trend',
            data: extremesTrend,
            borderColor: 'rgba(255, 107, 53, 0.3)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            order: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: chartAspectRatio,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: chartLegendPosition,
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: chartLegendPadding,
                    font: { size: chartLegendFontSize },
                    filter: function(item) {
                        return item.text !== 'Trend';
                    }
                },
                onClick: function(e, legendItem, legend) {
                    return false;
                }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 77, 109, 0.95)',
                padding: 12,
                callbacks: {
                    title: function(context) {
                        return context[0].label;
                    },
                    label: function(context) {
                        if (context.dataset.label === 'Trend') {
                            return null;
                        }
                        return 'Absolutni minimum: ' + formatSl(context.parsed.y, 1) + ' °C';
                    },
                    afterLabel: function(context) {
                        if (context.dataset.label === 'Trend') {
                            return null;
                        }
                        const idx = context.dataIndex;
                        return [
                            'Povp. temp: ' + formatSl(data.avgTemp[idx], 1) + ' °C',
                            'Ledenih dni: ' + formatSl(data.iceDays[idx], 0)
                        ];
                    }
                }
            }
        },
        scales: {
            y: {
                grid: {
                    color: 'rgba(26, 77, 109, 0.08)'
                },
                ticks: {
                    callback: function(value) {
                        return formatSl(value, 1) + ' °C';
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 0,
                    autoSkip: false,
                    callback: function(value, index, ticks) {
                        const year = parseInt(this.getLabelForValue(value));
                        if (year % yearTickStep === 0 && year >= 1950 && year <= 2020) {
                            return year;
                        }
                        return '';
                    }
                }
            }
        }
    }
});

// Snow Comparison Chart (snowfall vs snow cover)
const snowComparisonCtx = document.getElementById('snowComparisonChart').getContext('2d');
const snowCoverTrend = calculateTrendLine(data.years, data.snowDays);
const snowfallTrend = calculateTrendLine(data.years, data.snowfallDays);
new Chart(snowComparisonCtx, {
    type: 'line',
    data: {
        labels: data.years,
        datasets: [{
            label: 'Dnevi s snežno odejo',
            data: data.snowDays,
            borderColor: '#1a4d6d',
            backgroundColor: 'rgba(26, 77, 109, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            order: 4
        }, {
            label: 'Trend snežne odeje',
            data: snowCoverTrend,
            borderColor: 'rgba(13, 38, 56, 0.3)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            order: 2
        }, {
            label: 'Dnevi s sneženjem (>0,1 mm)',
            data: data.snowfallDays,
            borderColor: '#ff6b35',
            backgroundColor: 'rgba(255, 107, 53, 0.05)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            order: 3
        }, {
            label: 'Trend sneženja',
            data: snowfallTrend,
            borderColor: 'rgba(184, 61, 26, 0.3)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            order: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: chartAspectRatio,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: chartLegendPosition,
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: chartLegendPadding,
                    font: { size: chartLegendFontSize },
                    filter: function(item) {
                        return !item.text.includes('Trend');
                    }
                },
                onClick: function(e, legendItem, legend) {
                    const index = legendItem.datasetIndex;
                    const chart = legend.chart;
                    const meta = chart.getDatasetMeta(index);
                    meta.hidden = !meta.hidden;
                    
                    // Map data series to their trends
                    const trendMap = {
                        'Dnevi s snežno odejo': 'Trend snežne odeje',
                        'Dnevi s sneženjem (>0,1 mm)': 'Trend sneženja'
                    };
                    
                    const trendLabel = trendMap[legendItem.text];
                    if (trendLabel) {
                        chart.data.datasets.forEach((dataset, i) => {
                            if (dataset.label === trendLabel) {
                                const trendMeta = chart.getDatasetMeta(i);
                                trendMeta.hidden = meta.hidden;
                            }
                        });
                    }
                    
                    chart.update();
                }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 77, 109, 0.95)',
                padding: 12,
                callbacks: {
                    title: function(context) {
                        return context[0].label;
                    },
                    label: function(context) {
                        if (context.dataset.label.includes('Trend')) {
                            return null;
                        }
                        const label = context.dataset.label.replace(' (>0,1 mm)', '');
                        return label + ': ' + formatSl(context.parsed.y, 0) + ' dni';
                    },
                    afterLabel: function(context) {
                        if (context.dataset.label.includes('Trend')) {
                            return null;
                        }
                        const idx = context.dataIndex;
                        const diff = data.snowDays[idx] - data.snowfallDays[idx];
                        return 'Razlika: ' + formatSl(diff, 0) + ' dni';
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(26, 77, 109, 0.08)'
                },
                ticks: {
                    callback: function(value) {
                        return formatSl(value, 0) + ' dni';
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 0,
                    autoSkip: false,
                    callback: function(value, index, ticks) {
                        const year = parseInt(this.getLabelForValue(value));
                        if (year % yearTickStep === 0 && year >= 1950 && year <= 2020) {
                            return year;
                        }
                        return '';
                    }
                }
            }
        }
    }
});

// Frost vs Ice Days Chart
const frostCtx = document.getElementById('frostChart').getContext('2d');
const frostTrend = calculateTrendLine(data.years, data.frostDays);
const iceTrend = calculateTrendLine(data.years, data.iceDays);
new Chart(frostCtx, {
    type: 'line',
    data: {
        labels: data.years,
        datasets: [{
            label: 'Mrzli dnevi (min < 0°C)',
            data: data.frostDays,
            borderColor: '#5a6c7d',
            backgroundColor: 'rgba(90, 108, 125, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            order: 4
        }, {
            label: 'Trend mrzlih dni',
            data: frostTrend,
            borderColor: 'rgba(58, 76, 93, 0.3)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            order: 2
        }, {
            label: 'Ledeni dnevi (max < 0°C)',
            data: data.iceDays,
            borderColor: '#1a4d6d',
            backgroundColor: 'rgba(26, 77, 109, 0.15)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            order: 3
        }, {
            label: 'Trend ledenih dni',
            data: iceTrend,
            borderColor: 'rgba(13, 38, 56, 0.3)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            order: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: chartAspectRatio,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: chartLegendPosition,
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: chartLegendPadding,
                    font: { size: chartLegendFontSize },
                    filter: function(item) {
                        return !item.text.includes('Trend');
                    }
                },
                onClick: function(e, legendItem, legend) {
                    const index = legendItem.datasetIndex;
                    const chart = legend.chart;
                    const meta = chart.getDatasetMeta(index);
                    meta.hidden = !meta.hidden;
                    
                    // Map data series to their trends
                    const trendMap = {
                        'Mrzli dnevi (min < 0°C)': 'Trend mrzlih dni',
                        'Ledeni dnevi (max < 0°C)': 'Trend ledenih dni'
                    };
                    
                    const trendLabel = trendMap[legendItem.text];
                    if (trendLabel) {
                        chart.data.datasets.forEach((dataset, i) => {
                            if (dataset.label === trendLabel) {
                                const trendMeta = chart.getDatasetMeta(i);
                                trendMeta.hidden = meta.hidden;
                            }
                        });
                    }
                    
                    chart.update();
                }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 77, 109, 0.95)',
                padding: 12,
                callbacks: {
                    title: function(context) {
                        return context[0].label;
                    },
                    label: function(context) {
                        if (context.dataset.label.includes('Trend')) {
                            return null;
                        }
                        const label = context.dataset.label.replace(' (min < 0°C)', '').replace(' (max < 0°C)', '');
                        return label + ': ' + formatSl(context.parsed.y, 0) + ' dni';
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(26, 77, 109, 0.08)'
                },
                ticks: {
                    callback: function(value) {
                        return formatSl(value, 0) + ' dni';
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 0,
                    autoSkip: false,
                    callback: function(value, index, ticks) {
                        const year = parseInt(this.getLabelForValue(value));
                        if (year % yearTickStep === 0 && year >= 1950 && year <= 2020) {
                            return year;
                        }
                        return '';
                    }
                }
            }
        }
    }
});

// Temperature Comparison Chart (avg vs avg min)
const tempComparisonEl = document.getElementById('tempComparisonChart');
if (tempComparisonEl) {
const tempComparisonCtx = tempComparisonEl.getContext('2d');
const avgTempTrend = calculateTrendLine(data.years, data.avgTemp);
const avgMinTempTrend = calculateTrendLine(data.years, data.avgMinTemp);
new Chart(tempComparisonCtx, {
    type: 'line',
    data: {
        labels: data.years,
        datasets: [{
            label: 'Povprečna temperatura',
            data: data.avgTemp,
            borderColor: '#ff6b35',
            backgroundColor: 'rgba(255, 107, 53, 0.05)',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            order: 4
        }, {
            label: 'Trend povprečne',
            data: avgTempTrend,
            borderColor: 'rgba(184, 61, 26, 0.3)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            order: 2
        }, {
            label: 'Povprečna minimalna temperatura',
            data: data.avgMinTemp,
            borderColor: '#1a4d6d',
            backgroundColor: 'rgba(26, 77, 109, 0.05)',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            order: 3
        }, {
            label: 'Trend minimalne',
            data: avgMinTempTrend,
            borderColor: 'rgba(13, 38, 56, 0.3)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            order: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: chartAspectRatio,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: chartLegendPosition,
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: chartLegendPadding,
                    font: { size: chartLegendFontSize },
                    filter: function(item) {
                        return !item.text.includes('Trend');
                    }
                },
                onClick: function(e, legendItem, legend) {
                    const index = legendItem.datasetIndex;
                    const chart = legend.chart;
                    const meta = chart.getDatasetMeta(index);
                    meta.hidden = !meta.hidden;
                    
                    // Map data series to their trends
                    const trendMap = {
                        'Povprečna temperatura': 'Trend povprečne',
                        'Povprečna minimalna temperatura': 'Trend minimalne'
                    };
                    
                    const trendLabel = trendMap[legendItem.text];
                    if (trendLabel) {
                        chart.data.datasets.forEach((dataset, i) => {
                            if (dataset.label === trendLabel) {
                                const trendMeta = chart.getDatasetMeta(i);
                                trendMeta.hidden = meta.hidden;
                            }
                        });
                    }
                    
                    chart.update();
                }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 77, 109, 0.95)',
                padding: 12,
                callbacks: {
                    title: function(context) {
                        return context[0].label;
                    },
                    label: function(context) {
                        if (context.dataset.label.includes('Trend')) {
                            return null;
                        }
                        return context.dataset.label + ': ' + formatSl(context.parsed.y, 1) + ' °C';
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: 'rgba(26, 77, 109, 0.08)'
                },
                ticks: {
                    callback: function(value) {
                        return formatSl(value, 1) + ' °C';
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 0,
                    autoSkip: false,
                    callback: function(value, index, ticks) {
                        const year = parseInt(this.getLabelForValue(value));
                        if (year % yearTickStep === 0 && year >= 1950 && year <= 2020) {
                            return year;
                        }
                        return '';
                    }
                }
            }
        }
    }
});
}
}

function updateLastUpdatedLabel() {
    const el = document.getElementById('lastUpdated');
    if (!el) return;

    const raw = document.lastModified;
    const dt = raw ? new Date(raw) : null;
    if (!dt || Number.isNaN(dt.getTime())) return;

    const formatted = new Intl.DateTimeFormat('sl-SI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(dt);

    el.textContent = formatted;
}

function resizeAllCharts() {
    if (!window.Chart || !Chart.instances) return;
    Object.values(Chart.instances).forEach((chart) => {
        if (chart && typeof chart.resize === 'function') chart.resize();
    });
}

function initMobileChartExpandControls() {
    const containers = Array.from(document.querySelectorAll('.chart-container')).filter((el) => el.querySelector('canvas'));

    containers.forEach((container) => {
        if (container.querySelector('.chart-expand-btn')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chart-expand-btn';
        button.textContent = 'Povecaj graf';
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Povecaj graf');

        button.addEventListener('click', () => {
            if (!window.matchMedia('(max-width: 768px)').matches) return;
            const expanding = !container.classList.contains('is-expanded');
            container.classList.toggle('is-expanded', expanding);
            document.body.classList.toggle('chart-overlay-open', expanding);
            button.textContent = expanding ? 'Zapri' : 'Povecaj graf';
            button.setAttribute('aria-expanded', expanding ? 'true' : 'false');
            setTimeout(resizeAllCharts, 20);
        });

        container.appendChild(button);
    });
}

// Load CSV data and initialize charts
updateLastUpdatedLabel();
loadCSV();
