import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load your key
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ ERROR: No API Key found in .env file!")
else:
    print(f"✅ Found API Key: {api_key[:5]}...")
    
    # Configure Google
    genai.configure(api_key=api_key)

    print("\n🔍 Asking Google what models are available for you...")
    try:
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f" - {m.name}")
                available_models.append(m.name)
        
        if not available_models:
            print("\n⚠️ WARNING: Google connected, but returned 0 models. Check your API Key permissions.")
        else:
            print("\n✅ SUCCESS: Found available models!")
            
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR connecting to Google: {e}")