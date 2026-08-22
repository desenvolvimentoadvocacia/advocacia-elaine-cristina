# Landing Page — Elaine Cristina Advocacia (Divórcio Extrajudicial)

Stack completa conforme decisão do operador em 2026-08-22: frontend estático (nginx) + API de leads em Node.js + PostgreSQL, tudo em Docker.

Copy, estrutura de campanha Google Ads e identidade visual vêm do Kit Piloto Automático V30:
`C:\Users\samso\Kit Piloto Automatico V30\06_OUTPUTS\2026-08-21_advocacia-elaine-cristina-lp-google-ads\` e
`C:\Users\samso\Kit Piloto Automatico V30\05_WORKSPACE\clientes\advocacia-elaine-cristina\`.

## Prazo

Contrato assinado 20/08/2026. Entrega em **5 dias úteis (~27/08/2026)**. Ver `CLAUDE.md` do cliente no Kit para todos os dados institucionais e pendências.

## Estrutura

```
elaine-cristina-advocacia-lp/
├── docker-compose.yml
├── .env.example
├── frontend/          # nginx + HTML/CSS/JS estático (LP + simulador)
│   ├── Dockerfile
│   ├── nginx.conf
│   └── public/
└── backend/           # API de leads (Node/Express) + PostgreSQL
    ├── Dockerfile
    ├── migrations/001_init.sql
    └── src/
```

## Rodando localmente

```bash
cp .env.example .env
# editar .env: POSTGRES_PASSWORD, SMTP_USER, SMTP_PASS (senha de app do Gmail)
docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:3001/health
- Antes de testar o formulário localmente, editar `frontend/public/index.html` e trocar
  `window.EC_API_BASE` para `http://localhost:3001`.

## Testado sem Docker (2026-08-22)

Sem Docker disponível na máquina de desenvolvimento nesta sessão. Verificado:
- Sintaxe de todos os arquivos JS do backend (`node --check`) ✅
- Frontend servido via `python -m http.server` e testado no navegador: copy renderiza
  corretamente, simulador completo (3 etapas + pergunta condicional de bens + resultado
  classificado A/B/C/D) funciona ponta a ponta, links de WhatsApp montam corretamente
  com o número da Elaine Cristina Advocacia e mensagem pré-preenchida ✅
- **Bug real encontrado e corrigido nesse teste:** `main.js` tinha uma variável `value`
  não declarada na lógica que revela a pergunta condicional "já existe acordo sobre os
  bens?" — sem o teste manual, o clique em "bens = Sim" quebrava silenciosamente (erro
  no console) e a pergunta condicional nunca aparecia. Corrigido.
- **Ainda não testado:** backend real contra Postgres (precisa Docker ou Postgres local),
  envio de e-mail via SMTP (precisa credencial real).

## Deploy (padrão já usado em outros projetos do operador — ver `agrigeo-lp`)

1. Criar repositório GitHub (`samsous/elaine-cristina-advocacia-lp` ou nome equivalente) — **pede confirmação antes de criar/pushar, é ação visível no GitHub do operador**
2. Publicar imagens via Easypanel (mesmo VPS/projeto usado para outras LPs, ou VPS Hostinger próprio da cliente conforme contrato — **confirmar qual VPS usar**)
3. Configurar variáveis de ambiente no Easypanel (mesmas do `.env`, gerando `POSTGRES_PASSWORD` forte)
4. Apontar DNS: `advocaciaelainecristina.com.br/landing-page` conforme contrato — domínio já registrado no Registro.br (credenciais em `05_WORKSPACE/clientes/advocacia-elaine-cristina/assets/acessos-dominio.txt` no Kit, **não usadas por mim para login automatizado**)
5. Criar GA4 + Google Ads (ainda não existem, conforme contrato) e substituir os placeholders `G-XXXXXXXXXX` / `AW-XXXXXXXXXX` em `frontend/public/index.html`
6. Configurar Senha de App do Gmail para `elainecristinnaadv@gmail.com` (ou conta de notificação escolhida) e preencher `SMTP_USER`/`SMTP_PASS` no ambiente de produção — **o operador precisa gerar essa senha, não é possível eu fazer login no Gmail**
7. Atualizar `window.EC_API_BASE` em `index.html` para a URL real da API em produção

## Pendências de conteúdo (não bloqueiam o deploy técnico)

- Foto profissional da Dra. Elaine (hoje: placeholder no bloco "Sobre")
- Formação/tempo de atuação detalhados (hoje: texto genérico OAB-compliant)
- Imagem do Hero (hoje: placeholder de texto)
