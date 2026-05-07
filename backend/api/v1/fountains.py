from flask import Blueprint, request, jsonify
from db_config import execute_query

fountains_bp = Blueprint('fountains', __name__)

@fountains_bp.route('/', methods=['GET'])
def index():
    """1. INDEX: List all fountains"""
    query = "SELECT * FROM fountains"
    results = execute_query(query)
    return jsonify(results if results else [])

@fountains_bp.route('/', methods=['POST'])
def store():
    """2. STORE: Create a new fountain"""
    data = request.get_json()
    name = data.get('name')
    location = data.get('location')
    status = data.get('status', 'Online')
    
    if not name or not location:
        return jsonify({"error": "Name and location are required"}), 400
        
    query = "INSERT INTO fountains (name, location, status) VALUES (%s, %s, %s)"
    execute_query(query, (name, location, status))
    return jsonify({"message": f"Fountain {name} added successfully"}), 201

@fountains_bp.route('/<int:id>', methods=['GET'])
def show(id):
    """3. SHOW: Get details for one fountain"""
    query = "SELECT * FROM fountains WHERE id = %s"
    result = execute_query(query, (id,))
    return jsonify(result[0] if result else {"error": "Fountain not found"}), 404 if not result else 200

@fountains_bp.route('/<int:id>', methods=['PUT'])
def update(id):
    """4. UPDATE: Update a fountain"""
    data = request.get_json()
    status = data.get('status')
    name = data.get('name')
    location = data.get('location')
    
    query = "UPDATE fountains SET name = %s, location = %s, status = %s WHERE id = %s"
    execute_query(query, (name, location, status, id))
    return jsonify({"message": "Fountain updated successfully"}), 200

@fountains_bp.route('/<int:id>', methods=['DELETE'])
def destroy(id):
    """5. DESTROY: Delete a fountain"""
    query = "DELETE FROM fountains WHERE id = %s"
    execute_query(query, (id,))
    return jsonify({"message": "Fountain deleted successfully"}), 200
