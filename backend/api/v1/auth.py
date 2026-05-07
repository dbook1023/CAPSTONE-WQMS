from flask import Blueprint, request, jsonify
from db_config import execute_query
import hashlib

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # In a real app, you would hash the password and compare it
    # For now, we'll do a simple check. We expect users table to exist.
    query = "SELECT id, name, email, role FROM users WHERE email = %s AND password = %s"
    user = execute_query(query, (email, password))
    
    if user and len(user) > 0:
        return jsonify({
            "message": "Login successful",
            "user": user[0]
        }), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({"message": "Successfully logged out"}), 200
