from flask import Blueprint, request, jsonify
from db_config import execute_query

users_bp = Blueprint('users', __name__)

@users_bp.route('/', methods=['GET'])
def index():
    """1. INDEX: List all users"""
    query = "SELECT id, name, email, role, created_at FROM users"
    results = execute_query(query)
    return jsonify(results if results else [])

@users_bp.route('/', methods=['POST'])
def store():
    """2. STORE: Create a new user"""
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'operator')
    
    if not all([name, email, password]):
        return jsonify({"error": "Missing required fields"}), 400
        
    query = "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)"
    execute_query(query, (name, email, password, role))
    return jsonify({"message": "User created successfully"}), 201

@users_bp.route('/<int:id>', methods=['GET'])
def show(id):
    """3. SHOW: Get one specific user"""
    query = "SELECT id, name, email, role, created_at FROM users WHERE id = %s"
    result = execute_query(query, (id,))
    return jsonify(result[0] if result else {"error": "User not found"}), 404 if not result else 200

@users_bp.route('/<int:id>', methods=['PUT'])
def update(id):
    """4. UPDATE: Update a user"""
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    role = data.get('role')
    
    query = "UPDATE users SET name = %s, email = %s, role = %s WHERE id = %s"
    execute_query(query, (name, email, role, id))
    return jsonify({"message": "User updated successfully"}), 200

@users_bp.route('/<int:id>', methods=['DELETE'])
def destroy(id):
    """5. DESTROY: Delete a user"""
    query = "DELETE FROM users WHERE id = %s"
    execute_query(query, (id,))
    return jsonify({"message": "User deleted successfully"}), 200
