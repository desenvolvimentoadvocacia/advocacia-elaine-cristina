(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Config — TODO: preencher com os IDs reais quando GA4/Google Ads forem criados
  // (contrato confirma que ainda não existem — ver 05_WORKSPACE/clientes/advocacia-elaine-cristina/CLAUDE.md)
  // ---------------------------------------------------------------------
  var CONFIG = {
    API_BASE: window.EC_API_BASE || '', // ex: 'https://api.advocaciaelainecristina.com.br' — setar via <script> antes deste arquivo
    WHATSAPP_NUMBER: '5511983134086', // Av. Nordestina — Elaine Cristina Advocacia (contrato)
    WHATSAPP_MESSAGE: 'Olá! Quero verificar se meu divórcio pode ser feito em cartório.',
  };

  // ---------------------------------------------------------------------
  // Atribuição: captura GCLID + UTMs da URL e persiste na sessão
  // ---------------------------------------------------------------------
  function getSessionId() {
    var key = 'ec_session_id';
    var id = sessionStorage.getItem(key);
    if (!id) {
      id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(key, id);
    }
    return id;
  }

  function captureAttribution() {
    var params = new URLSearchParams(window.location.search);
    var fields = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    var attribution = {};
    fields.forEach(function (f) {
      var fromUrl = params.get(f);
      if (fromUrl) {
        sessionStorage.setItem('ec_' + f, fromUrl);
      }
      attribution[f] = sessionStorage.getItem('ec_' + f) || null;
    });
    return attribution;
  }

  var attribution = captureAttribution();
  var sessionId = getSessionId();

  // ---------------------------------------------------------------------
  // Tracking — GA4 (gtag) + fallback para API própria (tabela eventos)
  // ---------------------------------------------------------------------
  function trackEvent(name, detail) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, detail || {});
    }
    if (CONFIG.API_BASE) {
      fetch(CONFIG.API_BASE + '/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evento: name,
          session_id: sessionId,
          gclid: attribution.gclid,
          detalhe: detail || null,
        }),
        keepalive: true,
      }).catch(function () {});
    }
  }

  trackEvent('page_view');

  // ---------------------------------------------------------------------
  // Scroll depth (50% / 90%) — dispara uma vez cada
  // ---------------------------------------------------------------------
  (function trackScrollDepth() {
    var fired50 = false, fired90 = false;
    window.addEventListener('scroll', function () {
      var scrolled = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      if (!fired50 && scrolled > 0.5) { fired50 = true; trackEvent('scroll_50'); }
      if (!fired90 && scrolled > 0.9) { fired90 = true; trackEvent('scroll_90'); }
    }, { passive: true });
  })();

  // ---------------------------------------------------------------------
  // Links de WhatsApp — monta o link com número + mensagem, dispara evento
  // ---------------------------------------------------------------------
  function buildWaLink(message) {
    var text = encodeURIComponent(message || CONFIG.WHATSAPP_MESSAGE);
    return 'https://wa.me/' + CONFIG.WHATSAPP_NUMBER + '?text=' + text;
  }

  document.querySelectorAll('[data-wa-cta]').forEach(function (el) {
    var customMsg = el.getAttribute('data-wa-message');
    el.setAttribute('href', buildWaLink(customMsg));
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
    el.addEventListener('click', function () {
      trackEvent('click_whatsapp', { source: el.getAttribute('data-wa-source') || 'generic' });
    });
  });

  document.querySelectorAll('[data-phone-cta]').forEach(function (el) {
    el.addEventListener('click', function () {
      trackEvent('click_phone');
    });
  });

  // ---------------------------------------------------------------------
  // Simulador — Analisador de Divórcio Extrajudicial
  // ---------------------------------------------------------------------
  var Simulator = (function () {
    var state = {
      situacao_casal: null,
      filhos: null,
      bens: null,
      acordo_bens: null,
      canal_preferido: null,
    };
    var currentStep = 1;
    var totalSteps = 3;
    var started = false;

    var root = document.getElementById('simulador');
    if (!root) return null;

    var steps = root.querySelectorAll('.sim-step');
    var progressDots = root.querySelectorAll('.simulator-progress span');
    var resultBox = document.getElementById('simulador-resultado');

    function updateProgress() {
      progressDots.forEach(function (dot, i) {
        dot.classList.toggle('active', i < currentStep);
      });
    }

    function showStep(n) {
      steps.forEach(function (s) {
        s.classList.toggle('active', parseInt(s.getAttribute('data-step'), 10) === n);
      });
      updateProgress();
    }

    function selectOption(groupEl, value, field) {
      groupEl.querySelectorAll('.sim-option').forEach(function (opt) {
        opt.classList.toggle('selected', opt.getAttribute('data-value') === value);
      });
      state[field] = value;
    }

    root.querySelectorAll('.sim-options').forEach(function (group) {
      var field = group.getAttribute('data-field');
      group.querySelectorAll('.sim-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          var value = opt.getAttribute('data-value');
          selectOption(group, value, field);

          // Pergunta condicional: só mostra "acordo sobre bens" se bens = sim
          if (field === 'bens') {
            var acordoBensBlock = root.querySelector('[data-conditional="acordo_bens"]');
            if (acordoBensBlock) {
              acordoBensBlock.style.display = value === 'sim' ? 'block' : 'none';
            }
          }
        });
      });
    });

    function goNext() {
      if (!started) {
        trackEvent('start_form');
        started = true;
      }
      if (currentStep === 1 && !state.situacao_casal) {
        alert('Selecione uma opção para continuar.');
        return;
      }
      if (currentStep === 2 && (!state.filhos || !state.bens)) {
        alert('Selecione as opções para continuar.');
        return;
      }
      trackEvent('form_step_' + currentStep);
      currentStep = Math.min(currentStep + 1, totalSteps);
      showStep(currentStep);
    }

    function goBack() {
      currentStep = Math.max(currentStep - 1, 1);
      showStep(currentStep);
    }

    root.querySelectorAll('[data-sim-next]').forEach(function (btn) {
      btn.addEventListener('click', goNext);
    });
    root.querySelectorAll('[data-sim-back]').forEach(function (btn) {
      btn.addEventListener('click', goBack);
    });

    var RESULTADOS = {
      A: {
        badge: 'badge-a',
        titulo: '🟢 Perfil identificado: Divórcio consensual',
        texto: 'Pelas respostas, seu caso apresenta características compatíveis com uma possível análise pela via extrajudicial. O que ainda precisa ser verificado: documentação pessoal, situação patrimonial (se houver) e os demais requisitos aplicáveis ao caso.',
      },
      B: {
        badge: 'badge-b',
        titulo: '🟢 Perfil identificado: Divórcio consensual com patrimônio',
        texto: 'Como existem bens envolvidos, será necessário analisar o regime de bens, a documentação patrimonial e os termos acordados pelo casal antes de seguir para o cartório.',
      },
      C: {
        badge: 'badge-c',
        titulo: '🟡 Análise necessária: Divórcio consensual com filhos menores',
        texto: 'Existem elementos que permitem avaliar a via extrajudicial, mas a situação dos filhos precisa ser verificada de acordo com o que já foi decidido sobre guarda, convivência e alimentos.',
      },
      D: {
        badge: 'badge-d',
        titulo: '🟠 Seu caso precisa de uma análise específica',
        texto: 'Como não há consenso entre os cônjuges ainda, a situação é diferente de um divórcio consensual típico — mas isso não significa que a via extrajudicial esteja descartada. Vale entender qual é o caminho mais adequado agora.',
      },
    };

    function renderResult(letra) {
      var r = RESULTADOS[letra] || RESULTADOS.A;
      resultBox.innerHTML =
        '<span class="result-badge ' + r.badge + '">Resultado da pré-análise</span>' +
        '<h3>' + r.titulo + '</h3>' +
        '<p>' + r.texto + '</p>' +
        '<p style="font-size:0.85rem;color:var(--ec-ink-soft)">Esta é uma orientação inicial e não substitui a análise jurídica individualizada.</p>' +
        '<a class="btn btn-primary btn-block" data-wa-cta data-wa-source="resultado_simulador" href="#">Falar com a Elaine Cristina Advocacia</a>';

      // re-liga o link de WhatsApp recém-criado
      var waBtn = resultBox.querySelector('[data-wa-cta]');
      if (waBtn) {
        waBtn.setAttribute('href', buildWaLink());
        waBtn.setAttribute('target', '_blank');
        waBtn.setAttribute('rel', 'noopener');
        waBtn.addEventListener('click', function () {
          trackEvent('click_whatsapp', { source: 'resultado_simulador' });
        });
      }
    }

    var form = root.querySelector('#sim-lead-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var nome = form.querySelector('[name="nome"]').value.trim();
        var whatsapp = form.querySelector('[name="whatsapp"]').value.trim();
        var email = form.querySelector('[name="email"]').value.trim();
        var cidade = form.querySelector('[name="cidade"]').value.trim();

        if (!nome || !whatsapp) {
          alert('Preencha nome e WhatsApp para ver o resultado.');
          return;
        }

        trackEvent('form_step_3');

        var payload = Object.assign({}, state, {
          nome: nome, whatsapp: whatsapp, email: email, cidade: cidade,
          landing_page: window.location.pathname,
        }, attribution);

        var submitBtn = form.querySelector('[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Analisando...'; }

        var finish = function (resultadoLetra) {
          currentStep = 4;
          showStep(4); // esconde todos os sim-step numerados
          resultBox.classList.add('active');
          renderResult(resultadoLetra);
          trackEvent('lead_form', { classificacao: resultadoLetra });
        };

        if (!CONFIG.API_BASE) {
          // API ainda não configurada (ver deploy) — mostra resultado com classificação local básica
          console.warn('[simulador] EC_API_BASE não configurado — usando classificação local de fallback.');
          finish(localFallbackClassificacao(state));
          return;
        }

        fetch(CONFIG.API_BASE + '/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            finish(data.resultado_lp || localFallbackClassificacao(state));
          })
          .catch(function (err) {
            console.error('[simulador] falha ao enviar lead', err);
            finish(localFallbackClassificacao(state));
          })
          .finally(function () {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Ver meu resultado'; }
          });
      });
    }

    function localFallbackClassificacao(s) {
      if (s.situacao_casal === 'conjuge_nao_concorda' || s.situacao_casal === 'decidindo') return 'D';
      if (s.filhos === 'menores' || s.filhos === 'incapazes') return 'C';
      if (s.bens === 'sim') return 'B';
      return 'A';
    }

    showStep(1);

    return { state: state };
  })();

  // ---------------------------------------------------------------------
  // FAQ — nada de JS necessário (usa <details>/<summary> nativo), só tracking opcional
  // ---------------------------------------------------------------------
  document.querySelectorAll('.faq-item').forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) trackEvent('faq_open', { pergunta: item.querySelector('summary').textContent.trim() });
    });
  });
})();
