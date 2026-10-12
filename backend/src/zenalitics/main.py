import uvicorn
from fastapi import FastAPI

from zenalitics.routers import api_v1

app = FastAPI()
app.include_router(api_v1)


def main():
    uvicorn.run("zenalitics.main:app", port=8888)


if __name__ == "__main__":
    main()
