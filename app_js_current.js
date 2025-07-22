// app.js - Painel Cambial Impress (Corrigido)
(() => {
  const { DateTime } = luxon;

  // Elementos DOM
  const elStart = document.getElementById('start-date');
  const elEnd = document.getElementById('end-date');
  const elForm = document.getElementById('form-filtros');
  const elStatus = document.getElementById('status-area');
  const elChartCotacoes = document.getElementById('chart-cotacoes');
  const elChartParidadesEspecifico = document.getElementById('chart-paridades-especifico');
  const elExport = document.getElementById('btn-exportar');

  // Cores da Impress
  const IMPRESS_COLORS = {
    USD: '#2196F3',
    EUR: '#4CAF50', 
    CNY: '#FF9800',
    PRIMARY: '#F4B942',
    SECONDARY: '#8B5A2B'
  };

  // Estado da aplicaÃ§Ã£o
  const state = {
    start: DateTime.fromISO('2024-01-01'),
    end: DateTime.now().startOf('day'),
    freq: 'diaria',
    rawData: [],
    currentRates: {
      USDBRL: { value: 5.5570, variation: -0.66, date: '21/07/2025' },
      EURBRL: { value: 6.5010, variation: 2.40, date: '21/07/2025' },
      CNYBRL: { value: 0.7775, variation: 0.82, date: '21/07/2025' }
    }
  };

  // FunÃ§Ãµes utilitÃ¡rias
  function setStatus(msg, type = 'info') {
    elStatus.textContent = msg;
    elStatus.className = `status status--${type}`;
    elStatus.classList.remove('hidden');
  }

  function clearStatus() {
    elStatus.classList.add('hidden');
  }

  function updateCurrentRateBoxes() {
    // Atualizar box USD
    document.querySelector('.usd-box .rate-value').textContent = 
      state.currentRates.USDBRL.value.toFixed(4).replace('.', ',');
    document.querySelector('.usd-box .rate-variation').textContent = 
      `${state.currentRates.USDBRL.variation > 0 ? '+' : ''}${state.currentRates.USDBRL.variation.toFixed(2)}%`;
    document.querySelector('.usd-box .rate-variation').className = 
      `rate-variation ${state.currentRates.USDBRL.variation >= 0 ? 'positive' : 'negative'}`;

    // Atualizar box EUR
    document.querySelector('.eur-box .rate-value').textContent = 
      state.currentRates.EURBRL.value.toFixed(4).replace('.', ',');
    document.querySelector('.eur-box .rate-variation').textContent = 
      `${state.currentRates.EURBRL.variation > 0 ? '+' : ''}${state.currentRates.EURBRL.variation.toFixed(2)}%`;
    document.querySelector('.eur-box .rate-variation').className = 
      `rate-variation ${state.currentRates.EURBRL.variation >= 0 ? 'positive' : 'negative'}`;

    // Atualizar box CNY
    document.querySelector('.cny-box .rate-value').textContent = 
      state.currentRates.CNYBRL.value.toFixed(4).replace('.', ',');
    document.querySelector('.cny-box .rate-variation').textContent = 
      `${state.currentRates.CNYBRL.variation > 0 ? '+' : ''}${state.currentRates.CNYBRL.variation.toFixed(2)}%`;
    document.querySelector('.cny-box .rate-variation').className = 
      `rate-variation ${state.currentRates.CNYBRL.variation >= 0 ? 'positive' : 'negative'}`;
  }

  // Carregamento de dados
  async function loadHistoricalData() {
    try {
      setStatus('Carregando dados histÃ³ricos...');
      
      // Tentar carregar do CSV asset primeiro
      try {
        const csvUrl = 'https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/eac6b47b35960dd0ec743522bbde65f4/97da246a-91ef-4359-a6b9-cac58636ac1d/9d50c017.csv';
        const response = await fetch(csvUrl);
        if (response.ok) {
          const csvText = await response.text();
          const parsed = Papa.parse(csvText, { 
            header: true, 
            dynamicTyping: true, 
            skipEmptyLines: true 
          });
          
          if (parsed.data && parsed.data.length > 0) {
            state.rawData = parsed.data;
            console.log('Dados CSV carregados:', parsed.data.length, 'registros');
            setStatus('Dados carregados com sucesso!', 'success');
            setTimeout(clearStatus, 2000);
            return;
          }
        }
      } catch (csvError) {
        console.warn('Falha ao carregar CSV, usando dados mock:', csvError);
      }

      // Fallback para dados simulados
      state.rawData = generateMockData();
      console.log('Usando dados mock:', state.rawData.length, 'registros');
      setStatus('Dados simulados carregados', 'info');
      setTimeout(clearStatus, 2000);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setStatus('Erro ao carregar dados: ' + error.message, 'error');
      state.rawData = generateMockData();
    }
  }

  function generateMockData() {
    const data = [];
    const startDate = DateTime.fromISO('2023-01-01');
    const endDate = DateTime.now();
    
    let current = startDate;
    while (current <= endDate) {
      const dateStr = current.toISODate();
      
      // VariaÃ§Ãµes realÃ­sticas baseadas em tendÃªncias histÃ³ricas
      const days = current.diff(startDate, 'days').days;
      
      const usdBase = 5.2 + Math.sin(days / 365 * 2 * Math.PI) * 0.3 + (Math.random() - 0.5) * 0.1;
      const eurBase = 5.8 + Math.sin(days / 300 * 2 * Math.PI) * 0.4 + (Math.random() - 0.5) * 0.12;
      const cnyBase = 0.75 + Math.sin(days / 400 * 2 * Math.PI) * 0.05 + (Math.random() - 0.5) * 0.02;
      
      data.push({
        Date: dateStr,
        USDBRL: parseFloat(usdBase.toFixed(4)),
        EURBRL: parseFloat(eurBase.toFixed(4)),
        CNYBRL: parseFloat(cnyBase.toFixed(4))
      });
      
      current = current.plus({ days: 1 });
    }
    
    return data;
  }

  // PreparaÃ§Ã£o dos dados para grÃ¡ficos
  function prepareTimeSeriesData() {
    const startDate = state.start.toISODate();
    const endDate = state.end.toISODate();
    
    let filteredData = state.rawData.filter(row => {
      const date = row.Date || row.date || row.DATE;
      return date >= startDate && date <= endDate;
    });

    if (state.freq === 'mensal') {
      const monthlyData = new Map();
      filteredData.forEach(row => {
        const date = row.Date || row.date || row.DATE;
        const monthKey = date.substring(0, 7); // YYYY-MM
        if (!monthlyData.has(monthKey) || date > monthlyData.get(monthKey).Date) {
          monthlyData.set(monthKey, row);
        }
      });
      filteredData = Array.from(monthlyData.values()).sort((a, b) => 
        (a.Date || a.date || a.DATE).localeCompare(b.Date || b.date || b.DATE)
      );
    }

    console.log(`Dados preparados: ${filteredData.length} registros de ${startDate} a ${endDate}`);
    return filteredData;
  }

  // Plotar grÃ¡fico principal de cotaÃ§Ãµes
  function plotMainChart(data) {
    if (!data.length) {
      console.warn('Nenhum dado para plotar no grÃ¡fico principal');
      Plotly.purge(elChartCotacoes);
      return;
    }

    const dates = data.map(row => row.Date || row.date || row.DATE);
    const usdValues = data.map(row => row.USDBRL);
    const eurValues = data.map(row => row.EURBRL);
    const cnyValues = data.map(row => row.CNYBRL);

    const traces = [
      {
        x: dates,
        y: usdValues,
        name: 'USD/BRL',
        type: 'scatter',
        mode: 'lines',
        line: { color: IMPRESS_COLORS.USD, width: 2 },
        hovertemplate: '<b>USD/BRL</b><br>Data: %{x}<br>Valor: %{y:.4f}<extra></extra>'
      },
      {
        x: dates,
        y: eurValues,
        name: 'EUR/BRL',
        type: 'scatter',
        mode: 'lines',
        line: { color: IMPRESS_COLORS.EUR, width: 2 },
        hovertemplate: '<b>EUR/BRL</b><br>Data: %{x}<br>Valor: %{y:.4f}<extra></extra>'
      },
      {
        x: dates,
        y: cnyValues,
        name: 'CNY/BRL',
        type: 'scatter',
        mode: 'lines',
        line: { color: IMPRESS_COLORS.CNY, width: 2 },
        yaxis: 'y2',
        hovertemplate: '<b>CNY/BRL</b><br>Data: %{x}<br>Valor: %{y:.4f}<extra></extra>'
      }
    ];

    const layout = {
      title: false,
      margin: { t: 30, r: 80, l: 60, b: 60 },
      xaxis: {
        title: 'Data',
        type: 'date',
        gridcolor: '#f0f0f0'
      },
      yaxis: {
        title: 'USD/BRL e EUR/BRL',
        side: 'left',
        gridcolor: '#f0f0f0',
        tickformat: ',.4f'
      },
      yaxis2: {
        title: 'CNY/BRL',
        overlaying: 'y',
        side: 'right',
        tickformat: ',.4f',
        showgrid: false
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: 1.02
      },
      hovermode: 'x unified',
      plot_bgcolor: '#fafafa',
      paper_bgcolor: '#ffffff'
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d', 'autoScale2d']
    };

    Plotly.react(elChartCotacoes, traces, layout, config);
  }

  // Plotar grÃ¡fico especÃ­fico de paridades corretas: USDBRL x EURBRL e EURBRL x CNYBRL
  function plotParityChart(data) {
    if (!data.length) {
      console.warn('Nenhum dado para plotar no grÃ¡fico de paridades');
      Plotly.purge(elChartParidadesEspecifico);
      return;
    }

    const dates = data.map(row => row.Date || row.date || row.DATE);
    
    // Paridade USDBRL x EURBRL (primeiro eixo) - Mostra relaÃ§Ã£o entre USD e EUR em BRL
    const usdEurParity = data.map(row => {
      if (row.USDBRL && row.EURBRL && row.EURBRL !== 0) {
        return parseFloat((row.USDBRL / row.EURBRL).toFixed(4));
      }
      return null;
    });
    
    // Paridade EURBRL x CNYBRL (segundo eixo) - Mostra relaÃ§Ã£o entre EUR e CNY em BRL  
    const eurCnyParity = data.map(row => {
      if (row.EURBRL && row.CNYBRL && row.CNYBRL !== 0) {
        return parseFloat((row.EURBRL / row.CNYBRL).toFixed(4));
      }
      return null;
    });

    const traces = [
      {
        x: dates,
        y: usdEurParity,
        name: 'USD/BRL Ã· EUR/BRL',
        type: 'scatter',
        mode: 'lines',
        line: { color: IMPRESS_COLORS.PRIMARY, width: 2 },
        yaxis: 'y1',
        hovertemplate: '<b>Paridade USD vs EUR</b><br>Data: %{x}<br>RazÃ£o: %{y:.4f}<extra></extra>'
      },
      {
        x: dates,
        y: eurCnyParity,
        name: 'EUR/BRL Ã· CNY/BRL',
        type: 'scatter',
        mode: 'lines',
        line: { color: IMPRESS_COLORS.SECONDARY, width: 2 },
        yaxis: 'y2',
        hovertemplate: '<b>Paridade EUR vs CNY</b><br>Data: %{x}<br>RazÃ£o: %{y:.4f}<extra></extra>'
      }
    ];

    const layout = {
      title: false,
      margin: { t: 30, r: 80, l: 80, b: 60 },
      xaxis: {
        title: 'Data',
        type: 'date',
        gridcolor: '#f0f0f0'
      },
      yaxis: {
        title: 'USD/BRL Ã· EUR/BRL',
        side: 'left',
        gridcolor: '#f0f0f0',
        tickformat: ',.4f'
      },
      yaxis2: {
        title: 'EUR/BRL Ã· CNY/BRL',
        overlaying: 'y',
        side: 'right',
        tickformat: ',.2f',
        showgrid: false
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: 1.02
      },
      hovermode: 'x unified',
      plot_bgcolor: '#fafafa',
      paper_bgcolor: '#ffffff'
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d', 'autoScale2d']
    };

    Plotly.react(elChartParidadesEspecifico, traces, layout, config);
  }

  // Atualizar dados atuais com base nos dados histÃ³ricos
  function updateCurrentRatesFromData() {
    if (!state.rawData.length) return;
    
    const latestData = state.rawData[state.rawData.length - 1];
    const previousData = state.rawData.length > 1 ? state.rawData[state.rawData.length - 2] : latestData;
    
    if (latestData.USDBRL) {
      const variation = previousData.USDBRL ? 
        ((latestData.USDBRL - previousData.USDBRL) / previousData.USDBRL * 100) : 0;
      state.currentRates.USDBRL = {
        value: latestData.USDBRL,
        variation: variation,
        date: DateTime.fromISO(latestData.Date || latestData.date || latestData.DATE).toFormat('dd/MM/yyyy')
      };
    }
    
    if (latestData.EURBRL) {
      const variation = previousData.EURBRL ? 
        ((latestData.EURBRL - previousData.EURBRL) / previousData.EURBRL * 100) : 0;
      state.currentRates.EURBRL = {
        value: latestData.EURBRL,
        variation: variation,
        date: DateTime.fromISO(latestData.Date || latestData.date || latestData.DATE).toFormat('dd/MM/yyyy')
      };
    }
    
    if (latestData.CNYBRL) {
      const variation = previousData.CNYBRL ? 
        ((latestData.CNYBRL - previousData.CNYBRL) / previousData.CNYBRL * 100) : 0;
      state.currentRates.CNYBRL = {
        value: latestData.CNYBRL,
        variation: variation,
        date: DateTime.fromISO(latestData.Date || latestData.date || latestData.DATE).toFormat('dd/MM/yyyy')
      };
    }
  }

  // Exportar CSV
  function exportCSV() {
    const data = prepareTimeSeriesData();
    if (!data.length) {
      setStatus('NÃ£o hÃ¡ dados para exportar.', 'warning');
      setTimeout(clearStatus, 3000);
      return;
    }
    
    const header = ['Data', 'USD/BRL', 'EUR/BRL', 'CNY/BRL', 'USD_vs_EUR', 'EUR_vs_CNY'];
    const rows = [header.join(',')];
    
    data.forEach(row => {
      const date = row.Date || row.date || row.DATE;
      const usdVsEur = (row.USDBRL && row.EURBRL && row.EURBRL !== 0) ? 
        (row.USDBRL / row.EURBRL).toFixed(4) : '';
      const eurVsCny = (row.EURBRL && row.CNYBRL && row.CNYBRL !== 0) ? 
        (row.EURBRL / row.CNYBRL).toFixed(4) : '';
      
      const line = [
        date,
        row.USDBRL || '',
        row.EURBRL || '',
        row.CNYBRL || '',
        usdVsEur,
        eurVsCny
      ];
      rows.push(line.join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotacoes_impress_${DateTime.now().toFormat('yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    
    setStatus('CSV exportado com sucesso!', 'success');
    setTimeout(clearStatus, 3000);
  }

  // FunÃ§Ã£o principal para atualizar grÃ¡ficos
  async function updateCharts() {
    try {
      setStatus('Atualizando grÃ¡ficos...', 'info');
      
      // Ler dados do formulÃ¡rio
      state.start = DateTime.fromISO(elStart.value);
      state.end = DateTime.fromISO(elEnd.value);
      state.freq = elForm.querySelector('input[name="freq"]:checked').value;
      
      // Preparar dados
      const timeSeriesData = prepareTimeSeriesData();
      
      if (!timeSeriesData.length) {
        setStatus('Nenhum dado encontrado para o perÃ­odo selecionado.', 'warning');
        setTimeout(clearStatus, 3000);
        return;
      }
      
      // Plotar grÃ¡ficos
      plotMainChart(timeSeriesData);
      plotParityChart(timeSeriesData);
      
      setStatus(`GrÃ¡ficos atualizados com ${timeSeriesData.length} registros!`, 'success');
      setTimeout(clearStatus, 2000);
      
    } catch (error) {
      console.error('Erro ao atualizar grÃ¡ficos:', error);
      setStatus('Erro ao atualizar grÃ¡ficos: ' + error.message, 'error');
    }
  }

  // InicializaÃ§Ã£o
  function initializeForm() {
    elStart.value = state.start.toISODate();
    elEnd.value = state.end.toISODate();
  }

  // Event listeners
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando Painel Cambial Impress...');
    
    initializeForm();
    
    // Carregar dados histÃ³ricos
    await loadHistoricalData();
    
    // Atualizar cotaÃ§Ãµes atuais baseadas nos dados histÃ³ricos
    updateCurrentRatesFromData();
    updateCurrentRateBoxes();
    
    // Plotar grÃ¡ficos iniciais
    await updateCharts();
    
    // Event listeners
    elForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await updateCharts();
    });
    
    elExport.addEventListener('click', exportCSV);
    
    console.log('Painel Cambial Impress inicializado com sucesso!');
  });
})();