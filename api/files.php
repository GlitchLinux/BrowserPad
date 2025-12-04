<?php
/**
 * BrowserPad File Management API - Final Version
 * Allows any file extension (browserpad treats all as text)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://glitchlinux.wtf');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$FILES_ROOT = '/var/www/glitchlinux.wtf/browserpad/files';

function json_response($success, $message = '', $data = array()) {
    $response = array('success' => $success, 'message' => $message);
    if (!empty($data)) $response = array_merge($response, $data);
    echo json_encode($response);
    exit;
}

function validate_file_path($relative_path) {
    global $FILES_ROOT;
    
    if ($relative_path === '/' || $relative_path === '' || $relative_path === null) {
        return $FILES_ROOT;
    }
    
    if (preg_match('/\.\./', $relative_path)) {
        return false;
    }
    
    $full_path = $FILES_ROOT . '/' . ltrim($relative_path, '/');
    $real_root = realpath($FILES_ROOT);
    $real_path = realpath(dirname($full_path));
    
    if (!$real_path || strpos($real_path, $real_root) !== 0) {
        return false;
    }
    
    return $full_path;
}

function validate_filename($filename) {
    // Allow ANY filename - browserpad treats all files as text content
    // No extension validation needed
    if (empty($filename) || strlen($filename) > 255) return false;
    if (preg_match('/[\/\\\]/', $filename)) return false; // No path separators
    return true;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get action from GET or POST
$action = isset($_GET['action']) ? $_GET['action'] : '';

// For POST, also check JSON body
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!empty($input) && isset($input['action'])) {
        $action = $input['action'];
    }
}

switch ($action) {
    case 'list':
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            json_response(false, 'Use GET for list action');
        }
        
        $dir = isset($_GET['dir']) ? $_GET['dir'] : '';
        $full_dir = validate_file_path($dir);
        
        if (!$full_dir || !is_dir($full_dir)) {
            http_response_code(400);
            json_response(false, 'Invalid directory path');
        }
        
        $files = array();
        $items = @scandir($full_dir);
        
        if ($items === false) {
            http_response_code(500);
            json_response(false, 'Cannot read directory');
        }
        
        foreach ($items as $item) {
            if ($item === '.' || $item === '..' || $item[0] === '.') continue;
            
            $item_path = $full_dir . '/' . $item;
            $rel_path = str_replace($FILES_ROOT, '', $item_path);
            
            $files[] = array(
                'name' => $item,
                'path' => $rel_path,
                'type' => is_dir($item_path) ? 'dir' : 'file',
                'size' => is_file($item_path) ? filesize($item_path) : 0,
                'modified' => filemtime($item_path)
            );
        }
        
        usort($files, function($a, $b) {
            if ($a['type'] !== $b['type']) return $a['type'] === 'dir' ? -1 : 1;
            return strcmp($a['name'], $b['name']);
        });
        
        json_response(true, 'Files listed', array('files' => $files));
        break;
    
    case 'read':
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            json_response(false, 'Use GET for read action');
        }
        
        $file = isset($_GET['file']) ? $_GET['file'] : '';
        $full_path = validate_file_path($file);
        
        if (!$full_path || !is_file($full_path)) {
            http_response_code(404);
            json_response(false, 'File not found');
        }
        
        $content = @file_get_contents($full_path);
        if ($content === false) {
            http_response_code(500);
            json_response(false, 'Cannot read file');
        }
        
        json_response(true, 'File read', array(
            'content' => $content,
            'filename' => basename($full_path),
            'size' => filesize($full_path)
        ));
        break;
    
    case 'write':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            json_response(false, 'Use POST for write action');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input)) {
            http_response_code(400);
            json_response(false, 'Invalid JSON input');
        }
        
        $file = isset($input['file']) ? $input['file'] : '';
        $content = isset($input['content']) ? $input['content'] : '';
        
        if (empty($file)) {
            http_response_code(400);
            json_response(false, 'Missing file parameter');
        }
        
        $full_path = validate_file_path($file);
        if (!$full_path || !is_file($full_path)) {
            http_response_code(404);
            json_response(false, 'File not found');
        }
        
        if (@file_put_contents($full_path, $content) === false) {
            http_response_code(500);
            json_response(false, 'Cannot write file');
        }
        
        json_response(true, 'File saved successfully', array(
            'filename' => basename($full_path),
            'size' => filesize($full_path),
            'modified' => filemtime($full_path)
        ));
        break;
    
    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            json_response(false, 'Use POST for create action');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input)) {
            http_response_code(400);
            json_response(false, 'Invalid JSON input');
        }
        
        $filename = isset($input['filename']) ? $input['filename'] : '';
        $content = isset($input['content']) ? $input['content'] : '';
        $dir = isset($input['dir']) ? $input['dir'] : '';
        
        if (empty($filename)) {
            http_response_code(400);
            json_response(false, 'Missing filename parameter');
        }
        
        if (!validate_filename($filename)) {
            http_response_code(400);
            json_response(false, 'Invalid filename');
        }
        
        $full_dir = validate_file_path($dir);
        if (!$full_dir || !is_dir($full_dir)) {
            http_response_code(400);
            json_response(false, 'Invalid directory path');
        }
        
        $full_path = $full_dir . '/' . basename($filename);
        
        if (file_exists($full_path)) {
            http_response_code(409);
            json_response(false, 'File already exists');
        }
        
        if (@file_put_contents($full_path, $content) === false) {
            http_response_code(500);
            json_response(false, 'Cannot create file');
        }
        
        $rel_path = str_replace($FILES_ROOT, '', $full_path);
        
        json_response(true, 'File created successfully', array(
            'filename' => basename($full_path),
            'path' => $rel_path,
            'size' => filesize($full_path),
            'modified' => filemtime($full_path)
        ));
        break;
    
    case 'delete':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            json_response(false, 'Use POST for delete action');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input)) {
            http_response_code(400);
            json_response(false, 'Invalid JSON input');
        }
        
        $file = isset($input['file']) ? $input['file'] : '';
        $permanent = isset($input['permanent']) ? $input['permanent'] : false;
        
        if (empty($file)) {
            http_response_code(400);
            json_response(false, 'Missing file parameter');
        }
        
        $full_path = validate_file_path($file);
        if (!$full_path || (!is_file($full_path) && !is_dir($full_path))) {
            http_response_code(404);
            json_response(false, 'File or directory not found');
        }
        
        $basename = basename($full_path);
        $trash_dir = $GLOBALS['FILES_ROOT'] . '/.trash';
        $trash_path = $trash_dir . '/' . time() . '_' . $basename;
        
        // Move to trash instead of permanent delete (unless permanent=true)
        if (!$permanent && is_dir($trash_dir)) {
            if (@rename($full_path, $trash_path)) {
                json_response(true, 'Moved to trash', array(
                    'name' => $basename,
                    'trash_path' => str_replace($GLOBALS['FILES_ROOT'], '', $trash_path),
                    'recoverable' => true
                ));
            }
        }
        
        // Permanent deletion (fallback or if permanent=true)
        if (is_dir($full_path)) {
            function deleteDirectory($dir) {
                if (!is_dir($dir)) return false;
                $items = array_diff(scandir($dir), array('.', '..'));
                foreach ($items as $item) {
                    $path = $dir . '/' . $item;
                    if (is_dir($path)) {
                        deleteDirectory($path);
                    } else {
                        @unlink($path);
                    }
                }
                return @rmdir($dir);
            }
            
            if (!deleteDirectory($full_path)) {
                http_response_code(500);
                json_response(false, 'Cannot delete directory');
            }
            json_response(true, 'Directory permanently deleted', array('dirname' => $basename));
        }
        
        if (@unlink($full_path) === false) {
            http_response_code(500);
            json_response(false, 'Cannot delete file');
        }
        
        json_response(true, 'File permanently deleted', array('filename' => $basename));
        break;

    case 'rename':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            json_response(false, 'Use POST for rename action');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input)) {
            http_response_code(400);
            json_response(false, 'Invalid JSON input');
        }
        
        $old_path = isset($input['file']) ? $input['file'] : '';
        $new_name = isset($input['newname']) ? $input['newname'] : '';
        
        if (empty($old_path) || empty($new_name)) {
            http_response_code(400);
            json_response(false, 'Missing file or newname parameter');
        }
        
        if (!validate_filename($new_name)) {
            http_response_code(400);
            json_response(false, 'Invalid new filename');
        }
        
        $full_old_path = validate_file_path($old_path);
        if (!$full_old_path || (!is_file($full_old_path) && !is_dir($full_old_path))) {
            http_response_code(404);
            json_response(false, 'File or directory not found');
        }
        
        $parent_dir = dirname($full_old_path);
        $full_new_path = $parent_dir . '/' . basename($new_name);
        
        if (file_exists($full_new_path)) {
            http_response_code(409);
            json_response(false, 'A file with that name already exists');
        }
        
        if (@rename($full_old_path, $full_new_path) === false) {
            http_response_code(500);
            json_response(false, 'Cannot rename file');
        }
        
        $rel_path = str_replace($GLOBALS['FILES_ROOT'], '', $full_new_path);
        json_response(true, 'Renamed successfully', array(
            'oldname' => basename($full_old_path),
            'newname' => basename($full_new_path),
            'path' => $rel_path
        ));
        break;

    case 'trash_list':
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            json_response(false, 'Use GET for trash_list action');
        }
        
        $trash_dir = $GLOBALS['FILES_ROOT'] . '/.trash';
        if (!is_dir($trash_dir)) {
            json_response(true, 'Trash is empty', array('files' => array()));
        }
        
        $files = array();
        $items = @scandir($trash_dir);
        
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            
            $item_path = $trash_dir . '/' . $item;
            // Parse timestamp from filename (format: timestamp_originalname)
            $parts = explode('_', $item, 2);
            $deleted_time = isset($parts[0]) ? (int)$parts[0] : 0;
            $original_name = isset($parts[1]) ? $parts[1] : $item;
            
            $files[] = array(
                'name' => $original_name,
                'trash_name' => $item,
                'path' => '/.trash/' . $item,
                'type' => is_dir($item_path) ? 'dir' : 'file',
                'deleted_at' => $deleted_time,
                'deleted_date' => date('Y-m-d H:i:s', $deleted_time)
            );
        }
        
        // Sort by deletion time, newest first
        usort($files, function($a, $b) {
            return $b['deleted_at'] - $a['deleted_at'];
        });
        
        json_response(true, 'Trash contents', array('files' => $files));
        break;

    case 'restore':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            json_response(false, 'Use POST for restore action');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input)) {
            http_response_code(400);
            json_response(false, 'Invalid JSON input');
        }
        
        $trash_file = isset($input['file']) ? $input['file'] : '';
        if (empty($trash_file)) {
            http_response_code(400);
            json_response(false, 'Missing file parameter');
        }
        
        $trash_dir = $GLOBALS['FILES_ROOT'] . '/.trash';
        $full_trash_path = $trash_dir . '/' . basename($trash_file);
        
        if (!file_exists($full_trash_path)) {
            http_response_code(404);
            json_response(false, 'File not found in trash');
        }
        
        // Extract original name (remove timestamp prefix)
        $parts = explode('_', basename($trash_file), 2);
        $original_name = isset($parts[1]) ? $parts[1] : basename($trash_file);
        $restore_path = $GLOBALS['FILES_ROOT'] . '/' . $original_name;
        
        // If file exists at destination, add suffix
        if (file_exists($restore_path)) {
            $info = pathinfo($original_name);
            $base = $info['filename'];
            $ext = isset($info['extension']) ? '.' . $info['extension'] : '';
            $counter = 1;
            while (file_exists($restore_path)) {
                $restore_path = $GLOBALS['FILES_ROOT'] . '/' . $base . '_restored_' . $counter . $ext;
                $counter++;
            }
        }
        
        if (@rename($full_trash_path, $restore_path) === false) {
            http_response_code(500);
            json_response(false, 'Cannot restore file');
        }
        
        $rel_path = str_replace($GLOBALS['FILES_ROOT'], '', $restore_path);
        json_response(true, 'File restored', array(
            'name' => basename($restore_path),
            'path' => $rel_path
        ));
        break;

    case 'empty_trash':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            json_response(false, 'Use POST for empty_trash action');
        }
        
        $trash_dir = $GLOBALS['FILES_ROOT'] . '/.trash';
        if (!is_dir($trash_dir)) {
            json_response(true, 'Trash already empty');
        }
        
        function deleteDirectory($dir) {
            if (!is_dir($dir)) return false;
            $items = array_diff(scandir($dir), array('.', '..'));
            foreach ($items as $item) {
                $path = $dir . '/' . $item;
                if (is_dir($path)) {
                    deleteDirectory($path);
                } else {
                    @unlink($path);
                }
            }
            return true; // Don't delete the .trash folder itself
        }
        
        $items = array_diff(scandir($trash_dir), array('.', '..'));
        foreach ($items as $item) {
            $path = $trash_dir . '/' . $item;
            if (is_dir($path)) {
                deleteDirectory($path);
                @rmdir($path);
            } else {
                @unlink($path);
            }
        }
        
        json_response(true, 'Trash emptied');
        break;

    case 'mkdir':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            json_response(false, 'Use POST for mkdir action');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input)) {
            http_response_code(400);
            json_response(false, 'Invalid JSON input');
        }
        
        $dirname = isset($input['dirname']) ? $input['dirname'] : '';
        $parent = isset($input['parent']) ? $input['parent'] : '';
        
        if (empty($dirname)) {
            http_response_code(400);
            json_response(false, 'Missing dirname parameter');
        }
        
        if (!validate_filename($dirname)) {
            http_response_code(400);
            json_response(false, 'Invalid directory name');
        }
        
        $full_parent = validate_file_path($parent);
        if (!$full_parent || !is_dir($full_parent)) {
            http_response_code(400);
            json_response(false, 'Invalid parent directory path');
        }
        
        $full_path = $full_parent . '/' . basename($dirname);
        
        if (file_exists($full_path)) {
            http_response_code(409);
            json_response(false, 'Directory already exists');
        }
        
        if (@mkdir($full_path, 0755) === false) {
            http_response_code(500);
            json_response(false, 'Cannot create directory');
        }
        
        $rel_path = str_replace($FILES_ROOT, '', $full_path);
        
        json_response(true, 'Directory created successfully', array(
            'dirname' => basename($full_path),
            'path' => $rel_path
        ));
        break;
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            json_response(false, 'Use POST for delete action');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input)) {
            http_response_code(400);
            json_response(false, 'Invalid JSON input');
        }
        
        $file = isset($input['file']) ? $input['file'] : '';
        if (empty($file)) {
            http_response_code(400);
            json_response(false, 'Missing file parameter');
        }
        
        $full_path = validate_file_path($file);
        if (!$full_path || !is_file($full_path)) {
            http_response_code(404);
            json_response(false, 'File not found');
        }
        
        if (@unlink($full_path) === false) {
            http_response_code(500);
            json_response(false, 'Cannot delete file');
        }
        
        json_response(true, 'File deleted successfully', array('filename' => basename($full_path)));
        break;
    
    default:
        http_response_code(400);
        json_response(false, 'Invalid action. Supported: list, read, write, create, delete, mkdir, rename, trash_list, restore, empty_trash');
}
?>

