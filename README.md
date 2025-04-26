# ResearchNavigator
A full fledges Research tool to answer the most toughest questions by the power of structured LLM pipelines and logical control!!!

Check it out over here - [Research Navigator](https://researchnavigator.netlify.app/)

## How does it work?

It has 2 parts:

- A frontend website
- A backend server

The frontend website controls the user interaction which the backend server takes up all the load of processing the data and generating responses which are presented by the frontend system.

## Workflow

User query ➡️ LLM ➡️ Web Search ➡️ LLM ➡️ Summarized results

## Technologies used:

- Frontend:
    - NextJS framework

- Backend
    - Flask for API endpoints
    - LangChain for RAG chain
    - DuckDuckGo API for web search
    - BeautifulSoup4 for crawling websites
    - Gemma 27 B LLM for generating content
    - Chroma DB for vector database storage

## Project Walkthrough

1. Frontend

    Find all the frontend files in the director [frontend](/frontend/)

2. Backend Server

    Contained inside 1 single [app.py](/app.py) file

## Future plans:

1. Improve workflow structure

    User query ➡️ LLM ➡️ Web Search ➡️ LLM ➡️ Refined Web Search ➡️ LLM ➡️ Summarized results

2. Add recursive loop thinking capabilities

    ( LLM_1 🔄️ LLM_2 ) ➡️ Final refined 
    
3. Add analysis tools like parsing user documents (pdfs, ppts, etc), voice notes, media files and understanding context of conversation.

4. Extration of context of conversation

    LLM's made to thiink about the exact context of what is being talked about in a particular chat.