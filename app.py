from flask import Flask, render_template, request, jsonify, send_file
import json
import os
import sys
import tempfile
from pathlib import Path

app = Flask(__name__)

# Add ArchipelagoTTYDWebGenerator to Python path
GENERATOR_PATH = Path(__file__).parent / 'ArchipelagoTTYDWebGenerator'
sys.path.insert(0, str(GENERATOR_PATH))

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

@app.route('/test')
def test():
    return render_template('test.html')

@app.route('/index2')
def index2():
    return render_template('index2.html')

@app.route('/test-accessibility')
def test_accessibility():
    return render_template('test-accessibility.html')

@app.route('/result')
def result():
    return render_template('result.html')

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

        # Run generate.py as subprocess
        result = subprocess.run(
            cmd,
            cwd=str(GENERATOR_PATH),
            capture_output=True,
            text=True,
            timeout=300
        )

        # Debug: Log the result
        app.logger.info(f"Return code: {result.returncode}")
        app.logger.info(f"Stdout: {result.stdout}")
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

# Standard way to run the application locally for testing
if __name__ == '__main__':
    # Set debug=True for local development
    app.run(debug=True)