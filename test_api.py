#!/usr/bin/env python3
"""
PathoNet API Diagnostics Tool
Tests Flask server connectivity and configuration
"""

import sys
import json
import socket
import subprocess
import time
from urllib.request import urlopen, Request
from urllib.error import URLError

class APITester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url.rstrip('/')
        self.results = []
        
    def log(self, level, message):
        symbol = {
            "✓": "✓ ",
            "✗": "✗ ",
            "⏳": "⏳ ",
            "📋": "📋 ",
            "⚠": "⚠ ",
        }.get(level, "  ")
        print(f"{symbol}{message}")
        self.results.append((level, message))
    
    def test_port(self):
        """Test if port is listening"""
        self.log("📋", "Testing port connectivity...")
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            
            # Try localhost
            result = sock.connect_ex(('127.0.0.1', 5000))
            sock.close()
            
            if result == 0:
                self.log("✓", "Port 5000 is listening ✓")
                return True
            else:
                self.log("✗", "Port 5000 is NOT listening")
                self.log("⚠", "Flask server is not running")
                self.log("⚠", "Start it with: python run_api_server.py")
                return False
        except Exception as e:
            self.log("✗", f"Port check failed: {e}")
            return False
    
    def test_health(self):
        """Test /health endpoint"""
        self.log("📋", f"Testing {self.base_url}/health...")
        try:
            req = Request(f"{self.base_url}/health", method='GET')
            with urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                self.log("✓", "Health check passed ✓")
                self.log("  ", f"Status: {data.get('status')}")
                self.log("  ", f"Model: {data.get('model')}")
                self.log("  ", f"Classes: {data.get('classes')}")
                self.log("  ", f"Device: {data.get('device')}")
                return True
        except URLError as e:
            self.log("✗", f"Health check failed: {e.reason}")
            return False
        except Exception as e:
            self.log("✗", f"Health check error: {e}")
            return False
    
    def test_classes(self):
        """Test /classes endpoint"""
        self.log("📋", f"Testing {self.base_url}/classes...")
        try:
            req = Request(f"{self.base_url}/classes", method='GET')
            with urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                classes = data.get('classes', [])
                self.log("✓", f"Classes endpoint works ({len(classes)} classes)")
                for i, cls in enumerate(classes[:3]):
                    self.log("  ", f"{i+1}. {cls}")
                if len(classes) > 3:
                    self.log("  ", f"... and {len(classes)-3} more")
                return True
        except URLError as e:
            self.log("✗", f"Classes check failed: {e.reason}")
            return False
        except Exception as e:
            self.log("✗", f"Classes check error: {e}")
            return False
    
    def test_stats(self):
        """Test /stats endpoint"""
        self.log("📋", f"Testing {self.base_url}/stats...")
        try:
            req = Request(f"{self.base_url}/stats", method='GET')
            with urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                self.log("✓", "Stats endpoint works")
                self.log("  ", f"Avg inference: {data.get('avg_inference_ms', 'N/A')}ms")
                return True
        except URLError as e:
            self.log("✗", f"Stats check failed: {e.reason}")
            return False
        except Exception as e:
            self.log("✗", f"Stats check error: {e}")
            return False
    
    def test_cors(self):
        """Test CORS headers"""
        self.log("📋", "Testing CORS headers...")
        try:
            req = Request(f"{self.base_url}/health")
            req.add_header('Origin', 'http://localhost')
            with urlopen(req, timeout=5) as response:
                headers = dict(response.headers)
                cors_allowed = 'access-control-allow-origin' in headers
                if cors_allowed:
                    self.log("✓", f"CORS enabled: {headers.get('access-control-allow-origin')}")
                    return True
                else:
                    self.log("⚠", "CORS header not found (may be OK)")
                    return True
        except Exception as e:
            self.log("⚠", f"CORS check inconclusive: {e}")
            return True
    
    def test_network(self):
        """Test network reachability"""
        self.log("📋", "Testing network reachability...")
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            result = sock.connect_ex(('8.8.8.8', 53))
            sock.close()
            if result == 0:
                self.log("✓", "Device can reach external networks")
                return True
            else:
                self.log("⚠", "Cannot reach external networks (may be offline)")
                return False
        except Exception as e:
            self.log("⚠", f"Network test inconclusive: {e}")
            return False
    
    def run_all_tests(self):
        """Run all tests and print summary"""
        print("\n" + "="*70)
        print("  🧪 PathoNet API Diagnostics")
        print("="*70 + "\n")
        
        self.log("📋", f"Target: {self.base_url}\n")
        
        tests = [
            ("Port Connectivity", self.test_port),
            ("Health Endpoint", self.test_health),
            ("Classes Endpoint", self.test_classes),
            ("Stats Endpoint", self.test_stats),
            ("CORS Headers", self.test_cors),
            ("Network", self.test_network),
        ]
        
        passed = 0
        for name, test_func in tests:
            try:
                if test_func():
                    passed += 1
            except Exception as e:
                self.log("✗", f"Test '{name}' crashed: {e}")
            print()
        
        # Print summary
        print("="*70)
        print(f"  Summary: {passed}/{len(tests)} tests passed")
        print("="*70 + "\n")
        
        if passed == len(tests):
            print("✅ All systems operational! Your Flask server is ready.\n")
            return True
        elif passed >= len(tests) - 1:
            print("⚠️  Most tests passed. Check warnings above.\n")
            return True
        else:
            print("❌ Critical failures detected. See errors above.\n")
            self.print_fixes()
            return False
    
    def print_fixes(self):
        """Print common fixes"""
        print("🔧 Common fixes:\n")
        print("1. Flask not running:")
        print("   → python run_api_server.py\n")
        print("2. Port 5000 in use:")
        print("   → pkill -f 'plant_disease_cnn'\n")
        print("3. Dependencies missing:")
        print("   → pip install flask flask-cors torch torchvision\n")
        print("4. Firewall blocking port 5000:")
        print("   → Windows: Add python.exe to firewall exceptions")
        print("   → Linux: sudo ufw allow 5000\n")

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Test PathoNet API server")
    parser.add_argument('--url', default='http://localhost:5000', help='API base URL')
    args = parser.parse_args()
    
    tester = APITester(args.url)
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
