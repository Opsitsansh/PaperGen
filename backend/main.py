from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import shutil
import os
from rag_engine import process_documents 

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NEW: health check root route
@app.get("/")
def health_check():
    return {"status": "ok", "message": "PaperGen backend is running"}

@app.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...), 
    mode: str = Form(...),
    option: str = Form(...),
    language: str = Form("English"),
    custom_prompt: str = Form(None)
):
    saved_file_paths = []
    try:
        for file in files:
            file_location = f"temp_{file.filename}"
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_file_paths.append(file_location)

        ai_response = process_documents(saved_file_paths, mode, option, language, custom_prompt)
        return {"result": ai_response}
    except Exception as e:
        return {"result": f"Error: {str(e)}"}
    finally:
        for path in saved_file_paths:
            if os.path.exists(path):
                os.remove(path)
