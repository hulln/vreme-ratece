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

async function loadCSV() {
    try {
        const response = await fetch('output/clean_ratece.csv');
        const csvText = await response.text();
        const lines = csvText.split('\n');
        
        // Skip header and empty first row
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const cols = line.split(',');
            const year = parseInt(cols[0]);
            if (isNaN(year)) continue;
            
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
        
        // Initialize charts after data is loaded
        initCharts();
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

function calculateProjections() {
    const { slope, intercept } = linearRegression(data.years, data.avgTemp);
    
    projectionData.trend_years = [];
    projectionData.trend_temps = [];
    projectionData.trend_snow = [];
    
    for (let year = 1949; year <= 2040; year++) {
        projectionData.trend_years.push(year);
        projectionData.trend_temps.push(slope * year + intercept);
    }
    
    projectionData.temp_per_decade = (slope * 10).toFixed(2);
    projectionData.future_years = [2030, 2040];
    projectionData.projected_temps = [slope * 2030 + intercept, slope * 2040 + intercept];
}

// Chart.js default settings
Chart.defaults.font.family = "'Segoe UI', system-ui, -apple-system, sans-serif";
Chart.defaults.color = '#5a6c7d';

function initCharts() {
    // Temperature Chart with Projection
    const tempCtx = document.getElementById('tempChart').getContext('2d');
    
    // Prepare data arrays aligned with projectionData.trend_years (1949-2040)
    const measuredData = projectionData.trend_years.map((year, i) => {
        if (year <= 2025) {
            const idx = data.years.indexOf(year);
            return idx >= 0 ? data.avgTemp[idx] : null;
        }
        return null;
    });
    
    const trendData = projectionData.trend_years.slice(0, 77).map((year, i) => projectionData.trend_temps[i]);
    const projectionLine = Array(77).fill(null).concat(projectionData.trend_temps.slice(76));
    
    new Chart(tempCtx, {
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
            label: 'Linearni trend (1949-2025)',
            data: trendData,
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
            label: 'Projekcija (2026-2040)',
            data: projectionLine,
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
        aspectRatio: 2.5,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: { size: 12 },
                    filter: function(item) {
                        return item.text !== 'Linearni trend (1949-2025)';
                    }
                },
                onClick: function(e, legendItem, legend) {
                    const index = legendItem.datasetIndex;
                    const chart = legend.chart;
                    const meta = chart.getDatasetMeta(index);
                    meta.hidden = !meta.hidden;
                    
                    // Also toggle the trend line for measured temps
                    if (legendItem.text === 'Izmerjene temperature') {
                        chart.data.datasets.forEach((dataset, i) => {
                            if (dataset.label === 'Linearni trend (1949-2025)') {
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
                titleFont: { size: 14 },
                bodyFont: { size: 13 },
                callbacks: {
                    title: function(context) {
                        return context[0].label;
                    },
                    label: function(context) {
                        if (context.dataset.label === 'Linearni trend (1949-2025)') {
                            return null;
                        }
                        return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '°C';
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
                        return value.toFixed(1) + '°C';
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
                        if (year % 10 === 0 && year >= 1950 && year <= 2040) {
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
        aspectRatio: 2.5,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: { size: 12 },
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
                            return label + ': ' + value + ' cm';
                        } else {
                            return label + ': ' + value + ' dni';
                        }
                    },
                    footer: function(context) {
                        const idx = context[0].dataIndex;
                        return 'Povp. temp: ' + data.avgTemp[idx].toFixed(1) + '°C';
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
                        return value + ' cm';
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
                        return value + ' dni';
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
                        if (year % 10 === 0 && year >= 1950 && year <= 2020) {
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
        aspectRatio: 2.5,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: { size: 12 },
                    filter: function(item) {
                        return item.text !== 'Trend';
                    }
                },
                onClick: function(e, legendItem, legend) {
                    const index = legendItem.datasetIndex;
                    const chart = legend.chart;
                    const meta = chart.getDatasetMeta(index);
                    meta.hidden = !meta.hidden;
                    
                    // Also toggle the trend line
                    chart.data.datasets.forEach((dataset, i) => {
                        if (dataset.label === 'Trend') {
                            const trendMeta = chart.getDatasetMeta(i);
                            trendMeta.hidden = meta.hidden;
                        }
                    });
                    
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
                        if (context.dataset.label === 'Trend') {
                            return null;
                        }
                        return 'Absolutni minimum: ' + context.parsed.y.toFixed(1) + '°C';
                    },
                    afterLabel: function(context) {
                        if (context.dataset.label === 'Trend') {
                            return null;
                        }
                        const idx = context.dataIndex;
                        return [
                            'Povp. temp: ' + data.avgTemp[idx].toFixed(1) + '°C',
                            'Ledenih dni: ' + data.iceDays[idx]
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
                        return value + '°C';
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
                        if (year % 10 === 0 && year >= 1950 && year <= 2020) {
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
            label: 'Dnevi s sneženjem (>0.1mm)',
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
        aspectRatio: 2.5,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: { size: 12 },
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
                        'Dnevi s sneženjem (>0.1mm)': 'Trend sneženja'
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
                        const label = context.dataset.label.replace(' (>0.1mm)', '');
                        return label + ': ' + context.parsed.y + ' dni';
                    },
                    afterLabel: function(context) {
                        if (context.dataset.label.includes('Trend')) {
                            return null;
                        }
                        const idx = context.dataIndex;
                        const diff = data.snowDays[idx] - data.snowfallDays[idx];
                        return 'Razlika: ' + diff + ' dni';
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
                        return value + ' dni';
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
                        if (year % 10 === 0 && year >= 1950 && year <= 2020) {
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
        aspectRatio: 2.5,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: { size: 12 },
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
                        return label + ': ' + context.parsed.y + ' dni';
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
                        return value + ' dni';
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
                        if (year % 10 === 0 && year >= 1950 && year <= 2020) {
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
const tempComparisonCtx = document.getElementById('tempComparisonChart').getContext('2d');
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
        aspectRatio: 2.5,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: { size: 12 },
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
                        return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '°C';
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
                        return value.toFixed(1) + '°C';
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
                        if (year % 10 === 0 && year >= 1950 && year <= 2020) {
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

// Load CSV data and initialize charts
loadCSV();
