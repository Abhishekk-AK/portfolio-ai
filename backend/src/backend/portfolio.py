import os
from pathlib import Path

import uuid
from dotenv import load_dotenv
from groq import Groq
from pypdf import PdfReader
from docx import Document
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message":"Portfolio AI Backend is running."}


my_api_key=os.getenv("GROQ_API_KEY")
if not my_api_key:
    raise ValueError("Api key not found.")

client=Groq(api_key=my_api_key)
model="openai/gpt-oss-120b"

def read_pdf(file_path):
    reader=PdfReader(file_path)
    text=""
    for page in reader.pages:
        page_text=page.extract_text()
        if page_text:
            text += page_text+"\n"
    return text

def read_doc(file_path):
    doc=Document(file_path)
    text=""
    for para in doc.paragraphs:
        if para.text.strip():
            text += para.text+"\n"

    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text.strip():
                    text += cell.text+"\n"
    return text

def read_file(file_path):
    if file_path.suffix.lower()==".pdf":
        return read_pdf(file_path)
    elif file_path.suffix.lower()==".docx":
        return read_doc(file_path)
    else:
        return None


resume_folder=Path("resumes")
resume_text=""

for file_path in resume_folder.iterdir():
    if file_path.suffix.lower() not in [".pdf", ".docx"]:
        continue

    print("\nProcessing: ",file_path.name)

    file_text=read_file(file_path)

    if file_text:
        resume_text+=file_text+"\n"

# print("************************* \n", resume_text, "\n ************************")

candidate_details=f"""
    Candidate Details:
    {resume_text}
"""

system_prompt=f"""
    You are my Portfolio agent.

    You answer questions about me using only the candidate
    information provided below.

    Candidate information:
    {candidate_details}

    Rules:
    - Give completely correct answers.
    - Do not make up information.
    - Do not guess information that is not present.
    - If the information is not available, clearly say that it is not available.
    - When evaluating a job, compare the job requirements against the candidate's actual skills and experience.

"""

def ask_portfolio_agent(user_prompt, document_text=""):

    current_system_prompt=system_prompt

    if document_text:
        current_system_prompt += f"""
        The user has uploaded the following document.
        Use it when answering the user's questions.

        Uploaded document:
        {document_text}
        """
    system_message={
        "role":"system",
        "content":current_system_prompt
    }

    user_message={
        "role":"user",
        "content":user_prompt  
    }

    messages=[system_message,user_message]
    res=client.chat.completions.create(model=model,messages=messages)

    return res.choices[0].message.content



# chat request from fastAPI
class ChatRequest(BaseModel):
    message:str
    document_id:str | None=None

uploaded_documents={}

@app.post("/chat")
def chat(request:ChatRequest):
    document_text=""

    if request.document_id:
        document_text=uploaded_documents.get(
            request.document_id,
            ""
        )

    response=ask_portfolio_agent(
        request.message,
        document_text
    )

    return {
        "response":response
    }

# upload file api
@app.post("/upload")
async def upload_file(file: UploadFile=File(...)):
    file_extension=Path(file.filename).suffix.lower()

    if file_extension not in [".pdf", ".docx"]:
        return {
            "error":"Only PDF and Docs files are supported."
        }

    temp_file=Path("temp")/file.filename
    temp_file.parent.mkdir(exist_ok=True)

    contents=await file.read()

    with open(temp_file,"wb") as f:
        f.write(contents) 

    extracted_text=read_file(temp_file)

    temp_file.unlink()

    document_id=str(uuid.uuid4())
    uploaded_documents[document_id]=extracted_text

    return {
        "filename":file.filename,
        "document_id":document_id,
    }