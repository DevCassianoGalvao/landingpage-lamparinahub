<?php
/**
 * ============================================================
 *  CONFIGURAÇÃO DO ENVIO DE E-MAIL (Brevo)
 *  Preencha os valores abaixo. É a ÚNICA coisa que você mexe.
 * ============================================================
 */

// 1) CHAVE DE API DO BREVO
//    Brevo -> canto superior direito (nome da conta) -> "SMTP & API"
//    -> aba "API Keys" -> "Generate a new API key".
//    Cole a chave inteira aqui (começa com "xkeysib-").
define('BREVO_API_KEY', 'xkeysib-COLE_SUA_CHAVE_AQUI');

// 2) REMETENTE
//    Precisa ser um e-mail de um domínio JÁ VERIFICADO/APROVADO no Brevo
//    (Brevo -> "Senders, Domains & Dedicated IPs").
//    Ex.: nao-responder@agencialamparina.com.br
define('SENDER_EMAIL', 'nao-responder@SEU-DOMINIO-APROVADO.com.br');
define('SENDER_NAME',  'Site Lamparina Hub');

// 3) DESTINATÁRIO (quem recebe os leads do formulário)
define('RECIPIENT_EMAIL', 'contatoagencialamparina@gmail.com');
define('RECIPIENT_NAME',  'Lamparina Hub');

// 4) ORIGENS PERMITIDAS (CORS)
//    Deixe '*' para aceitar de qualquer lugar, ou troque pelo domínio final
//    do site, ex.: 'https://www.agencialamparina.com.br'
define('ALLOWED_ORIGIN', '*');
