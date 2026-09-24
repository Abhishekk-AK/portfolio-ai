import os
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq
from pypdf import PdfReader
from docx import Document
from fastapi import FastAPI

load_dotenv()

app=FastAPI()

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

def ask_portfolio_agent(user_prompt):
    system_message={
        "role":"system",
        "content":system_prompt
    }

    user_message={
        "role":"user",
        "content":user_prompt  
    }

    messages=[system_message,user_message]
    res=client.chat.completions.create(model=model,messages=messages)

    return res.choices[0].message.content