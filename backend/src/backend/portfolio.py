import os
from dotenv import load_dotenv
from groq import Groq
from pypdf import PdfReader
from docx import Document
from pathlib import Path

load_dotenv()

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
    resume_text=read_file(file_path)

print("************************* \n", resume_text, "\n ************************")

candidate_details=f"""
    Candidate Details={resume_text}
"""

system_prompt=f"""
    You are my Portfolio agent.

    You have to give answers about me according to:
    my-details={candidate_details}
    All the answers you give should be completely correct.
    Do do make-up or guess any answer.
    
"""

system_message={
    "role":"system",
    "content":system_prompt
}

user_message="""
    What is candidates name and age and skills.
    Is he suitable for java developer, python dev, backend engineer, web-dev, system artitect
"""

user_message={
    "role":"user",
    "content":user_message   
}

messages=[system_message,user_message]
res=client.chat.completions.create(model=model,messages=messages)
print(res.choices[0].message.content)