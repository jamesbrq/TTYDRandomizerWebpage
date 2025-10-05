from flask import Flask, render_template, request, jsonify, send_file
import json
import os
import sys
import tempfile
import hashlib
import time
import gzip
import threading
from pathlib import Path
from datetime import datetime, timedelta

app = Flask(__name__)

# Add ArchipelagoTTYDWebGenerator to Python path
GENERATOR_PATH = Path(__file__).parent / 'ArchipelagoTTYDWebGenerator'
sys.path.insert(0, str(GENERATOR_PATH))

# Directory to store seed data
SEED_DATA_DIR = Path(__file__).parent / 'seed_data'
SEED_DATA_DIR.mkdir(exist_ok=True)

# Seed data retention period (60 days)
SEED_RETENTION_DAYS = 60

# File to track last cleanup time
LAST_CLEANUP_FILE = SEED_DATA_DIR / '.last_cleanup'

# File to track seed counter and last generation time
SEED_STATS_FILE = SEED_DATA_DIR / '.seed_stats.json'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate')
def generate():
    return render_template('generate.html')

@app.route('/getting-started')
def getting_started():
    return render_template('gettingStarted.html')

@app.route('/archipelago')
def archipelago():
    return render_template('archipelago.html')

@app.route('/patch')
def patch():
    return render_template('patch.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/result')
@app.route('/result/<seed_id>')
def result(seed_id=None):
    return render_template('result.html', seed_id=seed_id)

@app.route('/api/generate', methods=['POST'])
def api_generate():
    """API endpoint to generate randomized seed using Archipelago generator"""
    import subprocess
    import shutil

    try:
        settings = request.get_json()
        if not settings:
            return jsonify({'error': 'No settings provided'}), 400

        # Find the correct Python executable
        # Option 1: Use shutil.which to find 'python3'
        python_exec = shutil.which('python3') or shutil.which('python')

        # Option 2: If you know the exact path, hardcode it
        # python_exec = '/usr/bin/python3'

        if not python_exec:
            return jsonify({
                'success': False,
                'error': 'Could not find Python executable'
            }), 500

        # Define paths
        script_path = str(GENERATOR_PATH / 'generate.py')

        # Build command as a list
        cmd = [
            python_exec,
            script_path,
            '--skip_output',
            '--json_config',
            json.dumps(settings)
        ]

        # Add seed if provided
        if settings.get('seed'):
            cmd.extend(['--seed', str(settings['seed'])])

        # Debug: Log the command being executed
        app.logger.info(f"Executing command: {' '.join(cmd)}")
        app.logger.info(f"Python executable: {python_exec}")
        app.logger.info(f"sys.executable: {sys.executable}")

        # Run generate.py as subprocess with larger buffer
        result = subprocess.run(
            cmd,
            cwd=str(GENERATOR_PATH),
            capture_output=True,
            text=True,
            timeout=300,
            bufsize=-1  # Use system default buffering (usually larger)
        )

        # Debug: Log the result
        app.logger.info(f"Return code: {result.returncode}")
        app.logger.info(f"Stdout length: {len(result.stdout)} chars")
        app.logger.info(f"Stdout (last 500 chars): {result.stdout[-500:]}")
        app.logger.info(f"Stderr: {result.stderr}")

        if result.returncode != 0:
            return jsonify({
                'success': False,
                'error': 'Generation failed',
                'stderr': result.stderr,
                'stdout': result.stdout,
                'command': ' '.join(cmd)  # Include command in error for debugging
            }), 500

        # Parse JSON output from stdout
        try:
            output_data = json.loads(result.stdout)
            # Debug: log what we're returning
            app.logger.info(f"Output data keys: {list(output_data.keys())}")
            app.logger.info(f"Has required_chapters: {'required_chapters' in output_data}")
            if 'required_chapters' in output_data:
                app.logger.info(f"required_chapters value: {output_data['required_chapters']}")

            # Generate unique identifier based on seed + all settings
            seed_id = generate_seed_id(output_data.get('seed'), settings)

            # Run cleanup if needed (once per 24 hours)
            cleanup_if_needed()

            # Save seed data to disk
            save_seed_data(seed_id, output_data, settings)

            # Increment seed counter
            increment_seed_counter()

            # Add seed_id to response
            output_data['seed_id'] = seed_id
            app.logger.info(f"Generated seed_id: {seed_id}")

            return jsonify(output_data)
        except json.JSONDecodeError:
            return jsonify({
                'success': True,
                'stdout': result.stdout,
                'stderr': result.stderr
            })

    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Generation timed out after 5 minutes'
        }), 500
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

def generate_seed_id(seed_number, settings):
    """
    Generate a unique identifier based on seed number and all settings.
    This ensures the same seed with different settings gets a different ID.
    """
    # Create a deterministic string from seed + settings
    seed_str = str(seed_number) if seed_number else 'random'
    settings_str = json.dumps(settings, sort_keys=True)
    combined = f"{seed_str}:{settings_str}"

    # Generate SHA256 hash and take first 16 characters
    hash_obj = hashlib.sha256(combined.encode('utf-8'))
    seed_id = hash_obj.hexdigest()[:16]

    return seed_id

def save_seed_data(seed_id, output_data, settings):
    """
    Save seed data to disk with gzip compression for space efficiency.
    """
    seed_file = SEED_DATA_DIR / f"{seed_id}.json.gz"

    data_to_save = {
        'seed': output_data.get('seed'),
        'locations': output_data.get('locations', {}),
        'required_chapters': output_data.get('required_chapters', []),
        'settings': settings,
        'timestamp': output_data.get('timestamp') or int(time.time() * 1000)
    }

    # Compress and save
    json_str = json.dumps(data_to_save)
    json_bytes = json_str.encode('utf-8')

    with gzip.open(seed_file, 'wb', compresslevel=9) as f:
        f.write(json_bytes)

    # Log compression stats
    original_size = len(json_bytes)
    compressed_size = seed_file.stat().st_size
    ratio = (1 - compressed_size / original_size) * 100
    app.logger.info(f"Saved seed data to {seed_file} (compressed {original_size} -> {compressed_size} bytes, {ratio:.1f}% reduction)")

@app.route('/api/seed/<seed_id>', methods=['GET'])
def get_seed_data(seed_id):
    """
    Retrieve seed data by ID, supporting both compressed (.json.gz) and legacy (.json) formats.
    """
    # Try compressed format first
    seed_file_gz = SEED_DATA_DIR / f"{seed_id}.json.gz"
    seed_file_json = SEED_DATA_DIR / f"{seed_id}.json"

    if seed_file_gz.exists():
        try:
            with gzip.open(seed_file_gz, 'rb') as f:
                json_bytes = f.read()
                data = json.loads(json_bytes.decode('utf-8'))
            return jsonify(data)
        except Exception as e:
            app.logger.error(f"Error reading compressed seed file: {e}")
            return jsonify({'error': str(e)}), 500
    elif seed_file_json.exists():
        # Fallback to legacy uncompressed format
        try:
            with open(seed_file_json, 'r') as f:
                data = json.load(f)
            return jsonify(data)
        except Exception as e:
            app.logger.error(f"Error reading legacy seed file: {e}")
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Seed not found'}), 404

def cleanup_old_seeds():
    """
    Remove seed files older than SEED_RETENTION_DAYS.
    """
    try:
        cutoff_time = time.time() - (SEED_RETENTION_DAYS * 24 * 60 * 60)
        deleted_count = 0
        total_size_freed = 0

        for seed_file in SEED_DATA_DIR.glob('*.json*'):
            # Skip the cleanup tracker file
            if seed_file.name == '.last_cleanup':
                continue

            # Check file modification time
            if seed_file.stat().st_mtime < cutoff_time:
                file_size = seed_file.stat().st_size
                seed_file.unlink()
                deleted_count += 1
                total_size_freed += file_size
                app.logger.info(f"Deleted old seed file: {seed_file.name}")

        if deleted_count > 0:
            app.logger.info(f"Cleanup complete: Deleted {deleted_count} seed(s), freed {total_size_freed} bytes")
        else:
            app.logger.info("Cleanup complete: No old seeds to delete")

        # Update last cleanup timestamp
        with open(LAST_CLEANUP_FILE, 'w') as f:
            f.write(str(int(time.time())))

    except Exception as e:
        app.logger.error(f"Error during seed cleanup: {e}")

def cleanup_if_needed():
    """
    Run cleanup only if last cleanup was more than 24 hours ago.
    """
    try:
        # Check when last cleanup occurred
        if LAST_CLEANUP_FILE.exists():
            with open(LAST_CLEANUP_FILE, 'r') as f:
                last_cleanup = int(f.read().strip())
        else:
            # No cleanup has ever run
            last_cleanup = 0

        # Run cleanup if more than 24 hours since last cleanup
        current_time = int(time.time())
        if current_time - last_cleanup >= (24 * 60 * 60):
            app.logger.info("Running scheduled seed cleanup (24 hours elapsed)")
            cleanup_old_seeds()
        else:
            hours_remaining = ((24 * 60 * 60) - (current_time - last_cleanup)) / 3600
            app.logger.debug(f"Cleanup not needed yet ({hours_remaining:.1f} hours until next cleanup)")

    except Exception as e:
        app.logger.error(f"Error checking cleanup schedule: {e}")

def get_seed_stats():
    """
    Get the current seed statistics (count and last generation time).
    """
    try:
        if SEED_STATS_FILE.exists():
            with open(SEED_STATS_FILE, 'r') as f:
                return json.load(f)
        else:
            # Initialize with default values
            return {
                'total_seeds': 0,
                'last_generation': None
            }
    except Exception as e:
        app.logger.error(f"Error reading seed stats: {e}")
        return {
            'total_seeds': 0,
            'last_generation': None
        }

def increment_seed_counter():
    """
    Increment the seed counter and update last generation time.
    """
    try:
        stats = get_seed_stats()
        stats['total_seeds'] += 1
        stats['last_generation'] = int(time.time() * 1000)  # Milliseconds

        with open(SEED_STATS_FILE, 'w') as f:
            json.dump(stats, f)

        app.logger.info(f"Seed counter incremented to {stats['total_seeds']}")
        return stats
    except Exception as e:
        app.logger.error(f"Error incrementing seed counter: {e}")
        return None

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """
    API endpoint to get seed statistics.
    """
    stats = get_seed_stats()
    return jsonify(stats)

# Standard way to run the application locally for testing
if __name__ == '__main__':
    # Set debug=True for local development
    app.run(debug=True)