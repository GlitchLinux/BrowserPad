<?php
/**
 * BrowserPad File Save API
 * Handles secure file write operations for the web editor
 * Path: /var/www/glitchlinux.wtf/edit/api/save.php
 */

// Security headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://glitchlinux.wtf');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Configuration
$FILES_ROOT = '/var/www/glitchlinux.wtf/FILES';
$ALLOWED_EXTENSIONS = array(
    '.sh', '.py', '.js', '.html', '.css', '.txt', '.md',
    '.json', '.xml', '.conf', '.ini', '.log', '.bash',
    '.c', '.cpp', '.h', '.hpp', '.java', '.rb', '.go',
    '.yml', '.yaml', '.sql', '.php', '.env', '.dockerfile'
);

// Response handler
function json_response($success, $message = '', $data = array()) {
    $response = array(
        'success' => $success,
        'message' => $message
    );
    if (!empty($data)) {
        $response = array_merge($response, $data);
    }
    echo json_encode($response);
    exit;
}

// Validation: Check method
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    json_response(false, 'Method not allowed. Use POST.');
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (empty($input)) {
    http_response_code(400);
    json_response(false, 'Invalid JSON input');
}

$file_param = isset($input['file']) ? $input['file'] : '';
$content = isset($input['content']) ? $input['content'] : '';

// Validation: Required fields
if (empty($file_param) || $content === '') {
    http_response_code(400);
    json_response(false, 'Missing required fields: file and content');
}

// Parse file URL to get path
// Expected format: https://glitchlinux.wtf/FILES/path/to/file.sh
$parsed_url = parse_url($file_param);
if (!isset($parsed_url['path'])) {
    http_response_code(400);
    json_response(false, 'Invalid file URL');
}

// Extract path after /FILES/
$path_parts = explode('/FILES/', $parsed_url['path']);
if (count($path_parts) !== 2) {
    http_response_code(400);
    json_response(false, 'Invalid file path format');
}

$relative_path = $path_parts[1];
$full_path = $FILES_ROOT . '/' . $relative_path;

// Security: Normalize and validate path
$real_root = realpath($FILES_ROOT);
$real_path = realpath(dirname($full_path));

if (!$real_path || strpos($real_path, $real_root) !== 0) {
    http_response_code(403);
    json_response(false, 'Path traversal detected. Access denied.');
}

// Security: Check file extension
$file_ext = strtolower(pathinfo($full_path, PATHINFO_EXTENSION));
$file_ext_with_dot = '.' . $file_ext;

if (!in_array($file_ext_with_dot, $ALLOWED_EXTENSIONS)) {
    http_response_code(403);
    json_response(false, 'File extension not allowed. Allowed: ' . implode(', ', $ALLOWED_EXTENSIONS));
}

// Validation: File shouldn't be a directory
if (is_dir($full_path)) {
    http_response_code(400);
    json_response(false, 'Target is a directory, not a file');
}

// Security: Create backup if file exists
if (file_exists($full_path)) {
    $backup_path = $full_path . '.backup.' . time();
    if (!@copy($full_path, $backup_path)) {
        http_response_code(500);
        json_response(false, 'Could not create backup before writing');
    }
}

// Create directory if needed
$dir = dirname($full_path);
if (!file_exists($dir)) {
    if (!@mkdir($dir, 0755, true)) {
        http_response_code(500);
        json_response(false, 'Could not create directory: ' . $dir);
    }
}

// Write file
if (@file_put_contents($full_path, $content, LOCK_EX) === false) {
    http_response_code(500);
    json_response(false, 'Could not write to file. Check server permissions.');
}

// Success
http_response_code(200);
json_response(true, 'File saved successfully', array(
    'filename' => basename($full_path),
    'path' => $relative_path,
    'size' => strlen($content),
    'timestamp' => date('Y-m-d H:i:s')
));
?>

