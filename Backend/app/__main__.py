# Uvicorn server entry point
import uvicorn
from app import app
import os

if __name__ == "__main__":
    # SSL configuration - try different common SSL paths
    ssl_paths = [
        ("/www/wwwroot/Skill_wallah_edtech/ssl.key", "/www/wwwroot/Skill_wallah_edtech/ssl.crt"),
        ("/etc/ssl/private/skillwallah.key", "/etc/ssl/certs/skillwallah.crt"),
        ("/opt/ssl/skillwallah.key", "/opt/ssl/skillwallah.crt"),
        ("/home/ssl/skillwallah.key", "/home/ssl/skillwallah.crt")
    ]
    
    ssl_keyfile = None
    ssl_certfile = None
    
    # Find existing SSL files
    for key_path, cert_path in ssl_paths:
        if os.path.exists(key_path) and os.path.exists(cert_path):
            ssl_keyfile = key_path
            ssl_certfile = cert_path
            break
    
    if ssl_keyfile and ssl_certfile:
        print(f"Starting server with SSL enabled using {ssl_keyfile} and {ssl_certfile}...")
        uvicorn.run(
            "app:app", 
            host="0.0.0.0", 
            port=4000, 
            ssl_keyfile=ssl_keyfile,
            ssl_certfile=ssl_certfile,
            reload=True
        )
    else:
        print("SSL files not found. Starting with HTTPS on port 443 (requires reverse proxy)...")
        uvicorn.run(
            "app:app", 
            host="0.0.0.0", 
            port=4000, 
            reload=True
        )