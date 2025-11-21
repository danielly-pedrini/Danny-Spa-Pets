     const services = {
        pequeno: [
          { name: 'Banho', price: 50, duration: 40 },
          { name: 'Banho e Tosa Higiênica', price: 60, duration: 40 },
          { name: 'Tosa Máquina', price: 80, duration: 90 },
          { name: 'Tosa Tesoura', price: 150, duration: 180 },
        ],
        medio: [
          { name: 'Banho', price: 60, duration: 40 },
          { name: 'Banho e Tosa Higiênica', price: 70, duration: 40 },
          { name: 'Tosa Máquina', price: 90, duration: 90 },
          { name: 'Tosa Tesoura', price: 180, duration: 180 },
        ],
        grande: [
          { name: 'Banho', price: 150, duration: 90 },
          { name: 'Banho e Tosa Higiênica', price: 160, duration: 90 },
          { name: 'Tosa Máquina', price: 180, duration: 120 },
          { name: 'Tosa Tesoura', price: 250, duration: 180 },
        ],
      };

      const hidratacaoPrecos = { pequeno: 20, medio: 30, grande: 40 };
      const taxiDogPreco = 30;
      const phoneNumber = '5515991345227';

      // Feriados nacionais de 2025
      const feriados2025 = [
        '2025-01-01',
        '2025-02-17',
        '2025-02-18',
        '2025-04-18',
        '2025-04-21',
        '2025-05-01',
        '2025-06-19',
        '2025-09-07',
        '2025-10-12',
        '2025-11-02',
        '2025-11-15',
        '2025-11-20',
        '2025-12-25',
      ];

      const sizeSelect = document.getElementById('size');
      const serviceSelect = document.getElementById('service');
      const dateInput = document.getElementById('date');
      const timeSelect = document.getElementById('time');
      const taxiDog = document.getElementById('taxiDog');
      const taxiEndereco = document.getElementById('taxiEndereco');
      const form = document.getElementById('agendar-form');
      const mensagem = document.getElementById('mensagem');
      const resumoDiv = document.getElementById('resumo');
      const resumoConteudo = document.getElementById('resumo-conteudo');
      const hidratacaoCheckbox = document.getElementById('hidratacao');

      // Armazenar agendamentos
      let agendamentos = {};

      // Carregar agendamentos do storage
      async function carregarAgendamentos() {
        try {
          const result = await window.storage.list('agendamento:');
          if (result && result.keys) {
            for (const key of result.keys) {
              try {
                const data = await window.storage.get(key);
                if (data && data.value) {
                  const agendamento = JSON.parse(data.value);
                  const dataHora = `${agendamento.date}_${agendamento.time}`;
                  agendamentos[dataHora] = agendamento;
                }
              } catch (e) {
                console.log('Agendamento não encontrado:', key);
              }
            }
          }
        } catch (error) {
          console.log('Iniciando lista de agendamentos vazia');
          agendamentos = {};
        }
      }

      // Salvar agendamento
      async function salvarAgendamento(data) {
        const dataHora = `${data.date}_${data.time}`;
        const key = `agendamento:${Date.now()}`;

        // Adicionar duração ao agendamento
        const selected = services[data.size].find(s => s.name === data.service);
        data.duration = selected.duration;

        agendamentos[dataHora] = data;
        try {
          await window.storage.set(key, JSON.stringify(data));
        } catch (error) {
          console.error('Erro ao salvar agendamento:', error);
        }
      }

      // Verificar se é domingo ou feriado
      function isDomingoOuFeriado(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || feriados2025.includes(dateString);
      }

      // Configurar data mínima (hoje)
      const hoje = new Date();
      const dataMinima = hoje.toISOString().split('T')[0];
      dateInput.min = dataMinima;

      // Gerar horários disponíveis
      function gerarHorarios(date, servicoDuration) {
        const horarios = [];
        const agora = new Date();
        const dataSelecionada = new Date(date + 'T00:00:00');
        const isHoje = dataSelecionada.toDateString() === agora.toDateString();

        // Horário de funcionamento: 8h às 18h
        let hora = 8;
        let minuto = 0;

        while (hora < 18) {
          const horarioStr = `${String(hora).padStart(2, '0')}:${String(
            minuto
          ).padStart(2, '0')}`;

          // Criar objeto Date para o horário atual do loop
          const horarioAtual = new Date(dataSelecionada);
          horarioAtual.setHours(hora, minuto, 0);

          // Verificar se o horário já passou (se for hoje)
          if (isHoje && horarioAtual <= agora) {
            minuto += 10;
            if (minuto >= 60) {
              minuto = 0;
              hora++;
            }
            continue;
          }

          // Verificar se há conflito com agendamentos existentes
          let horarioDisponivel = true;

          // Calcular fim do serviço que seria agendado neste horário
          const fimServicoAtual = new Date(horarioAtual);
          fimServicoAtual.setMinutes(
            fimServicoAtual.getMinutes() + servicoDuration
          );

          // Verificar todos os agendamentos do dia
          for (const [dataHoraKey, agendamento] of Object.entries(
            agendamentos
          )) {
            const [dataAgend, horaAgend] = dataHoraKey.split('_');

            if (dataAgend !== date) continue;

            const [h, m] = horaAgend.split(':').map(Number);
            const inicioAgendado = new Date(dataSelecionada);
            inicioAgendado.setHours(h, m, 0);

            const fimAgendado = new Date(inicioAgendado);
            fimAgendado.setMinutes(
              fimAgendado.getMinutes() + agendamento.duration
            );

            // Permitir margem de 10 minutos antes/depois
            const margemMinutos = 10;
            const inicioComMargem = new Date(inicioAgendado);
            inicioComMargem.setMinutes(
              inicioComMargem.getMinutes() - margemMinutos
            );

            const fimComMargem = new Date(fimAgendado);
            fimComMargem.setMinutes(fimComMargem.getMinutes() + margemMinutos);

            // Verificar se há sobreposição (considerando a margem)
            const inicioConflita =
              horarioAtual > inicioComMargem && horarioAtual < fimComMargem;
            const fimConflita =
              fimServicoAtual > inicioComMargem &&
              fimServicoAtual < fimComMargem;
            const englobaAgendamento =
              horarioAtual <= inicioComMargem &&
              fimServicoAtual >= fimComMargem;

            if (inicioConflita || fimConflita || englobaAgendamento) {
              horarioDisponivel = false;
              break;
            }
          }

          // Verificar se o serviço terminaria após as 18h
          if (
            fimServicoAtual.getHours() >= 18 &&
            fimServicoAtual.getMinutes() > 0
          ) {
            horarioDisponivel = false;
          }

          if (horarioDisponivel) {
            horarios.push(horarioStr);
          }

          // Incrementar de 10 em 10 minutos
          minuto += 10;
          if (minuto >= 60) {
            minuto = 0;
            hora++;
          }
        }

        return horarios;
      }

      // Atualizar serviços quando o porte muda
      sizeSelect.addEventListener('change', () => {
        const size = sizeSelect.value;
        serviceSelect.innerHTML =
          '<option value="">Selecione o serviço</option>';
        timeSelect.innerHTML =
          '<option value="">Selecione a data primeiro</option>';

        if (services[size]) {
          services[size].forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.dataset.duration = s.duration;
            opt.textContent = `${s.name} - R$${s.price} (${s.duration}min)`;
            serviceSelect.appendChild(opt);
          });
        }
      });

      // Atualizar horários quando data ou serviço mudam
      function atualizarHorarios() {
        const date = dateInput.value;
        const serviceSelecionado = serviceSelect.value;

        if (!date || !serviceSelecionado) {
          timeSelect.innerHTML =
            '<option value="">Selecione a data e o serviço</option>';
          return;
        }

        // Verificar se é domingo ou feriado
        if (isDomingoOuFeriado(date)) {
          timeSelect.innerHTML =
            '<option value="">Fechado - Domingos e feriados não atendemos</option>';
          timeSelect.disabled = true;
          return;
        }

        timeSelect.disabled = false;

        const selectedOption =
          serviceSelect.options[serviceSelect.selectedIndex];
        const duration = parseInt(selectedOption.dataset.duration);

        const horarios = gerarHorarios(date, duration);

        timeSelect.innerHTML = '<option value="">Selecione o horário</option>';

        if (horarios.length === 0) {
          timeSelect.innerHTML =
            '<option value="">Sem horários disponíveis</option>';
        } else {
          horarios.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = h;
            timeSelect.appendChild(opt);
          });
        }
      }

      dateInput.addEventListener('change', atualizarHorarios);
      serviceSelect.addEventListener('change', atualizarHorarios);

      // Atualizar resumo quando qualquer campo relevante mudar
      function atualizarResumo() {
        const size = sizeSelect.value;
        const serviceName = serviceSelect.value;
        const hidratacao = hidratacaoCheckbox.checked;
        const taxi = taxiDog.checked;

        if (!size || !serviceName) {
          resumoDiv.classList.add('hidden');
          return;
        }

        const selected = services[size].find(s => s.name === serviceName);
        if (!selected) {
          resumoDiv.classList.add('hidden');
          return;
        }

        let html = '';
        let total = 0;

        // Serviço principal
        html += `<div class="resumo-item">
        <span>✂️ ${selected.name}</span>
        <span>R$ ${selected.price.toFixed(2)}</span>
      </div>`;
        total += selected.price;

        // Hidratação
        if (hidratacao) {
          const precoHidratacao = hidratacaoPrecos[size];
          html += `<div class="resumo-item">
          <span>💧 Hidratação</span>
          <span>R$ ${precoHidratacao.toFixed(2)}</span>
        </div>`;
          total += precoHidratacao;
        }

        // Táxi Dog
        if (taxi) {
          html += `<div class="resumo-item">
          <span>🚕 Táxi Dog</span>
          <span>R$ ${taxiDogPreco.toFixed(2)}</span>
        </div>`;
          total += taxiDogPreco;
        }

        // Total
        html += `<div class="resumo-item resumo-total">
        <span>TOTAL</span>
        <span>R$ ${total.toFixed(2)}</span>
      </div>`;

        resumoConteudo.innerHTML = html;
        resumoDiv.classList.remove('hidden');
      }

      // Adicionar listeners para atualizar resumo
      sizeSelect.addEventListener('change', atualizarResumo);
      serviceSelect.addEventListener('change', atualizarResumo);
      hidratacaoCheckbox.addEventListener('change', atualizarResumo);
      taxiDog.addEventListener('change', atualizarResumo);

      // Mostrar endereço do Táxi Dog
      taxiDog.addEventListener('change', () => {
        taxiEndereco.classList.toggle('hidden', !taxiDog.checked);

        // Tornar campos obrigatórios se checkbox marcado
        document.getElementById('rua').required = taxiDog.checked;
        document.getElementById('numero').required = taxiDog.checked;
        document.getElementById('bairro').required = taxiDog.checked;
      });

      // Submissão do formulário
      form.addEventListener('submit', async e => {
        e.preventDefault();

        const data = {
          petName: document.getElementById('petName').value,
          tutorName: document.getElementById('tutorName').value,
          phone: document.getElementById('phone').value,
          size: sizeSelect.value,
          service: serviceSelect.value,
          date: dateInput.value,
          time: timeSelect.value,
          hidratacao: document.getElementById('hidratacao').checked,
          taxiDog: taxiDog.checked,
          taxiEndereco: {
            rua: document.getElementById('rua').value,
            numero: document.getElementById('numero').value,
            bairro: document.getElementById('bairro').value,
          },
        };

        // Validação
        if (
          !data.petName ||
          !data.tutorName ||
          !data.phone ||
          !data.service ||
          !data.date ||
          !data.time
        ) {
          mensagem.textContent =
            '⚠️ Por favor, preencha todos os campos obrigatórios!';
          mensagem.style.color = 'red';
          mensagem.style.background = '#ffe6e6';
          return;
        }

        // Verificar se é domingo ou feriado
        if (isDomingoOuFeriado(data.date)) {
          mensagem.textContent = '⚠️ Não trabalhamos aos domingos e feriados!';
          mensagem.style.color = 'red';
          mensagem.style.background = '#ffe6e6';
          return;
        }

        // Verificar se o horário já está ocupado
        const dataHora = `${data.date}_${data.time}`;
        if (agendamentos[dataHora]) {
          mensagem.textContent =
            '⚠️ Este horário já está ocupado! Selecione outro horário.';
          mensagem.style.color = 'red';
          mensagem.style.background = '#ffe6e6';
          atualizarHorarios();
          return;
        }

        // Verificar conflitos com outros agendamentos
        const selected = services[data.size].find(s => s.name === data.service);
        const [h, m] = data.time.split(':').map(Number);
        const dataSelecionada = new Date(data.date + 'T00:00:00');
        const inicioNovo = new Date(dataSelecionada);
        inicioNovo.setHours(h, m, 0);

        const fimNovo = new Date(inicioNovo);
        fimNovo.setMinutes(fimNovo.getMinutes() + selected.duration);

        for (const [dataHoraKey, agendamento] of Object.entries(agendamentos)) {
          const [dataAgend, horaAgend] = dataHoraKey.split('_');
          if (dataAgend !== data.date) continue;

          const [hAgend, mAgend] = horaAgend.split(':').map(Number);
          const inicioAgendado = new Date(dataSelecionada);
          inicioAgendado.setHours(hAgend, mAgend, 0);

          const fimAgendado = new Date(inicioAgendado);
          fimAgendado.setMinutes(
            fimAgendado.getMinutes() + agendamento.duration
          );

          const margemMinutos = 10;
          const inicioComMargem = new Date(inicioAgendado);
          inicioComMargem.setMinutes(
            inicioComMargem.getMinutes() - margemMinutos
          );

          const fimComMargem = new Date(fimAgendado);
          fimComMargem.setMinutes(fimComMargem.getMinutes() + margemMinutos);

          const inicioConflita =
            inicioNovo > inicioComMargem && inicioNovo < fimComMargem;
          const fimConflita =
            fimNovo > inicioComMargem && fimNovo < fimComMargem;
          const englobaAgendamento =
            inicioNovo <= inicioComMargem && fimNovo >= fimComMargem;

          if (inicioConflita || fimConflita || englobaAgendamento) {
            mensagem.textContent =
              '⚠️ Há conflito de horário com outro agendamento! Selecione outro horário.';
            mensagem.style.color = 'red';
            mensagem.style.background = '#ffe6e6';
            atualizarHorarios();
            return;
          }
        }

        const servicoSelecionado = services[data.size].find(
          s => s.name === data.service
        );
        let total = servicoSelecionado.price;
        if (data.hidratacao) total += hidratacaoPrecos[data.size];
        if (data.taxiDog) total += taxiDogPreco;

        // Formatar data para exibição
        const [ano, mes, dia] = data.date.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;

        let msg = `Olá! Gostaria de agendar um serviço no *Dany Spa Pet's*:\n\n`;
        msg += `🐶 *Pet:* ${data.petName}\n`;
        msg += `👤 *Tutor(a):* ${data.tutorName}\n`;
        msg += `📞 *Telefone:* ${data.phone}\n`;
        msg += `📏 *Porte:* ${data.size}\n`;
        msg += `✂️ *Serviço:* ${data.service}\n`;
        msg += `📅 *Data:* ${dataFormatada}\n`;
        msg += `🕐 *Horário:* ${data.time}\n\n`;

        if (data.hidratacao)
          msg += `💧 Hidratação: R$${hidratacaoPrecos[data.size]}\n`;
        if (data.taxiDog) {
          msg += `🚕 Táxi Dog: R$${taxiDogPreco}\n`;
          msg += `📍 Endereço: ${data.taxiEndereco.rua}, ${data.taxiEndereco.numero} - ${data.taxiEndereco.bairro}\n`;
        }

        msg += `\n💰 *Total:* R$${total.toFixed(2)}\n\nAguardo confirmação! 🐾`;

        // Salvar agendamento
        await salvarAgendamento(data);

        // Abrir WhatsApp
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
          msg
        )}`;
        window.open(url, '_blank');

        mensagem.textContent =
          '✅ Agendamento enviado via WhatsApp! O horário foi reservado.';
        mensagem.style.color = 'green';
        mensagem.style.background = '#e6ffe6';

        form.reset();
        resumoDiv.classList.add('hidden');
        serviceSelect.innerHTML =
          '<option value="">Primeiro selecione o porte</option>';
        timeSelect.innerHTML =
          '<option value="">Selecione a data primeiro</option>';
      });

      // Carregar agendamentos ao iniciar
      carregarAgendamentos();
   