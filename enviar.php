<?php
/**
 * Recebe o formulário "Raio-X" do site e envia por e-mail usando a API do Brevo.
 * Não é preciso editar este arquivo — as credenciais ficam em config.php.
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

function limpar($v) {
    return trim(strip_tags((string) ($v ?? '')));
}

$nome         = limpar($_POST['nome']         ?? '');
$whatsapp     = limpar($_POST['whatsapp']     ?? '');
$empresa      = limpar($_POST['empresa']      ?? '');
$faturamento  = limpar($_POST['faturamento']  ?? '');
$investimento = limpar($_POST['investimento'] ?? '');

$faltando = [];
if ($nome === '')         $faltando[] = 'nome';
if ($whatsapp === '')     $faltando[] = 'whatsapp';
if ($empresa === '')      $faltando[] = 'empresa';
if ($faturamento === '')  $faltando[] = 'faturamento';
if ($investimento === '') $faltando[] = 'investimento';

if ($faltando) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Preencha todos os campos.', 'campos' => $faltando]);
    exit;
}

$faixas = [
    '1' => 'Até R$ 100 mil',
    '2' => 'R$ 100 mil a R$ 400 mil',
    '3' => 'R$ 400 mil a R$ 1 milhão',
    '4' => 'Acima de R$ 1 milhão',
];
$faturamentoLabel = $faixas[$faturamento] ?? $faturamento;

$dataHora = date('d/m/Y \à\s H:i');

$linhas = [
    ['Nome',               $nome],
    ['WhatsApp',           $whatsapp],
    ['Empresa',            $empresa],
    ['Faturamento',        $faturamentoLabel],
    ['Investimento atual', $investimento],
];

$rows = '';
foreach ($linhas as $par) {
    $rows .=
        '<tr>' .
        '<td style="padding:12px 16px;border-bottom:1px solid #ececec;color:#8a8a8a;font-size:12px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;vertical-align:top;">' . htmlspecialchars($par[0]) . '</td>' .
        '<td style="padding:12px 16px;border-bottom:1px solid #ececec;color:#111;font-size:15px;font-weight:600;">' . htmlspecialchars($par[1]) . '</td>' .
        '</tr>';
}

$html =
    '<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">' .
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;"><tr><td align="center">' .
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,.07);">' .
    '<tr><td style="background:#0A0A0A;padding:28px 24px;">' .
    '<div style="color:#FF5A00;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">Novo lead &middot; Raio-X</div>' .
    '<div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:6px;">Formulário do site</div>' .
    '</td></tr>' .
    '<tr><td style="padding:8px 8px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $rows . '</table></td></tr>' .
    '<tr><td style="padding:18px 24px 28px;color:#9a9a9a;font-size:12px;">Enviado em ' . htmlspecialchars($dataHora) . ' pelo site Lamparina Hub.</td></tr>' .
    '</table></td></tr></table></body></html>';

$texto =
    "Novo lead do site Lamparina Hub\n\n" .
    "Nome: {$nome}\n" .
    "WhatsApp: {$whatsapp}\n" .
    "Empresa: {$empresa}\n" .
    "Faturamento: {$faturamentoLabel}\n" .
    "Investimento atual: {$investimento}\n\n" .
    "Enviado em {$dataHora}";

$payload = [
    'sender'      => ['name' => SENDER_NAME, 'email' => SENDER_EMAIL],
    'to'          => [['email' => RECIPIENT_EMAIL, 'name' => RECIPIENT_NAME]],
    'subject'     => 'Novo lead do site — ' . $nome . ' (' . $empresa . ')',
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

echo json_encode(['ok' => true]);
