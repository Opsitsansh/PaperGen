import os
import base64
import mimetypes
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage
from pypdf import PdfReader
from dotenv import load_dotenv

load_dotenv()

# Gemini 2.0 Flash
llm = ChatGoogleGenerativeAI(model="models/gemini-2.0-flash")

# Cloud Embeddings (Lightweight)
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

def process_documents(file_paths, mode, option, language="English", custom_prompt=""):
    
    combined_text = ""
    image_parts = []
    
    for file_path in file_paths:
        mime_type, _ = mimetypes.guess_type(file_path)
        
        if mime_type and mime_type.startswith('image'):
            with open(file_path, "rb") as image_file:
                image_data = base64.b64encode(image_file.read()).decode('utf-8')
                image_parts.append({
                    "type": "image_url", 
                    "image_url": {"url": f"data:{mime_type};base64,{image_data}"}
                })
        else:
            try:
                reader = PdfReader(file_path)
                doc_text = ""
                for page in reader.pages:
                    doc_text += page.extract_text() or ""
                combined_text += f"\n\n--- DOCUMENT: {os.path.basename(file_path)} ---\n{doc_text}"
            except Exception:
                continue

    # --- MULTIMODAL MODE ---
    if image_parts:
        base_prompt = f"Analyze these files. Answer in {language}. Mode: {mode}. Option: {option}."
        if custom_prompt: base_prompt += f"\nUser Instructions: {custom_prompt}"
        if combined_text: base_prompt += f"\n\nContext:\n{combined_text[:100000]}"

        message_content = [{"type": "text", "text": base_prompt}] + image_parts
        response = llm.invoke([HumanMessage(content=message_content)])
        return response.content

    # --- TEXT MODE ---
    if mode == "Generate Notes":
        truncated_text = combined_text[:800000] 
        prompt_template = f"""
        You are an expert Academic Professor.
        TASK: Create comprehensive study notes.
        DIFFICULTY: {option}
        OUTPUT LANGUAGE: {language}
        INSTRUCTIONS:
        1. Use standard math (E_0, r^2).
        2. Use Markdown (## Heading, * Bullet).
        3. FLOWCHARTS: Use text arrows [A] -> [B].
        USER REQUEST: {custom_prompt}
        CONTENT:
        {truncated_text}
        """
        response = llm.invoke(prompt_template)
        return response.content

    else:
        if not combined_text.strip():
            return "Error: No text found in documents."

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=8000, chunk_overlap=500)
        chunks = text_splitter.split_text(combined_text)
        
        vector_store = FAISS.from_texts(chunks, embedding=embeddings)
        retriever = vector_store.as_retriever(search_kwargs={"k": 6}) 

        base_instruction = f"You are an AI Tutor. Mode: {mode}. Difficulty: {option}. Language: {language}."
        if custom_prompt: base_instruction += f"\nUSER REQUEST: {custom_prompt}"

        prompt = ChatPromptTemplate.from_messages([
            ("system", base_instruction + "\n\nCONTEXT:\n{context}"),
            ("human", "{input}"),
        ])

        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)

        user_input = custom_prompt if mode == "Chat" else f"Generate content for {mode}"
        response = rag_chain.invoke({"input": user_input})
        return response["answer"]