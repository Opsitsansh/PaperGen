from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import shutil
import os
from rag_engine import process_documents # Note the 's'

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...), # <--- LIST OF FILES
    mode: str = Form(...),
    option: str = Form(...),
    language: str = Form("English"),
    custom_prompt: str = Form(None)
):
    saved_file_paths = []
    
    # Save ALL files
    for file in files:
        file_location = f"temp_{file.filename}"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_file_paths.append(file_location)
    
    try:
        # Send LIST of paths to brain
        ai_response = process_documents(saved_file_paths, mode, option, language, custom_prompt)
        
        # Cleanup
        for path in saved_file_paths:
            if os.path.exists(path):
                os.remove(path)
                
        return {"result": ai_response}
    except Exception as e:
        # Cleanup on error
        for path in saved_file_paths:
            if os.path.exists(path):
                os.remove(path)
        return {"result": f"Error: {str(e)}"}