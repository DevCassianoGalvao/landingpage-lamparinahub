# Envio do formulário por e-mail (Brevo)

Fluxo: o formulário do site faz `POST` em **`enviar.php`**, que monta um e-mail
estilizado e envia pela **API do Brevo** para `contatoagencialamparina@gmail.com`.

---

## 1. O que você precisa preencher

Copie **`config.example.php`** para **`config.php`** e preencha só estes campos
(o `config.php` fica fora do Git de propósito, pra chave não vazar no repositório):

| Constante          | O que é / onde pegar |
|--------------------|----------------------|
| `BREVO_API_KEY`    | Brevo → (nome da conta, canto superior direito) → **SMTP & API** → aba **API Keys** → *Generate a new API key*. Cola a chave inteira (`xkeysib-...`). |
| `SENDER_EMAIL`     | Um e-mail de um **domínio já verificado** no Brevo (Brevo → *Senders, Domains & Dedicated IPs*). Ex.: `nao-responder@agencialamparina.com.br`. **Não pode ser um @gmail.com.** |
| `SENDER_NAME`      | Nome que aparece como remetente. Ex.: `Site Lamparina Hub`. |
| `RECIPIENT_EMAIL`  | Já vem preenchido: `contatoagencialamparina@gmail.com`. |
| `ALLOWED_ORIGIN`   | Deixe `*` ou troque pelo domínio final do site. |

Só isso. Não precisa mexer em `enviar.php`.

---

## 2. Onde hospedar o `enviar.php`

**A Vercel (onde o site está hoje) NÃO roda PHP.** Escolha uma opção:

### Opção A — hospedagem PHP comum (recomendado: mais simples)
Hostinger, Hostgator, cPanel, KingHost, etc.

1. Suba os arquivos `enviar.php` e `config.php` (com as credenciais preenchidas)
   para a mesma hospedagem/domínio, ex.: `https://agencialamparina.com.br/enviar.php`.
2. Em **`js/main.js`**, procure a linha:
   ```js
   const FORM_ENDPOINT = "enviar.php";
   ```
   e troque pela URL completa:
   ```js
   const FORM_ENDPOINT = "https://agencialamparina.com.br/enviar.php";
   ```
3. Se o PHP ficar num domínio diferente do site, mantenha `ALLOWED_ORIGIN` em `config.php`
   como `*` (ou coloque o domínio exato do site).

### Opção B — manter tudo na Vercel
É preciso ligar o runtime de PHP da Vercel (`vercel-php`), criar uma pasta `api/`
e um `vercel.json`. É mais chato e sensível a versão — me avise que eu configuro.

---

## 3. Testar

1. Preencha o formulário no site e envie.
2. Deve aparecer a mensagem verde *"Recebemos seus dados…"* e o e-mail cai em
   `contatoagencialamparina@gmail.com` (confira também o spam nas primeiras vezes).
3. Deu erro? O `enviar.php` responde um JSON com o motivo
   (`status` / `resposta` = resposta crua do Brevo). Causas comuns:
   - `SENDER_EMAIL` não é de um domínio aprovado no Brevo;
   - `BREVO_API_KEY` errada ou sem permissão de *Transactional emails*;
   - cota diária do plano do Brevo estourada.

---

## 4. Campos que chegam no e-mail

Nome · WhatsApp · Empresa · Faturamento (faixa por extenso) · Investimento atual · data/hora.

O campo escondido `website` é uma armadilha anti-robô (honeypot): se vier preenchido,
o `enviar.php` responde "ok" mas **não** envia nada.
