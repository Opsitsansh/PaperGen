import os
import base64
import mimetypes
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage
from pypdf import PdfReader
from dotenv import load_dotenv

load_dotenv()

llm = ChatGoogleGenerativeAI(model="models/gemini-2.0-flash")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# --- UPDATED TO ACCEPT A LIST OF FILE PATHS ---
def process_documents(file_paths, mode, option, language="English", custom_prompt=""):
    
    combined_text = ""
    image_parts = []
    
    # 1. Loop through ALL files
    for file_path in file_paths:
        mime_type, _ = mimetypes.guess_type(file_path)
        
        # If Image -> Add to image list
        if mime_type and mime_type.startswith('image'):
            with open(file_path, "rb") as image_file:
                image_data = base64.b64encode(image_file.read()).decode('utf-8')
                image_parts.append({
                    "type": "image_url", 
                    "image_url": {"url": f"data:{mime_type};base64,{image_data}"}
                })
                
        # If PDF -> Extract text and append to master string
        else:
            try:
                reader = PdfReader(file_path)
                doc_text = ""
                for page in reader.pages:
                    doc_text += page.extract_text() or ""
                combined_text += f"\n\n--- DOCUMENT: {os.path.basename(file_path)} ---\n{doc_text}"
            except Exception:
                continue # Skip bad files

    # --- IF WE HAVE IMAGES (Multimodal Mode) ---
    if image_parts:
        base_prompt = f"Analyze these provided files/images. Answer in {language}. \nMode: {mode}. \nOption: {option}."
        if custom_prompt: base_prompt += f"\nUser Instructions: {custom_prompt}"
        
        # Add text context if any exists
        if combined_text:
            base_prompt += f"\n\nAdditional Text Context:\n{combined_text[:100000]}"

        message_content = [{"type": "text", "text": base_prompt}] + image_parts
        response = llm.invoke([HumanMessage(content=message_content)])
        return response.content

    # --- TEXT ONLY MODE (Standard) ---
    
    # MODE 1: LONG CONTEXT (Notes)
    if mode == "Generate Notes":
        # Increased limit for multiple files (approx 300 pages)
        truncated_text = combined_text[:800000] 
        
        prompt_template = f"""
        You are an expert Academic Professor.
        TASK: Create comprehensive study notes combining ALL uploaded documents.
        DIFFICULTY: {option}
        OUTPUT LANGUAGE: {language}
        
        INSTRUCTIONS:
        1. Integrate information from all sources.
        2. Use standard math (E_0, r^2).
        3. Use Markdown (## Heading, * Bullet).
        4. FLOWCHARTS: Use text arrows [A] -> [B] for processes.
        
        USER REQUEST: {custom_prompt}
        
        CONTENT:
        {truncated_text}
        """
        response = llm.invoke(prompt_template)
        return response.content

    # MODE 2: RAG (MCQ / Exam / Chat)
    else:
        if not combined_text.strip():
            return "Error: No text found in documents."

        # Split the MASSIVE combined text
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=8000, chunk_overlap=500)
        chunks = text_splitter.split_text(combined_text)
        
        vector_store = FAISS.from_texts(chunks, embedding=embeddings)
        retriever = vector_store.as_retriever(search_kwargs={"k": 6}) 

        base_instruction = ""
        if mode == "Generate MCQs":
            base_instruction = f"Create {option}-level MCQs in {language} from the combined text. Include Answer Key."
        elif mode == "Generate Exam Paper":
            base_instruction = f"Create a Subjective Exam Paper ({option} Level) in {language} covering all documents."
        elif mode == "Chat":
            base_instruction = f"You are an AI Tutor answering in {language}. Base answers on the provided documents."

        user_input = f"Generate content in {language}."
        if mode == "Chat": user_input = custom_prompt 
        elif custom_prompt: base_instruction += f"\nUSER REQUEST: {custom_prompt}"

        prompt = ChatPromptTemplate.from_messages([
            ("system", base_instruction + "\n\nCONTEXT:\n{context}"),
            ("human", "{input}"),
        ])

        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)

        response = rag_chain.invoke({"input": user_input, "option": option})
        return response["answer"]