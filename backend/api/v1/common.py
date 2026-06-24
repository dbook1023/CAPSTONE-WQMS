from flask import jsonify


def api_success(data=None, message=None, status_code=200):
    payload = {
        'status': 'success'
    }
    if message is not None:
        payload['message'] = message
    if data is not None:
        payload['data'] = data
    return jsonify(payload), status_code


def api_error(message, status_code=400, **extra):
    payload = {
        'status': 'error',
        'message': message
    }
    if extra:
        payload.update(extra)
    return jsonify(payload), status_code