<?php
/**
 * Recebe o formulário de solicitação da Sessão Estratégica e envia por e-mail
 * usando a API do Brevo. Não é preciso editar este arquivo — as credenciais
 * ficam em config.php.
 */

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido.']);
    exit;
}

// Honeypot anti-spam: campo escondido "website". Se vier preenchido, é robô.
if (!empty($_POST['website'])) {
    echo json_encode(['ok' => true]); // finge sucesso, não envia nada
    exit;
}

function limpar($v, $max = 200) {
    $v = trim(strip_tags((string) ($v ?? '')));
    return function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : substr($v, 0, $max);
}

$nome         = limpar($_POST['nome']         ?? '');
$whatsapp     = limpar($_POST['whatsapp']     ?? '', 40);
$empresa      = limpar($_POST['empresa']      ?? '');
$email        = limpar($_POST['email']        ?? '', 150);
$papel        = limpar($_POST['papel']        ?? '', 30);
$faturamento  = limpar($_POST['faturamento']  ?? '', 10);
$equipe       = limpar($_POST['equipe']       ?? '', 10);
$prazo        = limpar($_POST['prazo']        ?? '', 30);
$eventId      = preg_replace('/[^a-zA-Z0-9_-]/', '', limpar($_POST['event_id'] ?? '', 64));

// Evita duplo envio do mesmo cadastro (mesmo event_id) — melhor esforço.
$marker = $eventId !== '' ? sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'lh_lead_' . $eventId : '';
if ($marker !== '' && file_exists($marker)) {
    $anterior = @file_get_contents($marker);
    echo json_encode(['ok' => true, 'qualificado' => $anterior !== '0']);
    exit;
}

// Telefone: só dígitos; aceita DDD + 8/9 dígitos (10 ou 11), com ou sem 55 na frente.
$digitos = preg_replace('/\D/', '', $whatsapp);
if (strlen($digitos) > 11 && substr($digitos, 0, 2) === '55') {
    $digitos = substr($digitos, 2);
}

$papeis = [
    'socio'         => 'Sou proprietário(a) ou sócio(a)',
    'gestor'        => 'Sou gestor(a) e participo das decisões',
    'responsavel'   => 'Sou responsável pela área, mas não decido',
    'nao_faz_parte' => 'Não faço parte da empresa',
];

$faixas = [
    '1' => 'Abaixo de R$ 50 mil',
    '2' => 'Entre R$ 50 mil e R$ 99 mil',
    '3' => 'Entre R$ 100 mil e R$ 300 mil',
    '4' => 'Entre R$ 300 mil e R$ 1 milhão',
    '5' => 'Acima de R$ 1 milhão',
];

$equipes = [
    '1' => 'Somente eu',
    '2' => 'De 2 a 5 pessoas',
    '3' => 'De 6 a 20 pessoas',
    '4' => 'Mais de 20 pessoas',
];

$prazos = [
    'prioridade'          => 'Sim, já é prioridade resolver isso',
    'se_fizer_sentido'    => 'Sim, se a proposta fizer sentido',
    'pesquisando'         => 'Ainda estamos apenas pesquisando',
    'sem_disponibilidade' => 'Não temos disponibilidade agora',
];

function tamanho($s) {
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
}

$invalidos = [];
if (!isset($papeis[$papel]))                     $invalidos[] = 'papel';
if (!isset($faixas[$faturamento]))               $invalidos[] = 'faturamento';
if (!isset($equipes[$equipe]))                   $invalidos[] = 'equipe';
if (!isset($prazos[$prazo]))                     $invalidos[] = 'prazo';
if (tamanho($nome) < 2)                          $invalidos[] = 'nome';
if (tamanho($empresa) < 2)                       $invalidos[] = 'empresa';
if (!in_array(strlen($digitos), [10, 11], true)) $invalidos[] = 'whatsapp';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))  $invalidos[] = 'email';

if ($invalidos) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Confira os campos destacados.', 'campos' => $invalidos]);
    exit;
}

// Lead desqualificado: qualquer uma destas respostas. Vai para recebido.html (sem Pixel).
$motivos = [];
if ($papel === 'nao_faz_parte')        $motivos[] = $papeis[$papel];
if ($faturamento === '1')              $motivos[] = $faixas[$faturamento];
if ($equipe === '1')                   $motivos[] = $equipes[$equipe];
if ($prazo === 'sem_disponibilidade')  $motivos[] = $prazos[$prazo];
$qualificado = !$motivos;

// (DD) NNNNN-NNNN
$ddd  = substr($digitos, 0, 2);
$resto = substr($digitos, 2);
$whatsappFmt = '(' . $ddd . ') ' . (strlen($resto) === 9
    ? substr($resto, 0, 5) . '-' . substr($resto, 5)
    : substr($resto, 0, 4) . '-' . substr($resto, 4));
$whatsappLink = 'https://wa.me/55' . $digitos;

// Origem da campanha (UTMs) — só o que veio preenchido.
$origemCampos = [
    'utm_source'   => 'Origem (utm_source)',
    'utm_medium'   => 'Mídia / conjunto (utm_medium)',
    'utm_campaign' => 'Campanha (utm_campaign)',
    'utm_content'  => 'Anúncio (utm_content)',
    'utm_term'     => 'Termo (utm_term)',
    'fbclid'       => 'fbclid',
    'referrer'     => 'Referência',
];
$origem = [];
foreach ($origemCampos as $chave => $rotulo) {
    $valor = limpar($_POST[$chave] ?? '', 300);
    if ($valor !== '') {
        $origem[] = [$rotulo, $valor];
    }
}

$dataHora = date('d/m/Y \à\s H:i');

function linhaHtml($rotulo, $valorHtml) {
    return
        '<tr>' .
        '<td style="padding:12px 16px;border-bottom:1px solid #ececec;color:#8a8a8a;font-size:12px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;vertical-align:top;">' . htmlspecialchars($rotulo) . '</td>' .
        '<td style="padding:12px 16px;border-bottom:1px solid #ececec;color:#111;font-size:15px;font-weight:600;word-break:break-word;">' . $valorHtml . '</td>' .
        '</tr>';
}

$rows  = linhaHtml('Nome', htmlspecialchars($nome));
$rows .= linhaHtml('Empresa', htmlspecialchars($empresa));
$rows .= linhaHtml('WhatsApp', '<a href="' . htmlspecialchars($whatsappLink) . '" style="color:#111;">' . htmlspecialchars($whatsappFmt) . '</a>');
$rows .= linhaHtml('E-mail', '<a href="mailto:' . htmlspecialchars($email) . '" style="color:#111;">' . htmlspecialchars($email) . '</a>');
$rows .= linhaHtml('Papel na empresa', htmlspecialchars($papeis[$papel]));
$rows .= linhaHtml('Faturamento mensal', htmlspecialchars($faixas[$faturamento]));
$rows .= linhaHtml('Pessoas na empresa', htmlspecialchars($equipes[$equipe]));
$rows .= linhaHtml('Implementar em 60 dias', htmlspecialchars($prazos[$prazo]));

$blocoQualificacao = $qualificado
    ? ''
    : '<tr><td style="padding:16px 24px 0;"><div style="background:#fdecea;border:1px solid #f5c2bd;border-radius:10px;padding:12px 14px;color:#a12a1e;font-size:14px;line-height:1.5;">' .
      '<strong>Lead desqualificado</strong> (não disparou o Pixel). Motivo: ' . htmlspecialchars(implode(' · ', $motivos)) . '</div></td></tr>';

$rowsOrigem = '';
foreach ($origem as $par) {
    $rowsOrigem .= linhaHtml($par[0], htmlspecialchars($par[1]));
}
$blocoOrigem = $rowsOrigem !== ''
    ? '<tr><td style="padding:20px 24px 4px;color:#FF5A00;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">Origem do cadastro</td></tr>' .
      '<tr><td style="padding:0 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $rowsOrigem . '</table></td></tr>'
    : '';

$html =
    '<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">' .
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;"><tr><td align="center">' .
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,.07);">' .
    '<tr><td style="background:#0A0A0A;padding:28px 24px;">' .
    '<div style="color:#FF5A00;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">Novo lead &middot; Sessão Estratégica</div>' .
    '<div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:6px;">Solicitação pelo site</div>' .
    '</td></tr>' .
    $blocoQualificacao .
    '<tr><td style="padding:8px 8px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $rows . '</table></td></tr>' .
    $blocoOrigem .
    '<tr><td style="padding:18px 24px 28px;color:#9a9a9a;font-size:12px;">Enviado em ' . htmlspecialchars($dataHora) . ' pelo site Lamparina Hub.</td></tr>' .
    '</table></td></tr></table></body></html>';

$texto =
    "Novo lead do site Lamparina Hub: Sessão Estratégica\n\n" .
    ($qualificado ? '' : "LEAD DESQUALIFICADO (não disparou o Pixel). Motivo: " . implode(' · ', $motivos) . "\n\n") .
    "Nome: {$nome}\n" .
    "Empresa: {$empresa}\n" .
    "WhatsApp: {$whatsappFmt} ({$whatsappLink})\n" .
    "E-mail: {$email}\n" .
    "Papel na empresa: {$papeis[$papel]}\n" .
    "Faturamento mensal: {$faixas[$faturamento]}\n" .
    "Pessoas na empresa: {$equipes[$equipe]}\n" .
    "Implementar em 60 dias: {$prazos[$prazo]}\n";
if ($origem) {
    $texto .= "\nOrigem do cadastro:\n";
    foreach ($origem as $par) {
        $texto .= "{$par[0]}: {$par[1]}\n";
    }
}
$texto .= "\nEnviado em {$dataHora}";

$payload = [
    'sender'      => ['name' => SENDER_NAME, 'email' => SENDER_EMAIL],
    'to'          => [['email' => RECIPIENT_EMAIL, 'name' => RECIPIENT_NAME]],
    'replyTo'     => ['email' => $email, 'name' => $nome],
    'subject'     => ($qualificado ? '' : '[DESQUALIFICADO] ') . 'Novo lead do site: ' . $nome . ' (' . $empresa . ')',
    'htmlContent' => $html,
    'textContent' => $texto,
];

$ch = curl_init('https://api.brevo.com/v3/smtp/email');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'accept: application/json',
        'content-type: application/json',
        'api-key: ' . BREVO_API_KEY,
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT    => 20,
]);

$resp   = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$erroC  = curl_error($ch);
curl_close($ch);

if ($erroC !== '') {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Falha de conexão com o Brevo.', 'detalhe' => $erroC]);
    exit;
}

if ($status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'O Brevo recusou o envio.', 'status' => $status, 'resposta' => $resp]);
    exit;
}

// Só confirma sucesso depois que o Brevo aceitou o envio.
if ($marker !== '') {
    @file_put_contents($marker, $qualificado ? '1' : '0');
}

echo json_encode(['ok' => true, 'qualificado' => $qualificado]);
