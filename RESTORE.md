# Como restaurar o site ao estado anterior à simplificação (2026-08-27)

O estado do site **antes** da remoção do simulador/formulário está preservado em:

1. **Git** — tag `snapshot-pre-simplificacao-2026-08-27` → commit `87b231f204851306d51c02f5aafec1c17de1af1b`
   (também permanente no histórico do `master`, é ancestral dele).
2. **Banco de dados** — o serviço `elaine-db` (Postgres) foi **desativado, não apagado**.
   O volume com os dados dos leads continua na VPS. Reativar traz os dados de volta.

Não depende de Claude nem de nenhuma sessão específica. Precisa de **2 acessos**:

- Repositório GitHub: `github.com/desenvolvimentoadvocacia/advocacia-elaine-cristina`
- Painel Easypanel da Elaine: `http://187.127.62.148:3000` (login `elainecristinnaadv@gmail.com`)

---

## Caminho mais simples (só pelo painel Easypanel, sem git)

1. Entrar no Easypanel → projeto `advocacia-elaine-cristina`.
2. Serviço **`elaine-lp`** → aba **Deployments** → localizar o deploy do commit
   `87b231f` (26/08/2026) → **Redeploy** nesse deployment antigo.
3. Serviço **`elaine-api`** → **Enable** + **Deploy**.
4. Serviço **`elaine-db`** → **Enable** (liga o Postgres com o volume/dados intactos).
5. Conferir: `https://advocaciaelainecristina.com.br` volta com o simulador e
   `https://api.advocaciaelainecristina.com.br/health` responde `{"ok":true,"db":"ok"}`.

## Caminho por git (se preferir reverter o código no repositório)

```bash
git clone https://github.com/desenvolvimentoadvocacia/advocacia-elaine-cristina.git
cd advocacia-elaine-cristina
git checkout 87b231f -- .
git commit -m "restore: volta ao estado pre-simplificacao (snapshot 2026-08-27)"
git push origin master
```
Depois, no Easypanel: **Deploy** do `elaine-lp` + **Enable/Deploy** do `elaine-api` e `elaine-db`.

---

## O que foi para produção em 2026-08-28 (a simplificação)

Commit `89599aa` no `master`. LP passou a ser: Google Ads → página informativa →
contato direto por WhatsApp/telefone. Sem formulário, sem simulador, sem coleta de
dados pessoais. Detalhes em `frontend/public/assets/photos/CREDITOS.md` e no
histórico de commits entre `87b231f` e `89599aa`.
